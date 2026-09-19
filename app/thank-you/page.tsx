'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { formatPrice } from '@/lib/format';
import { useDateFormatter } from '@/hooks/use-date-formatter';
import type { OrderDetailResponse, OrderDetailLineItem, OrderDetailAppointment, OrderDetailTransaction } from '@opencals/storefront-sdk';

export default function ThankYouPage() {
	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
				</div>
			}
		>
			<ThankYouContent />
		</Suspense>
	);
}

function ThankYouContent() {
	const searchParams = useSearchParams();
	const orderId = searchParams.get('orderId');
	const { status: authStatus } = useSession();

	const [order, setOrder] = useState<OrderDetailResponse | null>(null);
	const [loading, setLoading] = useState(!!orderId);

	useEffect(() => {
		if (!orderId) return;

		async function fetchOrder() {
			try {
				const res = await fetch(`/api/account/orders/${orderId}`);
				if (res.ok) {
					setOrder(await res.json());
				}
			} catch {
				/* swallow — show basic confirmation */
			} finally {
				setLoading(false);
			}
		}

		fetchOrder();
	}, [orderId]);

	const { formatCustom, formatDate } = useDateFormatter();
	const lineItems: OrderDetailLineItem[] = order?.lineItems ?? [];
	// Appointments live on each order line item in v0.3.8.
	const appointments = lineItems
		.map((li) => li.appointment)
		.filter((a): a is OrderDetailAppointment => a != null);
	const currency = order?.paymentCurrencyCode ?? 'USD';
	const transactions = order?.transactions;
	const successTransaction = transactions?.find((t: OrderDetailTransaction) => t.status === 'success');

	return (
		<section className="aura-blue bg-[var(--color-bg)] pt-32 pb-20 lg:pt-40 lg:pb-32">
			<div className="mx-auto max-w-[1100px] px-6 lg:px-10">
				{/* Success banner */}
				<motion.div
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.5 }}
					className="text-center"
				>
					<div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
						<span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white">
							<svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
							</svg>
						</span>
					</div>

					<h1 className="heading-display mt-7 text-4xl text-[var(--color-ink)] lg:text-5xl">
						You’re all booked!
					</h1>

					{order?.name && (
						<p className="mt-4 text-base text-[var(--color-ink-muted)]">
							Booking <span className="font-semibold text-[var(--color-ink)]">#{order.name}</span> is confirmed.
						</p>
					)}

					{order?.customer?.email && (
						<p className="mt-1 text-base text-[var(--color-ink-muted)]">
							A confirmation has been sent to{' '}
							<span className="font-medium text-[var(--color-ink)]">{order.customer.email}</span>.
						</p>
					)}
				</motion.div>

				{loading ? (
					<div className="mt-12 space-y-6">
						<div className="h-48 animate-pulse rounded-3xl bg-[var(--color-surface)]" />
						<div className="h-48 animate-pulse rounded-3xl bg-[var(--color-surface)]" />
					</div>
				) : (
					<div className="mt-12 grid gap-6 lg:grid-cols-3">
						{/* Main content */}
						<div className="space-y-6 lg:col-span-2">
							{appointments.length > 0 && (
								<div className="rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-7 card-shadow">
									<h2 className="text-lg font-semibold text-[var(--color-ink)]">Appointment details</h2>
									<div className="mt-5 space-y-5">
										{appointments.map((appt, i) => {
											const isOnline = appt.location?.type === 'online';
											return (
												<div
													key={appt.id ?? i}
													className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-sand)] p-5"
												>
													<div className="flex items-start justify-between gap-3">
														<p className="text-base font-semibold text-[var(--color-ink)]">
															{appt.product?.title ?? 'Service'}
														</p>
														<AppointmentStatusBadge status={appt.status} />
													</div>

													<div className="mt-4 space-y-2.5">
														{appt.from && (
															<InfoRow
																icon="calendar"
																text={`${formatCustom(appt.from, 'dddd, MMMM D, YYYY')} · ${formatCustom(appt.from, 'h:mm A')}${appt.to ? ` – ${formatCustom(appt.to, 'h:mm A')}` : ''}`}
															/>
														)}
														<InfoRow
															icon={isOnline ? 'video' : 'pin'}
															text={isOnline ? 'Online session — video or phone' : (appt.location?.title ?? 'At the club')}
														/>
														{appt.staffMember && (
															<InfoRow
																icon="user"
																text={[appt.staffMember.firstName, appt.staffMember.lastName].filter(Boolean).join(' ')}
															/>
														)}
														{appt.numberOfAttendees > 1 && (
															<InfoRow icon="users" text={`${appt.numberOfAttendees} attendees`} />
														)}
													</div>
												</div>
											);
										})}
									</div>
								</div>
							)}

							{/* Payment Information */}
							<div className="rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-7 card-shadow">
								<h2 className="text-lg font-semibold text-[var(--color-ink)]">Payment</h2>
								<div className="mt-4 space-y-3">
									{successTransaction && (
										<>
											<SummaryRow label="Payment method" value={successTransaction.gateway ?? 'N/A'} capitalize />
											<SummaryRow label="Amount" value={formatPrice(successTransaction.amount ?? 0, currency)} />
											{successTransaction.createdAt && (
												<SummaryRow label="Date" value={formatDate(successTransaction.createdAt)} />
											)}
										</>
									)}
									<div className="flex justify-between text-sm">
										<span className="text-[var(--color-ink-muted)]">Status</span>
										<span className={`font-semibold ${order?.isFullyPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
											{order?.isFullyPaid ? 'Paid' : 'Pending'}
										</span>
									</div>
								</div>
							</div>
						</div>

						{/* Sidebar */}
						<div className="space-y-6">
							{/* Order Summary */}
							<div className="rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-7 card-shadow">
								<h2 className="text-lg font-semibold text-[var(--color-ink)]">Summary</h2>
								{lineItems.length > 0 && (
									<div className="mt-4 divide-y divide-[var(--color-line)]">
										{lineItems.map((item, i) => (
											<div key={i} className="flex justify-between py-2.5">
												<div>
													<p className="text-sm text-[var(--color-ink)]">
														{item.appointment?.product?.title ?? 'Service'}
													</p>
													{item.quantity > 1 && (
														<p className="text-xs text-[var(--color-ink-dim)]">Qty: {item.quantity}</p>
													)}
												</div>
												<p className="text-sm font-medium text-[var(--color-ink)]">
													{formatPrice(item.discountedTotal ?? 0, currency)}
												</p>
											</div>
										))}
									</div>
								)}

								<div className="mt-4 space-y-2 border-t border-[var(--color-line)] pt-4">
									<SummaryRow label="Subtotal" value={formatPrice(order?.subtotal ?? 0, currency)} muted />
									{(order?.totalTax ?? 0) > 0 && (
										<SummaryRow label="Tax" value={formatPrice(order?.totalTax ?? 0, currency)} muted />
									)}
									<div className="flex items-baseline justify-between border-t border-[var(--color-line)] pt-3">
										<span className="text-sm font-semibold text-[var(--color-ink)]">Total</span>
										<span className="heading-display text-2xl text-[var(--color-primary)]">
											{formatPrice(order?.total ?? 0, currency)}
										</span>
									</div>
								</div>
							</div>

							{/* Actions */}
							<div className="space-y-3">
								{authStatus === 'authenticated' ? (
									<>
										<Link
											href="/account/appointments"
											className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-[var(--color-primary-bright)]"
										>
											View appointments
										</Link>
										<Link
											href="/account/orders"
											className="flex w-full items-center justify-center gap-2 rounded-full border border-[var(--color-line-strong)] px-6 py-3.5 text-sm font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-primary)]/40"
										>
											View orders
										</Link>
									</>
								) : (
									<div className="rounded-2xl border border-[var(--color-primary)]/20 bg-[var(--color-brass-soft)] p-5">
										<p className="text-sm font-semibold text-[var(--color-ink)]">Create an account</p>
										<p className="mt-1 text-sm text-[var(--color-ink-muted)]">
											Sign up to manage your appointments and view order history.
										</p>
										<Link
											href="/auth/sign-up"
											className="mt-3 inline-block text-sm font-semibold text-[var(--color-primary)] hover:underline"
										>
											Sign up →
										</Link>
									</div>
								)}
								<Link
									href="/book"
									className="flex w-full items-center justify-center gap-2 rounded-full border border-[var(--color-line-strong)] px-6 py-3.5 text-sm font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-primary)]/40"
								>
									Book another court
								</Link>
							</div>
						</div>
					</div>
				)}
			</div>
		</section>
	);
}

type InfoIcon = 'calendar' | 'pin' | 'video' | 'user' | 'users';

const ICON_PATHS: Record<InfoIcon, string> = {
	calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
	pin: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
	video: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
	user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
	users: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
};

function InfoRow({ icon, text }: { icon: InfoIcon; text: string }) {
	return (
		<div className="flex items-center gap-2.5 text-sm text-[var(--color-ink-muted)]">
			<svg className="h-4 w-4 shrink-0 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
				<path strokeLinecap="round" strokeLinejoin="round" d={ICON_PATHS[icon]} />
			</svg>
			<span>{text}</span>
		</div>
	);
}

function SummaryRow({ label, value, muted, capitalize }: { label: string; value: string; muted?: boolean; capitalize?: boolean }) {
	return (
		<div className="flex justify-between text-sm">
			<span className="text-[var(--color-ink-muted)]">{label}</span>
			<span className={`font-medium text-[var(--color-ink)] ${capitalize ? 'capitalize' : ''} ${muted ? 'font-normal' : ''}`}>
				{value}
			</span>
		</div>
	);
}

function AppointmentStatusBadge({ status }: { status?: string }) {
	const normalized = (status ?? '').toLowerCase().replace(/_/g, ' ');
	const isScheduled = normalized === 'scheduled';

	return (
		<span
			className={`inline-block shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
				isScheduled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
			}`}
		>
			{isScheduled ? 'Scheduled' : normalized || 'Pending'}
		</span>
	);
}
