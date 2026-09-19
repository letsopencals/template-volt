'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatPrice } from '@/lib/format';
import { useDateFormatter } from '@/hooks/use-date-formatter';
import type { OrderDetailResponse, OrderDetailLineItem, OrderDetailAppointment, AppointmentStatusType } from '@opencals/storefront-sdk';

export default function OrderDetailPage() {
	const { orderId } = useParams<{ orderId: string }>();
	const [order, setOrder] = useState<OrderDetailResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const { formatCustom, formatTime } = useDateFormatter();

	useEffect(() => {
		async function fetchOrder() {
			try {
				const res = await fetch(`/api/account/orders/${orderId}`);
				if (res.ok) {
					setOrder(await res.json());
				}
			} catch {
				// silently fail
			} finally {
				setLoading(false);
			}
		}
		fetchOrder();
	}, [orderId]);

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="h-8 w-48 animate-pulse rounded bg-[var(--color-surface)]" />
				<div className="h-64 animate-pulse rounded bg-[var(--color-surface)]" />
			</div>
		);
	}

	if (!order) {
		return (
			<div className="text-center">
				<p className="text-sm text-[var(--color-ink-muted)]">Order not found</p>
				<Link href="/account/orders" className="mt-4 inline-block text-sm font-medium text-[var(--color-primary)] hover:underline">
					Back to orders
				</Link>
			</div>
		);
	}

	const currency = order.paymentCurrencyCode;
	const lineItems = order.lineItems ?? [];
	// Appointments live on each order line item in v0.3.8.
	const appointments = lineItems
		.map((li) => li.appointment)
		.filter((a): a is OrderDetailAppointment => a != null);

	return (
		<div>
			{/* Header */}
			<div className="flex items-center gap-3">
				<Link href="/account/orders" className="text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]">
					<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
					</svg>
				</Link>
				<div>
					<h1 className="font-display text-2xl font-semibold text-[var(--color-ink)]">
						Order #{order.name}
					</h1>
					<p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
						{formatCustom(order.createdAt, 'dddd, MMMM D, YYYY')}
					</p>
				</div>
			</div>

			{/* Status badges */}
			<div className="mt-4 flex flex-wrap gap-2">
				<PaymentStatusBadge status={order.paymentStatus} />
				<FulfillmentStatusBadge status={order.fulfillmentStatus} />
				{order.refundStatus !== 'unrefunded' && (
					<RefundStatusBadge status={order.refundStatus} />
				)}
			</div>

			<div className="mt-8 grid gap-8 lg:grid-cols-3">
				{/* Main content */}
				<div className="space-y-6 lg:col-span-2">
					{/* Appointments */}
					{appointments.length > 0 && (
						<div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
							<h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-ink)]">
								Appointments
							</h2>
							<div className="mt-4 divide-y divide-[var(--color-line)]">
								{appointments.map((appt) => (
										<Link
											key={appt.id}
											href={`/account/appointments/${appt.id}`}
											className="block py-4 first:pt-0 last:pb-0 transition-colors hover:bg-[var(--color-surface)]/30"
										>
											<div className="flex items-start justify-between">
												<div>
													<p className="text-sm font-medium text-[var(--color-ink)]">
														{appt.product?.title ?? 'Service'}
													</p>
													<p className="mt-1 text-xs text-[var(--color-ink-muted)]">
														{formatCustom(appt.from, 'ddd, MMM D')}
														{' at '}
														{formatTime(appt.from)}
														{' - '}
														{formatTime(appt.to)}
													</p>
													{appt.staffMember && (
														<p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
															with {[appt.staffMember.firstName, appt.staffMember.lastName].filter(Boolean).join(' ')}
														</p>
													)}
													{appt.location?.title && (
														<p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{appt.location.title}</p>
													)}
												</div>
												<AppointmentStatusBadge status={appt.status} />
											</div>
										</Link>
								))}
							</div>
						</div>
					)}

					{/* Line Items */}
					{lineItems.length > 0 && (
						<div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
							<h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-ink)]">
								Items
							</h2>
							<div className="mt-4 divide-y divide-[var(--color-line)]">
								{lineItems.map((item: OrderDetailLineItem, i: number) => {
									const addOnLineItems = item.addOnLineItems ?? [];
									return (
										<div key={i} className="py-3 first:pt-0 last:pb-0">
											<div className="flex items-center justify-between">
												<div>
													<p className="text-sm text-[var(--color-ink)]">
														{item.appointment?.product?.title ?? 'Service'}
													</p>
													{item.quantity > 1 && (
														<p className="text-xs text-[var(--color-ink-muted)]">Qty: {item.quantity}</p>
													)}
													{item.discountedUnitPrice < item.originalUnitPrice && (
														<p className="text-xs text-[var(--color-ink-muted)] line-through">
															{formatPrice(item.originalUnitPrice, currency)}
														</p>
													)}
												</div>
												<p className="text-sm font-medium text-[var(--color-ink)]">
													{formatPrice(item.discountedTotal, currency)}
												</p>
											</div>
											{addOnLineItems.length > 0 && (
												<div className="mt-2 ml-3 space-y-1 border-l border-dashed border-[var(--color-line)] pl-3">
													{addOnLineItems.map((aoli, j) => (
														<div key={j} className="flex justify-between text-xs text-[var(--color-ink-muted)]">
															<span>
																{aoli.addOn?.title ?? 'Add-on'} × {aoli.quantity}
															</span>
															<span className="font-medium text-[var(--color-ink)]">
																{formatPrice(aoli.discountedSubtotal, currency)}
															</span>
														</div>
													))}
												</div>
											)}
										</div>
									);
								})}
							</div>
						</div>
					)}
				</div>

				{/* Sidebar - Order Summary */}
				<div className="space-y-6">
					<div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
						<h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-ink)]">
							Order Summary
						</h2>
						<div className="mt-4 space-y-2">
							<div className="flex justify-between text-sm">
								<span className="text-[var(--color-ink-muted)]">Subtotal</span>
								<span className="text-[var(--color-ink)]">{formatPrice(order.subtotal, currency)}</span>
							</div>
							{order.totalTax > 0 && (
								<div className="flex justify-between text-sm">
									<span className="text-[var(--color-ink-muted)]">Tax</span>
									<span className="text-[var(--color-ink)]">{formatPrice(order.totalTax, currency)}</span>
								</div>
							)}
							<div className="flex justify-between border-t border-[var(--color-line)] pt-2">
								<span className="text-sm font-semibold text-[var(--color-ink)]">Total</span>
								<span className="text-lg font-bold text-[var(--color-ink)]">
									{formatPrice(order.total, currency)}
								</span>
							</div>
						</div>

						{/* Payment details */}
						<div className="mt-4 space-y-2 border-t border-[var(--color-line)] pt-4">
							<div className="flex justify-between text-sm">
								<span className="text-[var(--color-ink-muted)]">Paid</span>
								<span className="text-[var(--color-ink)]">{formatPrice(order.paidTotal, currency)}</span>
							</div>
							{order.refundedTotal > 0 && (
								<div className="flex justify-between text-sm">
									<span className="text-[var(--color-ink-muted)]">Refunded</span>
									<span className="text-red-600">-{formatPrice(order.refundedTotal, currency)}</span>
								</div>
							)}
							{order.dueToPay > 0 && (
								<div className="flex justify-between text-sm">
									<span className="font-medium text-amber-600">Amount Due</span>
									<span className="font-medium text-amber-600">{formatPrice(order.dueToPay, currency)}</span>
								</div>
							)}
						</div>
					</div>

					<Link
						href="/book"
						className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface)]"
					>
						Book Another Court
					</Link>
				</div>
			</div>
		</div>
	);
}

