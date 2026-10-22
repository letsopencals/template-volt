'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { clsx } from 'clsx';
import { formatPrice } from '@/lib/format';
import { at, formatLabel, formatLength, playersOn, sportOf, type Catalogue } from '@/lib/club';
import { useGameBooking, type GameBooking, type GamePick, type GameStep } from '@/hooks/use-game-booking';
import { StepSection } from '@/components/game/step-section';
import { CourtGlyph, ErrorNote, Label, Monogram } from '@/components/game/bits';
import { CourtStep } from '@/components/game/flow/court-step';
import { CrewStep } from '@/components/game/flow/crew-step';
import { KitStep } from '@/components/game/flow/kit-step';
import { SessionStep } from '@/components/game/flow/session-step';
import { DetailsStep } from '@/components/game/flow/details-step';

// Stripe stays out of the initial bundle.
const PaymentStep = dynamic(() => import('@/components/game/flow/payment-step').then((m) => m.PaymentStep), { ssr: false });

const TITLES: Record<GameStep, string> = {
	court: 'Your court',
	crew: 'Your crew',
	kit: 'Kit',
	session: 'Your session',
	details: 'Your details',
	payment: 'Payment',
};

const isoMin = (iso: string) => Date.parse(iso) / 60000;

/**
 * Booking one game: numbered steps on the left (an accordion), the match card on the right (stacked above on
 * phones). Courts: court → crew → kit → details → payment. Trainings: session → kit → details → payment.
 */
export function GameFlow({ cat, pick, backLabel, onBack }: { cat: Catalogue; pick: GamePick; backLabel: string; onBack: () => void }) {
	const { status } = useSession();
	const b = useGameBooking(cat, pick);
	const at_ = b.steps.indexOf(b.step);
	const edit = (s: GameStep) => (b.committed ? undefined : () => b.setStep(s));
	const expired = b.committed && b.timeRemaining !== null && b.timeRemaining <= 0;
	const named = b.crew.filter((c) => c.name.trim()).map((c) => c.name.trim());
	const tz = b.tz;

	const summaries: Record<GameStep, string | null> = {
		court: b.chosen && (b.courtId || b.choices.length === 1) ? `Court ${b.chosen.court.number}` : `Any court · ${b.choices.length} free`,
		crew: named.length ? `You, ${named.join(', ')}` : 'Just you for now',
		kit: b.kitList.length ? b.kitList.map((x) => `${x.title} × ${x.quantity}`).join(' · ') : 'Own kit',
		session: b.startIso ? `${b.variant?.variantTitle || b.variant?.title} · ${at(isoMin(b.startIso), tz, 'ddd D MMM, HH:mm')}` : null,
		details: b.email || null,
		payment: null,
	};

	return (
		<div className="min-h-screen bg-[var(--color-bg)] px-3 pb-24 pt-28 sm:px-6 lg:px-10 lg:pt-32">
			<div className="mx-auto max-w-[1400px]">
				<button
					type="button"
					onClick={onBack}
					disabled={b.committed}
					className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-primary)] disabled:opacity-40"
				>
					<span aria-hidden>←</span> {backLabel}
				</button>

				<div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-8">
					<div className="order-2 space-y-3 lg:order-1">
						{b.steps.map((s, i) => (
							<StepSection key={s} index={i + 1} title={TITLES[s]} summary={i < at_ ? summaries[s] : null} active={b.step === s} done={i < at_} onEdit={edit(s)}>
								<StepBody s={s} b={b} signedIn={status === 'authenticated'} expired={expired} />
							</StepSection>
						))}
					</div>
					<div className="order-1 lg:order-2">
						<MatchCard b={b} />
					</div>
				</div>
			</div>
		</div>
	);
}

function StepBody({ s, b, signedIn, expired }: { s: GameStep; b: GameBooking; signedIn: boolean; expired: boolean }) {
	if (s === 'court') return <CourtStep b={b} />;
	if (s === 'crew') return <CrewStep b={b} />;
	if (s === 'kit') return <KitStep b={b} />;
	if (s === 'session') return <SessionStep b={b} />;
	if (s === 'details') return <DetailsStep b={b} signedIn={signedIn} />;
	return (
		<div className="space-y-4">
			{b.movedTo ? <ErrorNote>The court we showed was taken a moment ago, so you’re on {b.movedTo}. Same time, same price.</ErrorNote> : null}
			{b.checkout.error ? <ErrorNote>{b.checkout.error}</ErrorNote> : null}
			<PaymentStep
				providers={b.providers}
				provider={b.checkout.provider}
				paymentData={b.checkout.paymentData}
				submitting={b.checkout.submitting}
				isExpired={expired}
				total={b.total}
				currency={b.currency}
				dateLabel={b.startIso ? at(isoMin(b.startIso), b.tz, 'dddd D MMMM') : null}
				club={b.club?.title ?? 'the club'}
				onSelectProvider={b.checkout.selectProvider}
				onConfirmOffline={b.checkout.confirmOffline}
				onStripeSuccess={(id) => void b.checkout.submit(id)}
				onStripeError={(m) => b.checkout.setError(m)}
			/>
		</div>
	);
}

