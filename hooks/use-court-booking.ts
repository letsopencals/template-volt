'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import type { CheckoutStartResponse, CurrentAvailabilitySlot } from '@opencals/storefront-sdk';
import type { CourtGridCourt } from '@/app/api/courts/[collection]/route';
import type { CourtStep } from '@/lib/booking-constants';
import { useCart } from '@/contexts/cart-context';
import { useDateFormatter } from '@/hooks/use-date-formatter';
import { useBookingAddOns } from '@/hooks/use-booking-add-ons';
import { useCheckoutQuestions } from '@/hooks/use-checkout-questions';
import { usePaymentProviders } from '@/hooks/use-payment-providers';

export interface CourtSelection {
	court: CourtGridCourt;
	slot: CurrentAvailabilitySlot;
	units: number;
	locationId: string | null;
}

/**
 * Court-rental booking flow. Unlike the training flow there is no staff and no
 * variant switching — the selected court product *is* the resource, and the slot
 * already spans the chosen duration. Steps: extras → questions → details → payment.
 * Reuses the shared add-ons / questions / payment sub-hooks.
 */
export function useCourtBooking(selection: CourtSelection | null) {
	const router = useRouter();
	const { data: session } = useSession();
	const { cartId, setCart, clearCart, timeRemaining } = useCart();
	const { timezone } = useDateFormatter();

	const [step, setStep] = useState<CourtStep>('extras');
	const [email, setEmail] = useState('');
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [customerId, setCustomerId] = useState<string | null>(null);
	const prefilledRef = useRef(false);

	const [answers, setAnswers] = useState<Record<string, string>>({});
	const [provider, setProvider] = useState<string | null>(null);
	const [paymentData, setPaymentData] = useState<CheckoutStartResponse | null>(null);

	const [committed, setCommitted] = useState(false);
	const [committedCartId, setCommittedCartId] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

	const courtSlug = selection?.court.slug ?? null;
	const units = selection?.units ?? 1;
	const isExpired = timeRemaining !== null && timeRemaining <= 0;

	useEffect(() => {
		if (session?.customer && !prefilledRef.current) {
			if (session.customer.id) setCustomerId(session.customer.id);
			if (session.customer.email) setEmail(session.customer.email);
			if (session.customer.firstName) setFirstName(session.customer.firstName);
			if (session.customer.lastName) setLastName(session.customer.lastName);
			prefilledRef.current = true;
		}
	}, [session]);

	// Add-ons load against a minimal variant-like shape (slug + location) — the shared
	// hook only reads `slug` for the key and multiplies duration-based add-ons by units.
	const addOnVariant = useMemo(
		() => (selection ? ({ slug: selection.court.slug } as never) : null),
		[selection],
	);
	const addOns = useBookingAddOns({
		activeVariant: addOnVariant,
		locationId: selection?.locationId ?? null,
		staffMemberId: null,
		bookedDurationUnits: units,
	});

	const questions = useCheckoutQuestions(courtSlug);
	const providers = usePaymentProviders(committedCartId ?? cartId);

	const cartHeaders = useCallback(
		(id?: string | null): Record<string, string> => {
			const h: Record<string, string> = { 'Content-Type': 'application/json' };
			const useId = id ?? committedCartId ?? cartId;
			if (useId) h['X-Cart-Id'] = useId;
			return h;
		},
		[cartId, committedCartId],
	);

	// Reset the flow whenever the selection changes.
	useEffect(() => {
		setStep('extras');
		setCommitted(false);
		setCommittedCartId(null);
		setProvider(null);
		setPaymentData(null);
		setAnswers({});
		addOns.resetSelection();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selection?.court.id, selection?.slot.fromTime, selection?.units]);

	const extrasSkipped = !addOns.addOnsLoading && addOns.availableAddOns.length === 0;
	const stepAfterExtras: CourtStep = questions.length > 0 ? 'questions' : 'details';

	useEffect(() => {
		if (step === 'extras' && extrasSkipped) setStep(stepAfterExtras);
	}, [step, extrasSkipped, stepAfterExtras]);

	const handleContinueFromExtras = useCallback(() => setStep(stepAfterExtras), [stepAfterExtras]);
	const handleContinueFromQuestions = useCallback(() => setStep('details'), []);

	const customerPayload = useMemo(() => {
		if (customerId) return { kind: 'existing' as const, customerId };
		return { kind: 'new' as const, email, firstName: firstName || undefined, lastName: lastName || undefined };
	}, [customerId, email, firstName, lastName]);

	const handleSubmitDetails = useCallback(async () => {
		if (!selection) return;
		setSubmitting(true);
		setError(null);
		setFieldErrors({});
		try {
			const { slot } = selection;
			const answerArray = Object.entries(answers)
				.filter(([, v]) => v != null && v !== '')
				.map(([questionId, value]) => {
					const q = questions.find((x) => x.id === questionId);
					const title = q?.translations?.[0]?.title ?? q?.internalName ?? '';
					return { questionId, question: title, answer: value };
				});

			const res = await fetch('/api/book', {
				method: 'POST',
				headers: cartHeaders(),
				body: JSON.stringify({
					slot: {
						productId: selection.court.id,
						fromDate: slot.fromDate,
						fromTime: slot.fromTime,
						toDate: slot.toDate,
						toTime: slot.toTime,
						staffMemberId: null,
						locationId: selection.locationId ?? slot.locationIds?.[0] ?? null,
					},
					numberOfAttendees: 1,
					addOns: Array.from(addOns.selectedAddOns.entries()).map(([addOnId, quantity]) => {
						const addOn = addOns.availableAddOns.find((a) => a.id === addOnId);
						return addOn?.durationMultiplied ? { addOnId } : { addOnId, quantity };
					}),
					customer: customerPayload,
					checkoutQuestionAnswers: answerArray,
				}),
			});

			if (!res.ok) {
				const data = await res.json().catch(() => null);
				if (data?.errors) setFieldErrors(data.errors);
				throw new Error(data?.error || 'Could not reserve this court');
			}

			const data = await res.json();
			if (data.cart) {
				setCart(data.cart);
				setCommittedCartId(data.cart.id ?? null);
			}
			setCommitted(true);
			setStep('payment');
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Could not reserve this court');
		} finally {
			setSubmitting(false);
		}
	}, [selection, answers, questions, cartHeaders, addOns, customerPayload, setCart]);

	const handleSubmitCheckout = useCallback(
		async (stripePaymentIntentId?: string) => {
			setSubmitting(true);
			setError(null);
			try {
				const res = await fetch('/api/checkout/submit', {
					method: 'POST',
					headers: cartHeaders(),
					body: JSON.stringify({
						appointmentsSettings: { markAsScheduled: true },
						...(stripePaymentIntentId ? { stripePaymentIntentId } : {}),
					}),
				});
				if (!res.ok) {
					const data = await res.json().catch(() => null);
					throw new Error(data?.error || 'Checkout failed');
				}
				const data = await res.json();
				if (data.auth?.accessToken) {
					await signIn('checkout-token', {
						accessToken: data.auth.accessToken,
						refreshToken: data.auth.refreshToken,
						customerId: data.customer?.id ?? '',
						customerEmail: data.customer?.email ?? email,
						customerFirstName: data.customer?.firstName ?? firstName,
						customerLastName: data.customer?.lastName ?? lastName,
						redirect: false,
					});
				}
				clearCart();
				router.push(`/thank-you?orderId=${data.order?.id ?? ''}`);
			} catch (err: unknown) {
				setError(err instanceof Error ? err.message : 'Checkout failed');
				setSubmitting(false);
			}
		},
		[cartHeaders, email, firstName, lastName, clearCart, router],
	);

	const handleSelectProvider = useCallback(
		async (providerName: string) => {
			setProvider(providerName);
			setError(null);
			setSubmitting(true);
			try {
				const startPayload: Record<string, unknown> = { provider: providerName };
				if (customerId) startPayload.customer = { kind: 'existing', customerId };
				const res = await fetch('/api/checkout/start', {
					method: 'POST',
					headers: cartHeaders(),
					body: JSON.stringify(startPayload),
				});
				if (!res.ok) {
					const data = await res.json().catch(() => null);
					throw new Error(data?.error || 'Could not start checkout');
				}
				const data: CheckoutStartResponse = await res.json();
				setPaymentData(data);
				if (providerName === 'cash' || (data.provider as string) === 'no_payment_required') {
					await handleSubmitCheckout();
					return;
				}
				if (data.redirectUrl) {
					window.location.href = data.redirectUrl;
					return;
				}
			} catch (err: unknown) {
				setError(err instanceof Error ? err.message : 'Could not start checkout');
				setProvider(null);
			} finally {
				setSubmitting(false);
			}
		},
		[cartHeaders, customerId, handleSubmitCheckout],
	);

	const questionsValid = questions.every((q) => {
		if (!q.required) return true;
		const v = answers[q.id];
		if (q.type === 'checkbox') return v === 'true';
		return v != null && v.trim().length > 0;
	});

	return {
		step,
		setStep,
		// add-ons
		availableAddOns: addOns.availableAddOns,
		addOnsLoading: addOns.addOnsLoading,
		selectedAddOns: addOns.selectedAddOns,
		addOnsTotal: addOns.addOnsTotal,
		updateAddOnQuantity: addOns.updateQuantity,
		extrasSkipped,
		handleContinueFromExtras,
		bookedDurationUnits: units,
		// questions
		questions,
		questionsSkipped: questions.length === 0,
		questionsValid,
		answers,
		setAnswers,
		handleContinueFromQuestions,
		// details
		email,
		setEmail,
		firstName,
		setFirstName,
		lastName,
		setLastName,
		customerId,
		detailsValid: email.trim().length > 0,
		handleSubmitDetails,
		// payment
		providers,
		provider,
		paymentData,
		handleSelectProvider,
		handleSubmitCheckout,
		// flow state
		committed,
		submitting,
		isExpired,
		error,
		setError,
		fieldErrors,
		timezone,
	};
}
