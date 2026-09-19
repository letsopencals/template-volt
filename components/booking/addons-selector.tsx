'use client';

import type { AddOnListItemResponse } from '@opencals/storefront-sdk';
import { formatPrice } from '@/lib/format';

interface AddOnsSelectorProps {
	addOns: AddOnListItemResponse[];
	loading: boolean;
	selected: Map<string, number>;
	bookedDurationUnits: number;
	currency?: string;
	onChange: (addOnId: string, quantity: number) => void;
}

export function AddOnsSelector({
	addOns,
	loading,
	selected,
	bookedDurationUnits,
	currency,
	onChange,
}: AddOnsSelectorProps) {
	if (loading) {
		return (
			<div className="rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6 card-shadow">
				<p className="text-base font-semibold text-[var(--color-ink)]">Add to your visit</p>
				<div className="mt-5 space-y-2">
					<div className="h-16 animate-pulse rounded-lg bg-[var(--color-surface-2)]/40" />
					<div className="h-16 animate-pulse rounded-lg bg-[var(--color-surface-2)]/40" />
					<div className="h-16 animate-pulse rounded-lg bg-[var(--color-surface-2)]/40" />
				</div>
			</div>
		);
	}

	if (addOns.length === 0) {
		return (
			<div className="rounded-2xl border border-dashed border-[var(--color-line)] bg-[var(--color-surface)] p-8 text-center">
				<p className="text-sm text-[var(--color-ink-muted)]">No add-ons available for this service.</p>
				<p className="mt-1 text-xs text-[var(--color-ink-dim)]">Continue to review your booking.</p>
			</div>
		);
	}

	return (
		<div className="overflow-hidden rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] card-shadow">
			<div className="border-b border-[var(--color-line)] px-6 py-5">
				<p className="text-base font-semibold text-[var(--color-ink)]">Add to your visit</p>
				<p className="mt-1 text-sm text-[var(--color-ink-dim)]">
					Optional extras — skip to continue without any.
				</p>
			</div>
			<ul className="divide-y divide-[var(--color-line)]">
				{addOns.map((addOn) => {
					const qty = selected.get(addOn.id) ?? 0;
					const isSelected = qty > 0;
					const isDuration = addOn.durationMultiplied;
					const displayPrice = isDuration ? addOn.price * bookedDurationUnits : addOn.price;
					const atMax =
						!isDuration && addOn.maxQuantity != null && qty >= addOn.maxQuantity;

					return (
						<li
							key={addOn.id}
							className={`flex items-start justify-between gap-4 px-5 py-4 transition-colors ${
								isSelected ? 'bg-[var(--color-primary)]/8' : ''
							}`}
						>
							<div className="min-w-0 flex-1">
								<p className="text-base font-semibold text-[var(--color-ink)]">
									{addOn.title ?? addOn.slug}
								</p>
								{addOn.description && (
									<p className="mt-1 text-xs text-[var(--color-ink-muted)]">{addOn.description}</p>
								)}
								<p className="mt-2 text-sm">
									<span className="font-semibold text-[var(--color-primary)]">
										{formatPrice(displayPrice, currency)}
									</span>
									{isDuration && (
										<span className="ml-2 text-[0.65rem] uppercase tracking-[0.18em] text-[var(--color-ink-dim)]">
											{formatPrice(addOn.price, currency)} × {bookedDurationUnits}
										</span>
									)}
								</p>
							</div>

							<div className="flex shrink-0 items-center gap-1">
								{isDuration ? (
									<button
										type="button"
										onClick={() => onChange(addOn.id, isSelected ? 0 : 1)}
										className={`rounded-full border px-5 py-2 text-xs font-semibold transition-all ${
											isSelected
												? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
												: 'border-[var(--color-line-strong)] text-[var(--color-ink)] hover:border-[var(--color-primary)]/60'
										}`}
									>
										{isSelected ? 'Added' : 'Add'}
									</button>
								) : isSelected ? (
									<>
										<button
											type="button"
											onClick={() => onChange(addOn.id, qty - 1)}
											className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-line-strong)] text-[var(--color-ink)] transition-colors hover:border-[var(--color-primary)]"
											aria-label="Decrease quantity"
										>
											<svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
												<path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
											</svg>
										</button>
										<span className="w-7 text-center text-sm font-semibold text-[var(--color-ink)]">{qty}</span>
										<button
											type="button"
											disabled={atMax}
											onClick={() => onChange(addOn.id, qty + 1)}
											className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-line-strong)] text-[var(--color-ink)] transition-colors hover:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-30"
											aria-label="Increase quantity"
										>
											<svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
												<path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
											</svg>
										</button>
									</>
								) : (
									<button
										type="button"
										onClick={() => onChange(addOn.id, 1)}
										className="rounded-full border border-[var(--color-line-strong)] px-5 py-2 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
									>
										Add
									</button>
								)}
							</div>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
