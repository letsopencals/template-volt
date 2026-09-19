'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import type { CourtGridCourt } from '@/app/api/courts/[collection]/route';
import type { DurationOption } from '@/hooks/use-court-grid';
import { useCourtGrid } from '@/hooks/use-court-grid';
import { useCourtBooking, type CourtSelection } from '@/hooks/use-court-booking';
import { useDateFormatter } from '@/hooks/use-date-formatter';
import { useSettings } from '@/contexts/settings-context';
import { siteConfig } from '@/lib/site-config';
import { formatPrice } from '@/lib/format';
import { CourtGrid } from '@/components/booking/court-grid';
import { SportBackdrop } from '@/components/booking/sport-backdrop';
import { CourtGallery } from '@/components/booking/court-gallery';
import { DayStepper, todayString } from '@/components/booking/day-stepper';
import { AddOnsSelector } from '@/components/booking/addons-selector';
import { QuestionsForm } from '@/components/booking/questions-form';
import { DetailsStep } from '@/components/booking/details-step';
import { Button } from '@/components/ui/button';

const PaymentStep = dynamic(
	() => import('@/components/booking/payment-step').then((m) => m.PaymentStep),
	{ ssr: false },
);

const STEP_INITIAL = { opacity: 0, y: 12 };
const STEP_ANIMATE = { opacity: 1, y: 0 };
const STEP_EXIT = { opacity: 0, y: -8 };
const STEP_TRANSITION = { duration: 0.25 };

type Sport = (typeof siteConfig.sports)[number];
type SportKey = Sport['key'];

const SPORTS = siteConfig.sports as readonly Sport[];
const DEFAULT_SPORT: Sport = SPORTS[0]!;

function durationLabel(minutes: number): string {
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	if (h > 0 && m > 0) return `${h}h ${m}m`;
	if (h > 0) return `${h}h`;
	return `${m} min`;
}

