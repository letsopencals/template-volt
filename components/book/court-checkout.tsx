'use client';

import Image from 'next/image';
import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useCourtBooking, type CourtSelection } from '@/hooks/use-court-booking';
import { useDateFormatter } from '@/hooks/use-date-formatter';
import { formatPrice } from '@/lib/format';
import { formatLength, playersOn, sportOf, type Club } from '@/lib/club';
import { AddOnsSelector } from '@/components/booking/addons-selector';
import { QuestionsForm } from '@/components/booking/questions-form';
import { DetailsStep } from '@/components/booking/details-step';
import { Button } from '@/components/ui/button';

const PaymentStep = dynamic(() => import('@/components/booking/payment-step').then((m) => m.PaymentStep), { ssr: false });

const STEP_INITIAL = { opacity: 0, y: 12 };
const STEP_ANIMATE = { opacity: 1, y: 0 };
const STEP_EXIT = { opacity: 0, y: -8 };
const STEP_TRANSITION = { duration: 0.25 };

/**
 * The court is chosen (on the hall map or the grid): extras → questions → details → payment, with the game summary
 * on the side. No staff anywhere; the court product is the resource.
 */
export function CourtCheckout({
	selection,
	club,
	currency,
	onBack,
}: {
	selection: CourtSelection;
	club: Club;
	currency: string | undefined;
	onBack: () => void;
}) {
	const booking = useCourtBooking(selection);
	const { formatCustom } = useDateFormatter();
	const { court, slot } = selection;
	const sport = sportOf(court.sport);
	const minutes = (court.duration * selection.units) / 60;

	const total = useMemo(() => court.price * selection.units + booking.addOnsTotal, [court.price, selection.units, booking.addOnsTotal]);
	const fmt = (date: string, time: string, f: string) => formatCustom(`${date}T${time}Z`, f);
	const start = fmt(slot.fromDate, slot.fromTime, 'HH:mm');
	const end = fmt(slot.toDate, slot.toTime, 'HH:mm');
	const day = fmt(slot.fromDate, slot.fromTime, 'dddd, D MMM');
	const displayTotal = formatPrice(total, currency);
	const players = playersOn(court);

	return (
		<div className="min-h-screen bg-[var(--color-bg)] pt-24">
			<div className="sticky top-[72px] z-20 px-3 lg:px-6">
				<div className="glass-nav mx-auto flex max-w-[1400px] items-center justify-between gap-4 rounded-full px-5 py-3">
					<button
						type="button"
						onClick={onBack}
						className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-primary)]"
					>
						<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
						</svg>
						<span className="hidden sm:inline">Back to {club.name}</span>
					</button>
					<p className="truncate text-center text-sm font-semibold text-[var(--color-ink)]">
						{sport.label} · Court {court.number} · {start}
					</p>
					<span className="text-sm font-semibold text-[var(--color-primary)]">{displayTotal}</span>
				</div>
			</div>

			<div className="mx-auto max-w-[1400px] px-4 pb-24 pt-10 sm:px-6 lg:px-10">
				<div className="grid gap-10 lg:grid-cols-[1fr_380px]">
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

					<aside className="order-1 lg:order-2">
						<div className="lg:sticky lg:top-36">
							<div className="overflow-hidden rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] card-shadow">
								<div className="relative h-28 overflow-hidden">
																		<Image src={`/images/${club.image}`} alt="" fill sizes="380px" className="object-cover opacity-60" />
									<div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface)] to-transparent" />
									<div className="absolute bottom-3 left-5">
										<p className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]">Your game</p>
										<p className="heading-display text-xl text-[var(--color-ink)]">{club.title}</p>
									</div>
								</div>
								<div className="space-y-4 px-5 py-5 text-sm">
									<SummaryRow label="Court" value={`${sport.label} · Court ${court.number}${court.format === 'singles' ? ' · Singles' : ''}`} />
									<SummaryRow label="When" value={`${day}, ${start}–${end}`} onEdit={onBack} />
									<SummaryRow label="Length" value={`${formatLength(minutes)} · up to ${players} players`} />
									{club.address ? <SummaryRow label="Where" value={club.address} /> : null}
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
								<span className="text-sm font-semibold text-[var(--color-ink-muted)]">
									Total <span className="font-normal text-[var(--color-ink-dim)]">· {formatPrice(total / players, currency)} each for {players}</span>
								</span>
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