/** The match card: what you're booking, as the ticket will read, with the running total and the hold timer. */
function MatchCard({ b }: { b: GameBooking }) {
	const mins = b.timeRemaining !== null ? Math.max(0, Math.ceil(b.timeRemaining / 60)) : null;
	const court = b.chosen?.court ?? null;
	const named = b.crew.filter((c) => c.name.trim());
	const tz = b.tz;
	const headline = court ? (b.courtId || b.choices.length === 1 ? `Court ${court.number}` : 'Any court') : (b.variant?.title ?? 'Training');
	const sport = court ? sportOf(court.sport).label : (b.variant?.variantTitle ?? 'Training');

	return (
		<aside className="lg:sticky lg:top-28">
			<div className="overflow-hidden rounded-[24px] border border-[var(--color-line)] bg-[var(--color-surface)]">
				<div className="relative overflow-hidden px-5 pb-5 pt-4">
					{b.club ? (
						<Image src={`/images/${b.club.image}`} alt="" fill sizes="384px" className="object-cover opacity-25" />
					) : null}
					<span className="absolute inset-0 bg-gradient-to-b from-black/40 to-[var(--color-surface)]" />
					<div className="relative">
						<div className="flex items-center justify-between">
							<Label className="text-white/60">{b.club?.title ?? ''}</Label>
							<Label className="text-[var(--color-primary)]">{sport}</Label>
						</div>
						{court ? <CourtGlyph lit singles={court.format === 'singles'} squash={court.sport === 'squash'} className="mt-4 h-20 w-full" /> : null}
						<p className="heading-display mt-4 text-2xl text-white">{headline}</p>
						{court ? <p className="mt-1 text-xs text-white/60">{[formatLabel(court), `${playersOn(court)} players`].filter(Boolean).join(' · ')}</p> : null}
						{!court && b.variant?.variantTitle && b.variant.variantTitle !== b.variant.title ? <p className="mt-1 text-xs text-white/60">{b.variant.variantTitle}</p> : null}
					</div>
				</div>

				<dl className="grid grid-cols-2 border-y border-[var(--color-line)] text-sm">
					<Cell label="Day">{b.startIso ? at(isoMin(b.startIso), tz, 'ddd D MMM') : '—'}</Cell>
					<Cell label="Time" last>
						{b.startIso && b.endIso ? `${at(isoMin(b.startIso), tz, 'HH:mm')}–${at(isoMin(b.endIso), tz, 'HH:mm')}` : '—'}
					</Cell>
					<Cell label="Length">{formatLength(b.minutes)}</Cell>
					<Cell label={court ? 'On court' : 'Places'} last>
						{court ? `${1 + named.length} of ${b.onCourt}` : b.places}
					</Cell>
				</dl>

				{court ? (
					<div className="flex items-center gap-1.5 border-b border-[var(--color-line)] px-5 py-3">
						<Monogram name={b.firstName || 'You'} size="sm" tone="orange" />
						{Array.from({ length: b.onCourt - 1 }, (_, i) =>
							named[i] ? (
								<Monogram key={i} name={named[i]!.name} size="sm" />
							) : (
								<span key={i} className="h-8 w-8 rounded-full border border-dashed border-[var(--color-line-strong)]" />
							),
						)}
						<span className="ml-auto text-xs text-[var(--color-ink-dim)]">{b.each !== null ? `${formatPrice(b.each, b.currency)} each` : ''}</span>
					</div>
				) : null}

				<div className="space-y-1.5 px-5 py-4 text-sm text-[var(--color-ink-muted)]">
					<Line label={court ? `Court, ${formatLength(b.minutes)}` : `${b.variant?.title ?? 'Session'}${b.places > 1 ? ` × ${b.places}` : ''}`} amount={b.gamePrice} currency={b.currency} />
					{b.kitList.map((x) => (
						<Line key={x.addOn.id} label={`${x.title}${x.quantity > 1 ? ` × ${x.quantity}` : ''}`} amount={x.total} currency={b.currency} />
					))}
				</div>
				<div className="flex items-end justify-between border-t border-[var(--color-line)] px-5 py-4">
					<Label className="text-[var(--color-ink-dim)]">Total</Label>
					<span className="heading-display text-3xl tabular-nums text-[var(--color-primary)]">{formatPrice(b.total, b.currency)}</span>
				</div>
				<p
					className={clsx(
						'border-t border-[var(--color-line)] px-5 py-3 text-xs',
						b.committed && mins !== null && mins <= 2 ? 'bg-red-500/10 text-red-300' : b.committed ? 'bg-[var(--color-tint)] text-[var(--color-ink)]' : 'text-[var(--color-ink-dim)]',
					)}
				>
					{b.committed
						? mins === null
							? 'We’re holding it while you confirm'
							: mins > 0
								? `Held for you for ${mins} more ${mins === 1 ? 'minute' : 'minutes'}`
								: 'The hold has expired'
						: `${b.club?.address ?? ''}${b.club?.address ? '. ' : ''}Nothing is held until you add your details.`}
				</p>
			</div>
		</aside>
	);
}

function Cell({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
	return (
		<div className={clsx('border-t border-[var(--color-line)] px-5 py-3 [&:nth-child(-n+2)]:border-t-0', !last && 'border-r border-r-[var(--color-line)]')}>
			<dt>
				<Label className="text-[var(--color-ink-dim)]">{label}</Label>
			</dt>
			<dd className="heading-display mt-1 text-base tabular-nums text-[var(--color-ink)]">{children}</dd>
		</div>
	);
}

function Line({ label, amount, currency }: { label: string; amount: number; currency: string | undefined }) {
	return (
		<div className="flex justify-between gap-4">
			<span className="min-w-0 truncate">{label}</span>
			<span className="tabular-nums text-[var(--color-ink)]">{formatPrice(amount, currency)}</span>
		</div>
	);
}
