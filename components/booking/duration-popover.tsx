'use client';

import { formatPrice } from '@/lib/format';
import type { DurationOption } from '@/hooks/use-court-grid';

function durationLabel(minutes: number): string {
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	if (h > 0 && m > 0) return `${h}h ${m}m`;
	if (h > 0) return `${h}h`;
	return `${m} min`;
}

/**
 * Anchored popover shown after a grid cell is clicked. Durations that fit from that
 * cell are *selected* (not booked) on click — hovering/selecting previews the spanned
 * slots on the grid via onHover/onPick, and a Confirm button commits the booking.
 */
export function DurationPopover({
	courtTitle,
	startLabel,
	options,
	currency,
	pickedUnits,
	onPick,
	onHover,
	onConfirm,
	onClose,
}: {
	courtTitle: string;
	startLabel: string;
	options: DurationOption[];
	currency: string | undefined;
	pickedUnits: number | null;
	onPick: (option: DurationOption) => void;
	onHover: (units: number | null) => void;
	onConfirm: () => void;
	onClose: () => void;
}) {
	const picked = options.find((o) => o.units === pickedUnits) ?? null;

	return (
		<div
			className="w-64 overflow-hidden rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-surface)] shadow-[0_16px_48px_-12px_rgba(0,0,0,0.7)]"
			onMouseLeave={() => onHover(null)}
		>
			<div className="flex items-start justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3">
				<div>
					<p className="text-sm font-semibold text-[var(--color-ink)]">{courtTitle}</p>
					<p className="mt-0.5 text-xs text-[var(--color-ink-dim)]">Starts {startLabel}</p>
				</div>
				<button
					type="button"
					onClick={onClose}
					aria-label="Close"
					className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--color-ink-dim)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
				>
					<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			<p className="px-4 pt-3 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-dim)]">
				Duration
			</p>
			<ul className="space-y-1.5 px-3 pb-2 pt-2">
				{options.map((opt) => {
					const isPicked = opt.units === pickedUnits;
					return (
						<li key={opt.units}>
							<button
								type="button"
								onClick={() => onPick(opt)}
								onMouseEnter={() => onHover(opt.units)}
								className={`flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-left transition-all ${
									isPicked
										? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15'
										: 'border-[var(--color-line-strong)] bg-[var(--color-bg)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10'
								}`}
							>
								<span className="heading-display text-sm text-[var(--color-ink)]">{durationLabel(opt.minutes)}</span>
								<span className="text-sm font-semibold text-[var(--color-primary)]">
									{formatPrice(opt.price, currency)}
								</span>
							</button>
						</li>
					);
				})}
			</ul>
			<div className="px-3 pb-3">
				<button
					type="button"
					disabled={!picked}
					onClick={onConfirm}
					className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-bright)] disabled:cursor-not-allowed disabled:opacity-40"
				>
					{picked ? `Confirm · ${durationLabel(picked.minutes)}` : 'Select a duration'}
					{picked ? (
						<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
						</svg>
					) : null}
				</button>
			</div>
		</div>
	);
}