export function CourtBookingView() {
	const searchParams = useSearchParams();
	const { currency } = useSettings();
	const { timezone, formatCustom } = useDateFormatter();

	const sportParam = searchParams.get('sport');
	const initialSport: SportKey = (SPORTS.find((s) => s.key === sportParam) ?? DEFAULT_SPORT).key;

	const [sport, setSport] = useState<SportKey>(initialSport);
	const [date, setDate] = useState<string>(todayString());
	const [selection, setSelection] = useState<CourtSelection | null>(null);

	const activeSport = SPORTS.find((s) => s.key === sport) ?? DEFAULT_SPORT;
	const collectionSlug = activeSport.courtsCollection;

	// Debounce the date fed to availability so rapid stepper clicks fetch only the
	// final day's slots (each day is ~11 court calls) — the stepper itself still
	// updates instantly off `date`.
	const [fetchDate, setFetchDate] = useState<string>(date);
	useEffect(() => {
		const id = setTimeout(() => setFetchDate(date), 250);
		return () => clearTimeout(id);
	}, [date]);

	const grid = useCourtGrid(collectionSlug, selection ? null : fetchDate, timezone);
	const booking = useCourtBooking(selection);

	// Reset the grid selection if the sport or date changes.
	useEffect(() => {
		setSelection(null);
	}, [sport, date]);

	const handleSelect = (court: CourtGridCourt, option: DurationOption) => {
		setSelection({
			court,
			slot: option.slot,
			units: option.units,
			locationId: option.slot.locationIds?.[0] ?? null,
		});
	};

	const total = useMemo(() => {
		if (!selection) return 0;
		return selection.court.price * selection.units + booking.addOnsTotal;
	}, [selection, booking.addOnsTotal]);

	// ── Grid view (no court chosen yet) ──
	if (!selection) {
		return (
			<div className="relative min-h-screen overflow-hidden bg-[var(--color-bg)] pt-28 pb-24">
				<SportBackdrop sport={sport} />
				<div className="relative z-10 mx-auto max-w-[1200px] px-6 lg:px-10">
					<div>
						<span className="chip">Court booking</span>
						<h1 className="heading-display mt-4 text-4xl text-[var(--color-ink)] lg:text-5xl">
							Book a court
						</h1>
						<p className="mt-3 max-w-lg text-[var(--color-ink-muted)]">
							Pick a sport, then tap any open slot to choose your court and duration.
						</p>
					</div>

					{/* Sport toggle + date stepper on one row (stacked on mobile, date second). */}
					<div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="inline-flex rounded-full border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-1">
							{siteConfig.sports.map((s) => (
								<button
									key={s.key}
									type="button"
									onClick={() => setSport(s.key)}
									className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
										s.key === sport
											? 'bg-[var(--color-primary)] text-white'
											: 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
									}`}
								>
									{s.label}
									<span className="ml-2 text-xs opacity-70">{s.priceHint}</span>
								</button>
							))}
						</div>
						<DayStepper date={date} onChange={setDate} />
					</div>

					<div className="mt-6">
						<CourtGrid
							courts={grid.courts}
							columns={grid.columns}
							courtsLoading={grid.courtsLoading}
							slotsLoading={grid.slotsLoading}
							error={grid.error}
							date={fetchDate}
							timezone={timezone}
							slotAt={grid.slotAt}
							durationOptions={grid.durationOptions}
							isCourtPending={grid.isCourtPending}
							currency={currency}
							onSelect={handleSelect}
						/>
					</div>

					<CourtGallery sport={sport} courts={grid.courts} />
				</div>
			</div>
		);
	}

	// ── Booking view (court + duration chosen) ──
	const [start, end] = [
		formatCustom(`${selection.slot.fromDate}T${selection.slot.fromTime}Z`, 'HH:mm'),
		formatCustom(`${selection.slot.toDate}T${selection.slot.toTime}Z`, 'HH:mm'),
	];
	const dateStr = formatCustom(`${selection.slot.fromDate}T${selection.slot.fromTime}Z`, 'dddd, MMM D');
	const displayTotal = formatPrice(total, currency);

	return (
		<div className="min-h-screen bg-[var(--color-bg)] pt-24">
			<div className="sticky top-[72px] z-20 px-3 lg:px-6">
				<div className="glass-nav mx-auto flex max-w-[1200px] items-center justify-between gap-4 rounded-full px-5 py-3">
					<button
						type="button"
						onClick={() => setSelection(null)}
						className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-primary)]"
					>
						<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
						</svg>
						<span className="hidden sm:inline">Back to grid</span>
					</button>
					<p className="truncate text-center text-sm font-semibold text-[var(--color-ink)]">
						{selection.court.title} · {selection.court.variantTitle}
					</p>
					<span className="text-sm font-semibold text-[var(--color-primary)]">{displayTotal}</span>
				</div>
			</div>

			<div className="mx-auto max-w-[1200px] px-6 pt-10 pb-24 lg:px-10">
				<div className="grid gap-10 lg:grid-cols-[1fr_360px]">
					<div className="order-2 min-w-0 lg:order-1">
						{booking.error ? (
							<div className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
								<span>{booking.error}</span>
								<button onClick={() => booking.setError(null)} className="shrink-0 font-semibold underline">
									Dismiss
								</button>
							</div>
						) : null}

						<AnimatePresence mode="wait">
							{booking.step === 'extras' ? (
								<motion.div key="extras" initial={STEP_INITIAL} animate={STEP_ANIMATE} exit={STEP_EXIT} transition={STEP_TRANSITION} className="space-y-6">
									<AddOnsSelector
										addOns={booking.availableAddOns}
										loading={booking.addOnsLoading}
										selected={booking.selectedAddOns}
										bookedDurationUnits={booking.bookedDurationUnits}
										currency={currency}
										onChange={booking.updateAddOnQuantity}
									/>
									<Button variant="primary" size="lg" fullWidth onClick={booking.handleContinueFromExtras}>
										{booking.selectedAddOns.size > 0 ? 'Continue' : 'Skip & continue'}
										<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
											<path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
										</svg>
									</Button>
								</motion.div>
							) : null}

							{booking.step === 'questions' ? (
								<motion.div key="questions" initial={STEP_INITIAL} animate={STEP_ANIMATE} exit={STEP_EXIT} transition={STEP_TRANSITION}>
									<QuestionsForm
										questions={booking.questions}
										answers={booking.answers}
										setAnswers={booking.setAnswers}
										valid={booking.questionsValid}
										onContinue={booking.handleContinueFromQuestions}
									/>
								</motion.div>
							) : null}

							{booking.step === 'details' ? (
								<motion.div key="details" initial={STEP_INITIAL} animate={STEP_ANIMATE} exit={STEP_EXIT} transition={STEP_TRANSITION}>
									<DetailsStep
										email={booking.email}
										firstName={booking.firstName}
										lastName={booking.lastName}
										customerId={booking.customerId}
										onChangeEmail={booking.setEmail}
										onChangeFirstName={booking.setFirstName}
										onChangeLastName={booking.setLastName}
										fieldErrors={booking.fieldErrors}
										submitting={booking.submitting}
										canSubmit={booking.detailsValid}
										onSubmit={booking.handleSubmitDetails}
									/>
								</motion.div>
							) : null}

							{booking.step === 'payment' ? (
								<motion.div key="payment" initial={STEP_INITIAL} animate={STEP_ANIMATE} exit={STEP_EXIT} transition={STEP_TRANSITION}>
									<PaymentStep
										providers={booking.providers}
										provider={booking.provider}
										paymentData={booking.paymentData}
										submitting={booking.submitting}
										isExpired={booking.isExpired}
										onSelectProvider={booking.handleSelectProvider}
										onStripeSuccess={(piId) => booking.handleSubmitCheckout(piId)}
										onStripeError={(msg) => booking.setError(msg)}
										onSubmitCash={() => booking.handleSubmitCheckout()}
									/>
								</motion.div>
							) : null}
						</AnimatePresence>
					</div>

					{/* Summary */}
					<aside className="order-1 lg:order-2">
						<div className="lg:sticky lg:top-28">
							<div className="overflow-hidden rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] card-shadow">
								<div className="border-b border-[var(--color-line)] px-5 py-4">
									<p className="text-base font-semibold text-[var(--color-ink)]">Your court</p>
								</div>
								<div className="space-y-4 px-5 py-5 text-sm">
									<SummaryRow label="Court" value={`${selection.court.title} · ${selection.court.variantTitle}`} />
									<SummaryRow label="Date" value={dateStr} onEdit={() => setSelection(null)} />
									<SummaryRow label="Time" value={`${start} – ${end}`} onEdit={() => setSelection(null)} />
									<SummaryRow label="Duration" value={durationLabel((selection.court.duration * selection.units) / 60)} />
									{booking.selectedAddOns.size > 0 ? (
										<div className="space-y-1.5 border-t border-[var(--color-line)] pt-3">
											<p className="text-xs font-medium text-[var(--color-ink-dim)]">Add-ons</p>
											{Array.from(booking.selectedAddOns.entries()).map(([id, qty]) => {
												const addOn = booking.availableAddOns.find((a) => a.id === id);
												if (!addOn) return null;
												const unit = addOn.durationMultiplied ? addOn.price * booking.bookedDurationUnits : addOn.price;
												return (
													<div key={id} className="flex justify-between gap-4 text-xs">
														<span className="text-[var(--color-ink-muted)]">
															{addOn.title ?? addOn.slug}
															{!addOn.durationMultiplied && qty > 1 ? ` × ${qty}` : ''}
														</span>
														<span className="font-medium text-[var(--color-ink)]">{formatPrice(unit * qty, currency)}</span>
													</div>
												);
											})}
										</div>
									) : null}
								</div>
							</div>
							<div className="mt-4 flex items-baseline justify-between rounded-3xl border border-[var(--color-primary)]/20 bg-[var(--color-brass-soft)] px-5 py-4">
								<span className="text-sm font-semibold text-[var(--color-ink-muted)]">Total</span>
								<span className="heading-display text-2xl text-[var(--color-primary)]">{displayTotal}</span>
							</div>
						</div>
					</aside>
				</div>
			</div>
		</div>
	);
}

function SummaryRow({ label, value, onEdit }: { label: string; value: string; onEdit?: () => void }) {
	return (
		<div className="flex items-start justify-between gap-4">
			<div className="min-w-0">
				<p className="text-xs font-medium text-[var(--color-ink-dim)]">{label}</p>
				<p className="mt-0.5 font-medium text-[var(--color-ink)]">{value}</p>
			</div>
			{onEdit ? (
				<button
					type="button"
					onClick={onEdit}
					className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-bright)]"
				>
					Change
				</button>
			) : null}
		</div>
	);
}
