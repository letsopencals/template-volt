'use client';

import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import type { ProductListItemResponse } from '@opencals/storefront-sdk';
import { formatPrice } from '@/lib/format';
import { BOOKING_STEPS, type BookingStep } from '@/lib/booking-constants';
import { HorizontalDayStrip } from '@/components/booking/horizontal-day-strip';
import { TimeSlots } from '@/components/booking/time-slots';
import { StaffSelector } from '@/components/booking/staff-selector';
import { LocationSelector } from '@/components/booking/location-selector';
import { AddOnsSelector } from '@/components/booking/addons-selector';
import { BookingSummary } from '@/components/booking/booking-summary';
import { DetailsStep } from '@/components/booking/details-step';
import { StepProgress } from '@/components/booking/step-indicator';
import { QuestionsForm } from '@/components/booking/questions-form';
import { Button } from '@/components/ui/button';
import { useBookingFlow } from '@/hooks/use-booking-flow';
import { useSettings } from '@/contexts/settings-context';

// PaymentStep pulls in Stripe (@stripe/react-stripe-js + stripe-js), which is
// heavy and only needed on the final step — load it on demand.
const PaymentStep = dynamic(
	() => import('@/components/booking/payment-step').then((m) => m.PaymentStep),
	{ ssr: false },
);

const STEP_INITIAL = { opacity: 0, y: 12 };
const STEP_ANIMATE = { opacity: 1, y: 0 };
const STEP_EXIT = { opacity: 0, y: -8 };
const STEP_TRANSITION = { duration: 0.25 };

