'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import moment from 'moment-timezone';
import { useSession } from 'next-auth/react';
import type { CurrentAvailabilitySlot, ProductListItemResponse, ProductListVariant } from '@opencals/storefront-sdk';
import { fetcher } from '@/lib/fetcher';
import { computeAddOnLineTotal } from '@/lib/format';
import { formatLabel, formatLength, playersOn, priceFor, sportOf, todayIn, toSlot, unitsFor, type Catalogue, type Club, type Court } from '@/lib/club';
import { useCart } from '@/contexts/cart-context';
import { useSettings } from '@/contexts/settings-context';
import { useBookingAddOns } from '@/hooks/use-booking-add-ons';
import { useCheckoutQuestions } from '@/hooks/use-checkout-questions';
import { usePaymentProviders } from '@/hooks/use-payment-providers';
import { useGameCheckout, type BookPayload } from '@/hooks/use-game-checkout';
import { saveSnapshot } from '@/lib/game-snapshot';
import { sportFromTitle, type Game } from '@/lib/game';

export type GameStep = 'court' | 'crew' | 'kit' | 'session' | 'details' | 'payment';

/** What the player picked before the flow: a court at a start (hall map / grid), or a training product. */
export type GamePick =
	| {
			kind: 'court';
			clubId: string;
			courtId: string;
			/** UTC epoch minute */
			start: number;
			minutes: number;
			/** Other courts free at that start, so "any court" can fall back */
			alternatives: string[];
			/** Picked on the map or grid: book exactly this court */
			exactCourt: boolean;
	  }
	| { kind: 'training'; group: ProductListItemResponse; variantId: string | null; clubId: string | null };

/** A crew member: first name, plus an optional email to send the invite to. */
export interface CrewMember {
	name: string;
	email: string;
}

export interface CourtChoice {
	court: Court;
	price: number;
}

const STEPS: Record<GamePick['kind'], GameStep[]> = {
	court: ['court', 'crew', 'kit', 'details', 'payment'],
	training: ['session', 'kit', 'details', 'payment'],
};

const SLOT_FORMATS = ['YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm'];
export const slotIso = (s: Pick<CurrentAvailabilitySlot, 'fromDate' | 'fromTime'>) => moment.utc(`${s.fromDate} ${s.fromTime}`, SLOT_FORMATS).toISOString();
const slotEndIso = (s: Pick<CurrentAvailabilitySlot, 'toDate' | 'toTime'>) => moment.utc(`${s.toDate} ${s.toTime}`, SLOT_FORMATS).toISOString();
const validEmail = (v: string) => /.+@.+\..+/.test(v.trim());

/**
 * State for booking one game: what (a court or a training place), when, who's playing, the kit, details and
 * payment. Nothing is held until details are submitted (`reserve`).
 */
