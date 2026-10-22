'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { mutate } from 'swr';
import type { CheckoutStartResponse, CustomerProviderCatalogItem } from '@opencals/storefront-sdk';
import { useCart } from '@/contexts/cart-context';
import { patchSnapshot } from '@/lib/game-snapshot';

/**
 * Hold + pay for a game, in the order the Storefront API expects:
 *   /api/book (the court or training place into a cart)
 *   → /api/checkout/start (provider) → /api/checkout/submit → /thank-you.
 * Offline methods (pay at the club) start + submit together on confirm. Nothing is held while the player is
 * still choosing; the court is held at book().
 */
export interface BookPayload {
	slot: {
		productId: string;
		fromDate: string;
		fromTime: string;
		toDate: string;
		toTime: string;
		locationId: string | null;
		staffMemberId: string | null;
	};
	numberOfAttendees: number;
	addOns: { addOnId: string; quantity?: number }[];
	customer: { kind: 'existing'; customerId: string } | { kind: 'new'; email: string; firstName?: string; lastName?: string };
	checkoutQuestionAnswers: { questionId: string; question: string; answer: string }[];
	customAttributes: Record<string, string>;
	/** Crew emails, invited as guests (they get the booking emails; capacity is unaffected) */
	guests?: { email: string }[];
}

async function readError(res: Response, fallback: string): Promise<{ message: string; fields: Record<string, string[]> }> {
	const data = await res.json().catch(() => null);
	return { message: data?.error || fallback, fields: data?.errors ?? {} };
}

/** Drop every club's availability in this tab after a booking change, so the hall and grid re-read. */
export function revalidateClubAvailability() {
	void mutate((key) => typeof key === 'string' && key.startsWith('/api/clubs/'));
}

export function useGameCheckout(customerId: string | null) {
	const router = useRouter();
	const { cartId, setCart, clearCart } = useCart();
	const [committedCartId, setCommittedCartId] = useState<string | null>(null);
	const [provider, setProvider] = useState<string | null>(null);
	const [paymentData, setPaymentData] = useState<CheckoutStartResponse | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

	const headersFor = useCallback(
		(id: string | null): Record<string, string> => ({ 'Content-Type': 'application/json', ...(id ? { 'X-Cart-Id': id } : {}) }),
		[],
	);
	const headers = useCallback(() => headersFor(committedCartId ?? cartId), [headersFor, committedCartId, cartId]);

	/**
	 * Holds the court (or place): creates the appointment in the cart. `quiet` keeps a failure out of the error
	 * state (the caller is about to try another court). Returns the cart id, or null.
	 */
	const book = useCallback(
		async (payload: BookPayload, quiet = false): Promise<string | null> => {
			setError(null);
			setFieldErrors({});
			const res = await fetch('/api/book', {
				method: 'POST',
				headers: headersFor(committedCartId ?? cartId),
				body: JSON.stringify(payload),
			});
			if (!res.ok) {
				const { message, fields } = await readError(res, 'That time was just taken. Pick another one.');
				const taken = /maximum attendees|not available|already booked|no longer available/i.test(message);
				if (taken) revalidateClubAvailability();
				if (!quiet) {
					setFieldErrors(fields);
					setError(taken ? 'Someone just booked this at that time. Go back and pick another time or court.' : message);
				}
				return null;
			}
			const data = await res.json();
			revalidateClubAvailability();
			const id: string | null = data.cart?.id ?? null;
			if (data.cart) {
				setCart(data.cart);
				setCommittedCartId(id);
			}
			return id;
		},
		[headersFor, committedCartId, cartId, setCart],
	);

	const submit = useCallback(
		async (stripePaymentIntentId?: string) => {
			setSubmitting(true);
			setError(null);
			try {
				const res = await fetch('/api/checkout/submit', {
					method: 'POST',
					headers: headers(),
					body: JSON.stringify({
						appointmentsSettings: { markAsScheduled: true },
						...(stripePaymentIntentId ? { stripePaymentIntentId } : {}),
					}),
				});
				if (!res.ok) throw new Error((await readError(res, 'Payment failed')).message);
				const data = await res.json();
				patchSnapshot({
					orderId: data.order?.id ?? null,
					ref: data.order?.name ?? '',
					payAtVenue: provider === 'cash',
					...(typeof data.order?.total === 'number' ? { total: data.order.total } : {}),
				});
				if (data.auth?.accessToken) {
					await signIn('checkout-token', {
						accessToken: data.auth.accessToken,
						refreshToken: data.auth.refreshToken,
						redirect: false,
					});
				}
				clearCart();
				router.push(`/thank-you?orderId=${data.order?.id ?? ''}`);
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Payment failed');
				setSubmitting(false);
			}
		},
		[headers, clearCart, router, provider],
	);

	const start = useCallback(
		async (providerName: string): Promise<CheckoutStartResponse> => {
			const res = await fetch('/api/checkout/start', {
				method: 'POST',
				headers: headers(),
				body: JSON.stringify({ provider: providerName, ...(customerId ? { customer: { kind: 'existing', customerId } } : {}) }),
			});
			if (!res.ok) throw new Error((await readError(res, 'Could not start checkout')).message);
			const data: CheckoutStartResponse = await res.json();
			setPaymentData(data);
			return data;
		},
		[headers, customerId],
	);

	/**
	 * Picks a payment method. Card and hosted methods start checkout straight away so the form can mount; offline
	 * methods (pay at the club, nothing to pay) only select, and the player confirms with `confirmOffline()`.
	 */
	const selectProvider = useCallback(
		async (p: CustomerProviderCatalogItem) => {
			setProvider(p.name);
			setError(null);
			if (p.checkoutMode === 'manual' || p.checkoutMode === 'none') {
				setPaymentData(null);
				return;
			}
			setSubmitting(true);
			try {
				const data = await start(p.name);
				if ((data.provider as string) === 'no_payment_required') {
					await submit();
					return;
				}
				if (data.redirectUrl) window.location.href = data.redirectUrl;
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Could not start checkout');
				setProvider(null);
			} finally {
				setSubmitting(false);
			}
		},
		[start, submit],
	);

	const confirmOffline = useCallback(async () => {
		if (!provider) return;
		setError(null);
		setSubmitting(true);
		try {
			await start(provider);
			await submit();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Could not confirm the booking');
			setSubmitting(false);
		}
	}, [provider, start, submit]);

	return { committedCartId, provider, paymentData, submitting, error, setError, fieldErrors, book, submit, selectProvider, confirmOffline };
}