export function BookingView({
	slug,
	initialProduct,
}: {
	slug: string;
	initialProduct: ProductListItemResponse | null;
}) {
	const { currency } = useSettings();
	const flow = useBookingFlow(slug, initialProduct);

	if (flow.loading) {
		return (
			<div className="min-h-screen bg-[var(--color-bg)] pt-32 pb-20">
				<div className="mx-auto max-w-[1100px] px-6 lg:px-10">
					<div className="animate-pulse space-y-6">
						<div className="h-12 rounded-2xl bg-[var(--color-surface)]" />
						<div className="h-32 rounded-3xl bg-[var(--color-surface)]" />
						<div className="h-64 rounded-3xl bg-[var(--color-surface)]" />
					</div>
				</div>
			</div>
		);
	}

	if (flow.error && !flow.product) {
		return (
			<div className="min-h-screen bg-[var(--color-bg)] pt-32 pb-20">
				<div className="mx-auto max-w-[1100px] px-6 text-center lg:px-10">
					<p className="text-[var(--color-ink-muted)]">{flow.error}</p>
					<Link
						href="/training"
						className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)] hover:underline"
					>
						&larr; Back to Training
					</Link>
				</div>
			</div>
		);
	}

	if (!flow.product) return null;

	const variantLocations = flow.activeVariant?.locations ?? [];
	const variantLabel = flow.hasVariants ? (flow.activeVariant?.variantTitle ?? null) : null;
	const totalPrice =
		(flow.activeVariant?.price ?? flow.product.price) * flow.attendees + flow.addOnsTotal;
	const displayPrice = formatPrice(totalPrice, currency);

	const visibleSteps: BookingStep[] = BOOKING_STEPS.filter((s) => {
		if (s === 'who' && flow.whoSkipped) return false;
		if (s === 'extras' && flow.extrasSkipped) return false;
		if (s === 'questions' && flow.questionsSkipped) return false;
		return true;
	});

	const showSummary = flow.step === 'extras' || flow.step === 'questions' || flow.step === 'details' || flow.step === 'payment';

	const finalStaff = flow.staffForLocation.find((s) => s.id === flow.finalStaffId) ?? null;
	const selectedLocation = variantLocations.find((l) => l.id === flow.selectedLocationId) ?? null;

	return (
		<div className="min-h-screen bg-[var(--color-bg)] pt-24">
			{/* Sticky glass bar (offset below the fixed site header) */}
			<div className="sticky top-[72px] z-20 px-3 lg:px-6">
				<div className="glass-nav mx-auto flex max-w-[1200px] items-center justify-between gap-4 rounded-full px-5 py-3 shadow-[0_8px_32px_-12px_rgba(18,48,63,0.2)]">
					<Link
						href="/training"
						className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-primary)]"
					>
						<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
						</svg>
						<span className="hidden sm:inline">All training</span>
					</Link>
					<p className="truncate text-center text-sm font-semibold text-[var(--color-ink)]">{flow.product.title}</p>
					<span className="text-sm font-semibold text-[var(--color-primary)]">{displayPrice}</span>
				</div>
			</div>

			<div className="mx-auto max-w-[1200px] px-6 pt-10 pb-24 lg:px-10">
				{/* Progress header */}
				<StepProgress
					steps={visibleSteps}
					current={flow.step}
					completed={flow.stepCompleted}
					canEnter={flow.canEnter}
					onSelect={flow.goToStep}
				/>

				<div className={`mt-10 grid gap-10 ${showSummary ? 'lg:grid-cols-[1fr_360px]' : ''}`}>
					<div className={`min-w-0 ${showSummary ? 'order-2 lg:order-1' : ''}`}>
						{/* Visit / location selector */}
						{variantLocations.length > 1 ? (
							<div className="mb-6">
								<p className="mb-3 text-sm font-semibold text-[var(--color-ink)]">Choose a location</p>
								<LocationSelector
									locations={variantLocations}
									selected={flow.selectedLocationId}
									onSelect={flow.setSelectedLocationId}
								/>
							</div>
						) : null}

						{/* Variant pills */}
						{flow.hasVariants && flow.variants.length > 1 ? (
							<div className="mb-6">
								<p className="mb-3 text-sm font-semibold text-[var(--color-ink)]">Choose an option</p>
								<div className="no-scrollbar -mx-2 flex gap-2 overflow-x-auto px-2">
									{flow.variants.map((v) => {
										const isActive = (flow.activeVariant?.id ?? flow.variants[0]?.id) === v.id;
										return (
											<button
												key={v.id}
												onClick={() => flow.setSelectedVariantId(v.id)}
												className={`shrink-0 rounded-full border px-5 py-2.5 text-sm font-semibold transition-all ${
													isActive
														? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
														: 'border-[var(--color-line-strong)] text-[var(--color-ink)] hover:border-[var(--color-primary)]/40'
												}`}
											>
												{v.variantTitle} · {formatPrice(v.price, currency)}
											</button>
										);
									})}
								</div>
							</div>
						) : null}

						{/* Error banner */}
						{flow.error ? (
							<div className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
								<span>{flow.error}</span>
								<button onClick={() => flow.setError(null)} className="shrink-0 font-semibold underline">
									Dismiss
								</button>
							</div>
						) : null}

						<AnimatePresence mode="wait">
							{flow.step === 'when' ? (
								<motion.div key="when" initial={STEP_INITIAL} animate={STEP_ANIMATE} exit={STEP_EXIT} transition={STEP_TRANSITION}>
									{flow.staffForLocation.length > 1 ? (
										<div className="mb-6">
											<StaffSelector
												staffMembers={flow.staffForLocation}
												selected={flow.selectedStaffId}
												onSelect={flow.setSelectedStaffId}
											/>
										</div>
									) : null}

									<HorizontalDayStrip
										selectedDate={flow.selectedDate}
										onDateSelect={flow.setSelectedDate}
									/>

									<div className="mt-6">
										{flow.selectedDate ? (
											<TimeSlots
												slots={flow.slots}
												selectedSlot={flow.selectedSlot}
												onSlotSelect={flow.handleSlotSelect}
												loading={flow.slotsLoading}
												timezone={flow.timezone}
												staffMembers={flow.staffForLocation}
											/>
										) : (
											<p className="rounded-3xl border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface)] py-10 text-center text-sm text-[var(--color-ink-muted)]">
												Pick a day above to see open times.
											</p>
										)}
									</div>
								</motion.div>
							) : null}

							{flow.step === 'who' && flow.selectedSlot ? (
								<motion.div key="who" initial={STEP_INITIAL} animate={STEP_ANIMATE} exit={STEP_EXIT} transition={STEP_TRANSITION}>
									<p className="mb-5 text-base text-[var(--color-ink-muted)]">
										Choose a coach for your session.
									</p>
									<StaffSelector
										staffMembers={flow.slotStaff}
										selected={flow.confirmedStaffId}
										onSelect={flow.setConfirmedStaffId}
										hideLabel
									/>
								</motion.div>
							) : null}

							{flow.step === 'extras' && flow.selectedSlot ? (
								<motion.div key="extras" initial={STEP_INITIAL} animate={STEP_ANIMATE} exit={STEP_EXIT} transition={STEP_TRANSITION} className="space-y-6">
									<AddOnsSelector
										addOns={flow.availableAddOns}
										loading={flow.addOnsLoading}
										selected={flow.selectedAddOns}
										bookedDurationUnits={flow.bookedDurationUnits}
										currency={currency}
										onChange={flow.updateAddOnQuantity}
									/>

									<Button variant="primary" size="lg" fullWidth onClick={flow.handleContinueFromExtras}>
										{flow.selectedAddOns.size > 0 ? 'Continue' : 'Skip & continue'}
										<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
											<path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
										</svg>
									</Button>
								</motion.div>
							) : null}

							{flow.step === 'questions' ? (
								<motion.div key="questions" initial={STEP_INITIAL} animate={STEP_ANIMATE} exit={STEP_EXIT} transition={STEP_TRANSITION}>
									<QuestionsForm
										questions={flow.questions}
										answers={flow.answers}
										setAnswers={flow.setAnswers}
										valid={flow.questionsValid}
										onContinue={flow.handleContinueFromQuestions}
									/>
								</motion.div>
							) : null}

							{flow.step === 'details' ? (
								<motion.div key="details" initial={STEP_INITIAL} animate={STEP_ANIMATE} exit={STEP_EXIT} transition={STEP_TRANSITION}>
									<DetailsStep
										email={flow.email}
										firstName={flow.firstName}
										lastName={flow.lastName}
										customerId={flow.customerId}
										onChangeEmail={flow.setEmail}
										onChangeFirstName={flow.setFirstName}
										onChangeLastName={flow.setLastName}
										fieldErrors={flow.fieldErrors}
										submitting={flow.submitting}
										canSubmit={flow.detailsValid}
										onSubmit={flow.handleSubmitDetails}
									/>
								</motion.div>
							) : null}

							{flow.step === 'payment' ? (
								<motion.div key="payment" initial={STEP_INITIAL} animate={STEP_ANIMATE} exit={STEP_EXIT} transition={STEP_TRANSITION}>
									<PaymentStep
										providers={flow.providers}
										provider={flow.provider}
										paymentData={flow.paymentData}
										submitting={flow.submitting}
										isExpired={flow.isExpired}
										onSelectProvider={flow.handleSelectProvider}
										onStripeSuccess={(piId) => flow.handleSubmitCheckout(piId)}
										onStripeError={(msg) => flow.setError(msg)}
										onSubmitCash={() => flow.handleSubmitCheckout()}
									/>
								</motion.div>
							) : null}
						</AnimatePresence>
					</div>

					{/* Sticky glass summary panel */}
					{showSummary ? (
						<aside className="order-1 lg:order-2">
							<div className="lg:sticky lg:top-28">
								{flow.selectedSlot ? (
									<BookingSummary
										product={flow.product}
										activeVariant={flow.activeVariant}
										variantLabel={variantLabel}
										staff={finalStaff}
										location={selectedLocation}
										selectedSlot={flow.selectedSlot}
										selectedDate={flow.selectedDate}
										availableAddOns={flow.availableAddOns}
										selectedAddOns={flow.selectedAddOns}
										bookedDurationUnits={flow.bookedDurationUnits}
										currency={currency}
										attendees={flow.attendees}
										formatCustom={flow.formatCustom}
										formatTimeRange={flow.formatTimeRange}
									/>
								) : (
									<div className="glass rounded-3xl px-5 py-8 text-center">
										<p className="text-sm font-semibold text-[var(--color-primary)]">Your appointment</p>
										<p className="mt-3 text-sm text-[var(--color-ink-dim)]">
											Your selections will appear here as you go.
										</p>
									</div>
								)}

								<div className="mt-4 flex items-baseline justify-between rounded-3xl border border-[var(--color-primary)]/20 bg-[var(--color-brass-soft)] px-5 py-4">
									<span className="text-sm font-semibold text-[var(--color-ink-muted)]">Total</span>
									<span className="heading-display text-2xl text-[var(--color-primary)]">{displayPrice}</span>
								</div>
							</div>
						</aside>
					) : null}
				</div>
			</div>
		</div>
	);
}