export function useGameBooking(cat: Catalogue, pick: GamePick) {
	const { data: session } = useSession();
	const { currency } = useSettings();
	const { timeRemaining, cart } = useCart();
	const kind = pick.kind;
	const steps = STEPS[kind];
	const [step, setStep] = useState<GameStep>(steps[0]!);

	// ── Courts: which court ──
	const choices: CourtChoice[] = useMemo(() => {
		if (pick.kind !== 'court') return [];
		const ids = [pick.courtId, ...pick.alternatives.filter((id) => id !== pick.courtId)];
		return ids
			.map((id) => cat.courts.find((c) => c.id === id))
			.filter((c): c is Court => !!c)
			.map((court) => ({ court, price: priceFor(court, pick.minutes) }))
			.sort(
				(a, b) =>
					Number(a.court.format === 'singles') - Number(b.court.format === 'singles') || a.price - b.price || a.court.number - b.court.number,
			);
	}, [pick, cat.courts]);
	/** null = "any court" (the best free one, falling back to the next) */
	const [courtId, setCourtId] = useState<string | null>(pick.kind === 'court' && pick.exactCourt ? pick.courtId : null);
	const chosen: CourtChoice | null = pick.kind === 'court' ? (choices.find((c) => c.court.id === courtId) ?? choices[0] ?? null) : null;

	// ── Trainings: which level, club, coach, day and time ──
	const group = pick.kind === 'training' ? pick.group : null;
	const variants: ProductListVariant[] = useMemo(() => (group?.variants ?? []).filter((v) => v.status !== 'inactive'), [group]);
	const [variantId, setVariantIdState] = useState<string | null>(pick.kind === 'training' ? (pick.variantId ?? variants[0]?.id ?? null) : null);
	const variant = variants.find((v) => v.id === variantId) ?? variants[0] ?? null;
	const trainingClubs: Club[] = useMemo(() => {
		const ids = new Set((variant?.locations ?? []).map((l) => l.id));
		return cat.clubs.filter((c) => ids.has(c.id));
	}, [variant, cat.clubs]);
	const [trainingClubId, setTrainingClubId] = useState<string | null>(pick.kind === 'training' ? pick.clubId : null);
	const trainingClub = trainingClubs.find((c) => c.id === trainingClubId) ?? trainingClubs[0] ?? null;
	const coaches = useMemo(
		() => (variant?.staffMembers ?? []).filter((s) => !trainingClub || !s.locations?.length || s.locations.some((l) => l.id === trainingClub.id)),
		[variant, trainingClub],
	);
	const [coachId, setCoachId] = useState<string | null>(null);

	const club: Club | null = pick.kind === 'court' ? (cat.clubs.find((c) => c.id === pick.clubId) ?? null) : trainingClub;
	const tz = club?.tz ?? 'UTC';
	const today = useMemo(() => todayIn(tz), [tz]);
	const [date, setDateState] = useState(() =>
		pick.kind === 'court' ? moment.utc(pick.start * 60000).tz(tz).format('YYYY-MM-DD') : today,
	);
	const [slot, setSlot] = useState<CurrentAvailabilitySlot | null>(null);
	const [places, setPlaces] = useState(1);

	const setVariantId = useCallback((id: string) => {
		setVariantIdState(id);
		setSlot(null);
		setCoachId(null);
	}, []);
	const setDate = useCallback((d: string) => {
		setDateState(d);
		setSlot(null);
	}, []);
	const chooseClub = useCallback((id: string) => {
		setTrainingClubId(id);
		setSlot(null);
		setCoachId(null);
	}, []);
	const chooseCoach = useCallback((id: string | null) => {
		setCoachId(id);
		setSlot(null);
	}, []);

	const slotsKey = useMemo(() => {
		if (kind !== 'training' || !variant) return null;
		const p = new URLSearchParams({ productId: variant.id, date, timezone: tz });
		if (trainingClub) p.set('locationId', trainingClub.id);
		if (coachId) p.set('staffMemberId', coachId);
		return `/api/availability?${p}`;
	}, [kind, variant, date, tz, trainingClub, coachId]);
	const { data: slotData, isLoading: slotsLoading, error: slotsError } = useSWR<CurrentAvailabilitySlot[]>(slotsKey, fetcher, { revalidateOnFocus: false });
	const sessionSlots = useMemo(
		() => (slotData ?? []).filter((s) => s.maxAttendees - s.attendees > 0 && Date.parse(slotIso(s)) > Date.now()),
		[slotData],
	);
	const spaces = slot ? Math.max(1, slot.maxAttendees - slot.attendees) : 1;
	useEffect(() => {
		if (places > spaces) setPlaces(spaces);
	}, [places, spaces]);

	// ── When (both kinds) ──
	const startIso = pick.kind === 'court' ? new Date(pick.start * 60000).toISOString() : slot ? slotIso(slot) : null;
	const minutes = pick.kind === 'court' ? pick.minutes : variant ? Math.round(variant.duration / 60) : 60;
	const endIso = pick.kind === 'court' ? new Date((pick.start + pick.minutes) * 60000).toISOString() : slot ? slotEndIso(slot) : null;

	// ── Who (courts) ──
	const [crew, setCrew] = useState<CrewMember[]>([]);
	const onCourt = chosen ? playersOn(chosen.court) : places;

	// ── Kit ──
	const slug = chosen?.court.slug ?? variant?.slug ?? null;
	const units = chosen ? unitsFor(chosen.court, minutes) : 1;
	const addOnVariant = useMemo(() => (slug ? ({ slug } as ProductListVariant) : null), [slug]);
	const staffForAddOns = pick.kind === 'training' ? (slot?.staffMemberIds?.[0] ?? coachId) : null;
	const addOns = useBookingAddOns({ activeVariant: addOnVariant, locationId: club?.id ?? null, staffMemberId: staffForAddOns, bookedDurationUnits: units });
	const kitList = useMemo(
		() =>
			Array.from(addOns.selectedAddOns.entries())
				.map(([id, quantity]) => {
					const addOn = addOns.availableAddOns.find((a) => a.id === id);
					return addOn ? { addOn, quantity, title: addOn.title ?? addOn.slug, total: computeAddOnLineTotal(addOn, quantity, units) } : null;
				})
				.filter((x): x is NonNullable<typeof x> => !!x),
		[addOns.selectedAddOns, addOns.availableAddOns, units],
	);

	// ── Details ──
	const [email, setEmail] = useState('');
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [customerId, setCustomerId] = useState<string | null>(null);
	const [answers, setAnswers] = useState<Record<string, string>>({});
	const prefilled = useRef(false);
	useEffect(() => {
		const c = session?.customer;
		if (!c || prefilled.current) return;
		prefilled.current = true;
		if (c.id) setCustomerId(c.id);
		if (c.email) setEmail(c.email);
		if (c.firstName) setFirstName(c.firstName);
		if (c.lastName) setLastName(c.lastName);
	}, [session]);
	const questions = useCheckoutQuestions(slug);

	// ── Money ──
	const gamePrice = chosen ? chosen.price : (variant?.price ?? 0) * places;
	const estimate = Math.round((gamePrice + kitList.reduce((s, x) => s + x.total, 0)) * 100) / 100;
	const checkout = useGameCheckout(customerId);
	const providers = usePaymentProviders(checkout.committedCartId);
	const committed = checkout.committedCartId !== null && step === 'payment';
	/** The held cart's total once the court is held (the backend's word on price), else our estimate. */
	const total = checkout.committedCartId && cart?.id === checkout.committedCartId && typeof cart.total === 'number' ? cart.total : estimate;
	/** Each player's share of the court for a full four (or two for singles). */
	const each = chosen ? gamePrice / onCourt : null;

	const next = useCallback(() => setStep((s) => steps[Math.min(steps.length - 1, steps.indexOf(s) + 1)]!), [steps]);

	const requiredMissing = questions.some((q) => q.required && !answers[q.id]?.trim());
	const detailsValid = validEmail(email) && !requiredMissing;
	const [reserving, setReserving] = useState(false);
	/** Set when "any court" landed on a different court than the one shown (the first had just gone). */
	const [movedTo, setMovedTo] = useState<string | null>(null);

	const snapshotGame = useCallback(
		(court: Court | null, from: string, to: string): Game => {
			const named = crew.filter((c) => c.name.trim());
			const coach = pick.kind === 'training' ? (coaches.find((s) => s.id === (slot?.staffMemberIds?.[0] ?? coachId)) ?? null) : null;
			return {
				id: 'snapshot',
				ref: '',
				status: 'scheduled',
				from,
				to,
				minutes,
				custom: !!court,
				kind: court ? 'court' : 'training',
				sport: court?.sport ?? sportFromTitle(variant?.title ?? ''),
				title: court ? `Court ${court.number}` : (variant?.title ?? ''),
				detail: court
					? [sportOf(court.sport).label, formatLabel(court), formatLength(minutes)].filter(Boolean).join(' · ')
					: [variant?.variantTitle && variant.variantTitle !== variant.title ? variant.variantTitle : null, formatLength(minutes)].filter(Boolean).join(' · '),
				courtNumber: court?.number ?? null,
				format: court?.format ?? null,
				clubId: club?.id ?? null,
				clubSlug: club?.slug ?? null,
				clubTitle: club?.title ?? '',
				clubImage: club?.image ?? null,
				address: club?.address ?? '',
				hours: club?.hours ?? null,
				phone: club?.phone ?? null,
				lat: club?.lat ?? null,
				lng: club?.lng ?? null,
				seats: court ? 1 : places,
				crew: named.map((c) => c.name.trim()),
				invited: named.filter((c) => validEmail(c.email)).map((c) => c.email.trim()),
				coach: coach ? [coach.firstName, coach.lastName].filter(Boolean).join(' ') : null,
				extras: kitList.map((x) => ({ title: x.title, quantity: x.quantity })),
				extrasKnown: true,
				productId: court?.id ?? variant?.id ?? '',
				locationId: club?.id ?? null,
				staffMemberId: slot?.staffMemberIds?.[0] ?? coachId,
				cancelGap: variant?.cancelGap ?? 0,
				rescheduleGap: variant?.rescheduleGap ?? 0,
				allowCancel: true,
				allowReschedule: true,
			};
		},
		[crew, pick.kind, coaches, slot, coachId, minutes, variant, club, places, kitList],
	);

	const reserve = useCallback(async () => {
		if (!startIso) return;
		setReserving(true);
		setMovedTo(null);
		const customer: BookPayload['customer'] = customerId
			? { kind: 'existing', customerId }
			: { kind: 'new', email: email.trim(), firstName: firstName.trim() || undefined, lastName: lastName.trim() || undefined };
		const checkoutQuestionAnswers = questions
			.filter((q) => answers[q.id]?.trim())
			.map((q) => ({ questionId: q.id, question: q.translations?.[0]?.title ?? q.internalName, answer: answers[q.id]!.trim() }));
		const named = crew.filter((c) => c.name.trim());
		const base = {
			addOns: kitList.map((x) => (x.addOn.durationMultiplied ? { addOnId: x.addOn.id } : { addOnId: x.addOn.id, quantity: x.quantity })),
			customer,
			checkoutQuestionAnswers,
			customAttributes: (named.length ? { crew: named.map((c) => c.name.trim()).join(', ') } : {}) as Record<string, string>,
			guests: named.filter((c) => validEmail(c.email)).map((c) => ({ email: c.email.trim() })),
		};
		try {
			if (pick.kind === 'court') {
				// "Any court": try the best, then the next, so a court taken since the hall loaded doesn't stop the game.
				const tries = courtId ? choices.filter((c) => c.court.id === courtId) : choices;
				let landed: CourtChoice | null = null;
				for (let i = 0; i < tries.length && !landed; i++) {
					const s = toSlot(tries[i]!.court, pick.start, pick.minutes);
					const id = await checkout.book(
						{ ...base, slot: { productId: s.productId, fromDate: s.fromDate, fromTime: s.fromTime, toDate: s.toDate, toTime: s.toTime, locationId: pick.clubId, staffMemberId: null }, numberOfAttendees: 1 },
						i < tries.length - 1,
					);
					if (id) {
						landed = tries[i]!;
						if (i > 0) {
							setCourtId(landed.court.id);
							setMovedTo(`Court ${landed.court.number}`);
						}
					}
				}
				if (landed) {
					setStep('payment');
					saveSnapshot({ at: Date.now(), orderId: null, game: snapshotGame(landed.court, startIso, endIso!), me: firstName.trim() || null, email: email.trim() || null, total: estimate, currency: currency ?? 'EUR', payAtVenue: false });
				}
			} else if (slot && variant) {
				const id = await checkout.book({
					...base,
					slot: {
						productId: variant.id,
						fromDate: slot.fromDate,
						fromTime: slot.fromTime,
						toDate: slot.toDate,
						toTime: slot.toTime,
						locationId: trainingClub?.id ?? slot.locationIds?.[0] ?? null,
						staffMemberId: slot.staffMemberIds?.[0] ?? coachId,
					},
					numberOfAttendees: places,
				});
				if (id) {
					setStep('payment');
					saveSnapshot({ at: Date.now(), orderId: null, game: snapshotGame(null, startIso, endIso!), me: firstName.trim() || null, email: email.trim() || null, total: estimate, currency: currency ?? 'EUR', payAtVenue: false });
				}
			}
		} finally {
			setReserving(false);
		}
	}, [startIso, endIso, customerId, email, firstName, lastName, questions, answers, crew, kitList, pick, courtId, choices, checkout, snapshotGame, estimate, currency, slot, variant, trainingClub, coachId, places]);

	return {
		kind,
		steps,
		step,
		setStep,
		next,
		club,
		tz,
		today,
		currency,
		// courts
		choices,
		courtId,
		setCourtId,
		chosen,
		crew,
		setCrew,
		onCourt,
		each,
		// trainings
		group,
		variants,
		variant,
		setVariantId,
		trainingClubs,
		chooseClub,
		coaches,
		coachId,
		chooseCoach,
		date,
		setDate,
		sessionSlots,
		slotsLoading: !!slotsKey && slotsLoading,
		slotsError: !!slotsError,
		slot,
		setSlot,
		spaces,
		places,
		setPlaces,
		// when
		startIso,
		endIso,
		minutes,
		// kit
		addOns,
		units,
		kitList,
		// details
		email,
		setEmail,
		firstName,
		setFirstName,
		lastName,
		setLastName,
		customerId,
		questions,
		answers,
		setAnswers,
		detailsValid,
		// money + checkout
		gamePrice,
		estimate,
		total,
		reserve,
		reserving,
		movedTo,
		checkout,
		providers,
		committed,
		timeRemaining,
	};
}

export type GameBooking = ReturnType<typeof useGameBooking>;