function PaymentStatusBadge({ status }: { status: OrderDetailResponse['paymentStatus'] }) {
	const config: Record<string, { bg: string; text: string; label: string }> = {
		paid: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Paid' },
		unpaid: { bg: 'bg-amber-100', text: 'text-amber-300', label: 'Unpaid' },
		'partially-paid': { bg: 'bg-amber-100', text: 'text-amber-300', label: 'Partially Paid' },
	};
	const c = config[status] ?? { bg: 'bg-charcoal/10', text: 'text-[var(--color-ink)]', label: status };
	return (
		<span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${c.bg} ${c.text}`}>
			{c.label}
		</span>
	);
}

function FulfillmentStatusBadge({ status }: { status: OrderDetailResponse['fulfillmentStatus'] }) {
	const config: Record<string, { bg: string; text: string; label: string }> = {
		fulfilled: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Fulfilled' },
		unfulfilled: { bg: 'bg-charcoal/10', text: 'text-[var(--color-ink)]', label: 'Unfulfilled' },
		'partially-fulfilled': { bg: 'bg-amber-100', text: 'text-amber-300', label: 'Partially Fulfilled' },
	};
	const c = config[status] ?? { bg: 'bg-charcoal/10', text: 'text-[var(--color-ink)]', label: status };
	return (
		<span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${c.bg} ${c.text}`}>
			{c.label}
		</span>
	);
}

function RefundStatusBadge({ status }: { status: OrderDetailResponse['refundStatus'] }) {
	const config: Record<string, { bg: string; text: string; label: string }> = {
		'refund-owed': { bg: 'bg-red-100', text: 'text-red-300', label: 'Refund Owed' },
		'partially-refunded': { bg: 'bg-amber-100', text: 'text-amber-300', label: 'Partially Refunded' },
		'fully-refunded': { bg: 'bg-red-100', text: 'text-red-300', label: 'Fully Refunded' },
	};
	const c = config[status] ?? { bg: 'bg-charcoal/10', text: 'text-[var(--color-ink)]', label: status };
	return (
		<span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${c.bg} ${c.text}`}>
			{c.label}
		</span>
	);
}

function AppointmentStatusBadge({ status }: { status: AppointmentStatusType }) {
	const config: Record<string, { bg: string; text: string; label: string }> = {
		scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Scheduled' },
		completed: { bg: 'bg-charcoal/10', text: 'text-[var(--color-ink)]', label: 'Completed' },
		canceled: { bg: 'bg-red-100', text: 'text-red-300', label: 'Canceled' },
		pending: { bg: 'bg-amber-100', text: 'text-amber-300', label: 'Pending' },
	};
	const c = config[status] ?? { bg: 'bg-charcoal/10', text: 'text-[var(--color-ink)]', label: status };
	return (
		<span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${c.bg} ${c.text}`}>
			{c.label}
		</span>
	);
}
