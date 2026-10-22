'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { clsx } from 'clsx';
import type { OrderListItemResponse, CollectionMeta, OrderListLineItem } from '@opencals/storefront-sdk';
import { fetcher } from '@/lib/fetcher';
import { formatPrice } from '@/lib/format';
import { useDateFormatter } from '@/hooks/use-date-formatter';
import { BTN, BTN_GHOST, Label } from '@/components/game/bits';

// The SDK OrderListItemResponse type is missing `id` but it's returned by the API
type OrderWithId = OrderListItemResponse & { id: string };

const STATUS: Record<string, { label: string; tone: string }> = {
	paid: { label: 'Paid', tone: 'border-emerald-500/40 text-emerald-400' },
	unpaid: { label: 'Pay at club', tone: 'border-[var(--color-primary)]/50 text-[var(--color-primary)]' },
	'partially-paid': { label: 'Part paid', tone: 'border-amber-500/40 text-amber-300' },
};

/** Orders as receipts: date block, what was booked, total and payment state. */
export default function OrdersPage() {
	const [page, setPage] = useState(1);
	const { data, isLoading } = useSWR<{ data: OrderWithId[]; meta: CollectionMeta }>(`/api/account/orders?take=10&page=${page}`, fetcher, {
		revalidateOnFocus: false,
		keepPreviousData: true,
	});
	const { formatCustom } = useDateFormatter();
	const orders = data?.data ?? [];
	const meta = data?.meta ?? null;

	return (
		<div>
			<h2 className="heading-display text-3xl text-[var(--color-ink)]">Orders</h2>
			<p className="mt-2 text-sm text-[var(--color-ink-muted)]">Every booking you’ve paid for or will pay at the club.</p>

			{isLoading && !data ? (
				<div className="mt-8 space-y-3">
					{[0, 1, 2, 3].map((i) => (
						<div key={i} className="h-24 animate-pulse rounded-[24px] bg-[var(--color-surface)]" />
					))}
				</div>
			) : orders.length === 0 ? (
				<div className="mt-8 flex flex-col items-start gap-4 rounded-[28px] border border-[var(--color-line)] bg-[var(--color-surface)] px-6 py-10">
					<Label className="text-[var(--color-primary)]">No orders yet</Label>
					<p className="text-sm text-[var(--color-ink-muted)]">Your first booking will show up here.</p>
					<Link href="/book" className={BTN}>
						Book a court
					</Link>
				</div>
			) : (
				<>
					<ul className="mt-8 space-y-3">
						{orders.map((order) => {
							const s = STATUS[order.paymentStatus] ?? { label: order.paymentStatus, tone: 'border-[var(--color-line-strong)] text-[var(--color-ink-muted)]' };
							return (
								<li key={order.id}>
									<Link
										href={`/account/orders/${order.id}`}
										className="flex items-center gap-5 rounded-[24px] border border-[var(--color-line)] bg-[var(--color-surface)] px-5 py-4 transition-colors hover:border-[var(--color-primary)]/50"
									>
										<span className="w-12 shrink-0 text-center">
											<span className="heading-display block text-2xl leading-none text-[var(--color-ink)]">{formatCustom(order.createdAt, 'D')}</span>
											<Label className="text-[var(--color-ink-dim)]">{formatCustom(order.createdAt, 'MMM')}</Label>
										</span>
										<span className="min-w-0 flex-1">
											<Label className="text-[var(--color-ink-dim)]">Order #{order.name}</Label>
											<span className="mt-1 block truncate text-sm font-semibold text-[var(--color-ink)]">
												{(order.lineItems ?? [])
													.map((item: OrderListLineItem) => [item.appointment?.product?.title, item.appointment?.product?.variantTitle].filter(Boolean).join(' · ') || 'Booking')
													.join(', ')}
											</span>
										</span>
										<span className="shrink-0 text-right">
											<span className="heading-display block text-lg tabular-nums text-[var(--color-ink)]">{formatPrice(order.total, order.paymentCurrencyCode)}</span>
											<Label className={clsx('mt-1 inline-block rounded-full border px-2 py-0.5', s.tone)}>{s.label}</Label>
										</span>
									</Link>
								</li>
							);
						})}
					</ul>

					{meta && meta.pageCount > 1 ? (
						<div className="mt-6 flex items-center justify-center gap-3">
							<button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className={BTN_GHOST}>
								Previous
							</button>
							<Label className="text-[var(--color-ink-dim)]">
								{meta.page} / {meta.pageCount}
							</Label>
							<button type="button" onClick={() => setPage((p) => Math.min(meta.pageCount, p + 1))} disabled={page >= meta.pageCount} className={BTN_GHOST}>
								Next
							</button>
						</div>
					) : null}
				</>
			)}
		</div>
	);
}
