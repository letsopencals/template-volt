'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { mutate } from 'swr';
import type { CheckoutResponse as SdkCheckoutResponse, CheckoutStartResponse, CustomerProviderCatalogItem } from '@opencals/storefront-sdk';
import { useCart } from '@/contexts/cart-context';
import { patchSnapshot, type PaymentInstructions } from '@/lib/game-snapshot';
import type { PendingReason } from '@/lib/game';

/** Submit's response; `paymentInstructions` comes with manual payment methods (SDK 0.3.20+). */
type CheckoutResponse = SdkCheckoutResponse & { paymentInstructions?: PaymentInstructions };

/**
 * Hold + pay for a game, in the order the Storefront API expects:
 *   /api/book (the court or training place into a cart)
 *   → /api/checkout/start (provider) → /api/checkout/submit → /thank-you.
 * Offline methods (pay at the club, bank transfer, invoice, nothing to pay) start + submit together on confirm. Nothing is held while the player is
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

interface ApiFailure {
	status: number;
	message: string;
	fields: Record<string, string[]>;
	/** The API's reason, e.g. CART_EXPIRED, CHECKOUT_IN_PROGRESS, PAYMENT_NOT_AUTHORIZED */
	code: string | null;
	/** CART_ALREADY_CHECKED_OUT: the order the cart already became */
	orderId: string | null;
}

async function readError(res: Response, fallback: string): Promise<ApiFailure> {
	const data = await res.json().catch(() => null);
	return {
		status: res.status,
		message: data?.error || fallback,
		fields: data?.errors ?? {},
		code: typeof data?.code === 'string' ? data.code : null,
		orderId: typeof data?.orderId === 'string' ? data.orderId : null,
	};
}

/** A failed checkout call, with what the API said so the flow can react to it. */
class CheckoutError extends Error {
	constructor(readonly failure: ApiFailure) {
		super(failure.message);
	}
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The player-facing line for a checkout failure. */
function checkoutMessage(err: unknown, fallback: string): string {
	if (!(err instanceof CheckoutError)) return err instanceof Error ? err.message : fallback;
	const { code, status, message } = err.failure;
	if (code === 'CART_EXPIRED') return 'Your hold ran out and someone took the time meanwhile. Go back and pick another time or court.';
	if (code === 'CHECKOUT_IN_PROGRESS') return 'We’re still placing this booking. Give it a moment, then try again.';
	if (code === 'PAYMENT_NOT_AUTHORIZED' || status === 402) return 'Your card wasn’t authorised and nothing was charged. Try again or use another card.';
	return message;
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

	/** The cart's hold is gone: drop it so the player can go back and pick another time. */
	const dropExpiredHold = useCallback(() => {
		clearCart();
		setCommittedCartId(null);
		setPaymentData(null);
		setProvider(null);
		revalidateClubAvailability();
	}, [clearCart]);

	/** Places the order. A submit racing another one (CHECKOUT_IN_PROGRESS) is retried a few times. */
	const placeOrder = useCallback(
		async (stripePaymentIntentId?: string): Promise<CheckoutResponse> => {
			for (let attempt = 0; ; attempt++) {
				const res = await fetch('/api/checkout/submit', {
					method: 'POST',
					headers: headers(),
					body: JSON.stringify({
						appointmentsSettings: { markAsScheduled: true },
						...(stripePaymentIntentId ? { stripePaymentIntentId } : {}),
					}),
				});
				if (res.ok) return res.json();
				const failure = await readError(res, 'Payment failed');
				if (failure.code === 'CHECKOUT_IN_PROGRESS' && attempt < 3) {
					await wait(1500 * (attempt + 1));
					continue;
				}
				throw new CheckoutError(failure);
			}
		},
		[headers],
	);

	const finish = useCallback(
		async (data: CheckoutResponse, providerName: string | null) => {
			const appointments = (data.order?.lineItems ?? []).map((li) => li.appointment).filter(Boolean) as { status: string; pendingReason?: PendingReason | null }[];
			const waiting = appointments.find((a) => a.status === 'pending' && a.pendingReason);
			patchSnapshot({
				orderId: data.order?.id ?? null,
				ref: data.order?.name ?? '',
				provider: data.paymentInstructions?.provider ?? providerName,
				paymentInstructions: data.paymentInstructions ?? null,
				status: waiting ? 'pending' : 'scheduled',
				pendingReason: waiting?.pendingReason ?? null,
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
			setSubmitting(false);
			router.push(`/thank-you?orderId=${data.order?.id ?? ''}`);
		},
		[clearCart, router],
	);

	/** Turns a failed checkout into the right next step: an expired hold is dropped, everything else is shown. */
	const fail = useCallback(
		(err: unknown, fallback: string) => {
			if (err instanceof CheckoutError && err.failure.code === 'CART_EXPIRED') dropExpiredHold();
			setError(checkoutMessage(err, fallback));
			setSubmitting(false);
		},
		[dropExpiredHold],
	);

	const submit = useCallback(
		async (stripePaymentIntentId?: string, providerName: string | null = provider) => {
			setSubmitting(true);
			setError(null);
			try {
				await finish(await placeOrder(stripePaymentIntentId), providerName);
			} catch (err) {
				fail(err, 'Payment failed');
			}
		},
		[placeOrder, finish, fail, provider],
	);

	/**
	 * Starts checkout with a provider. A cart that already became an order (CART_ALREADY_CHECKED_OUT: a second tab,
	 * a retried click) goes straight to that order instead: submitting the same cart returns it.
	 */
	const start = useCallback(
		async (providerName: string): Promise<CheckoutStartResponse | null> => {
			const res = await fetch('/api/checkout/start', {
				method: 'POST',
				headers: headers(),
				body: JSON.stringify({ provider: providerName, ...(customerId ? { customer: { kind: 'existing', customerId } } : {}) }),
			});
			if (!res.ok) {
				const failure = await readError(res, 'Could not start checkout');
				if (failure.code !== 'CART_ALREADY_CHECKED_OUT') throw new CheckoutError(failure);
				try {
					await finish(await placeOrder(), providerName);
				} catch {
					clearCart();
					router.push(failure.orderId ? `/thank-you?orderId=${failure.orderId}` : '/account');
				}
				return null;
			}
			const data: CheckoutStartResponse = await res.json();
			setPaymentData(data);
			return data;
		},
		[headers, customerId, finish, placeOrder, clearCart, router],
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
				if (!data) return;
				if ((data.provider as string) === 'no_payment_required') {
					await submit(undefined, data.provider);
					return;
				}
				if (data.redirectUrl) window.location.href = data.redirectUrl;
			} catch (err) {
				fail(err, 'Could not start checkout');
				setProvider(null);
			} finally {
				setSubmitting(false);
			}
		},
		[start, submit, fail],
	);

	const confirmOffline = useCallback(async () => {
		if (!provider) return;
		setError(null);
		setSubmitting(true);
		try {
			const data = await start(provider);
			if (!data) return;
			// Manual (cash, bank transfer, invoice) and no-payment checkouts are placed straight after start.
			await submit(undefined, data.provider ?? provider);
		} catch (err) {
			fail(err, 'Could not confirm the booking');
		}
	}, [provider, start, submit, fail]);

	return { committedCartId, provider, paymentData, submitting, error, setError, fieldErrors, book, submit, selectProvider, confirmOffline };
}
