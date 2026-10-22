'use client';

import { clsx } from 'clsx';
import { formatPrice } from '@/lib/format';
import type { GameBooking } from '@/hooks/use-game-booking';
import { BTN, Counter } from '@/components/game/bits';

function KitIcon({ slug }: { slug: string }) {
	const ball = /ball/i.test(slug);
	return (
		<span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-tint)]" aria-hidden>
			{ball ? (
				<svg viewBox="0 0 48 48" className="h-7 w-7 text-[var(--color-primary)]" fill="none" stroke="currentColor" strokeWidth="2.2">
					<circle cx="24" cy="24" r="14" />
					<path d="M12 18c6 3 6 9 0 12M36 18c-6 3-6 9 0 12" />
				</svg>
			) : (
				<svg viewBox="0 0 48 48" className="h-8 w-8 text-[var(--color-primary)]" fill="none" stroke="currentColor" strokeWidth="2.2">
					<path d="M24 5c8 0 13 6 13 13.5S31 31 24 31s-13-5-13-12.5S16 5 24 5z" />
					<path d="M21 31l-1 12h8l-1-12" strokeLinejoin="round" />
					<circle cx="20" cy="15" r="1.3" fill="currentColor" stroke="none" />
					<circle cx="28" cy="15" r="1.3" fill="currentColor" stroke="none" />
					<circle cx="24" cy="20" r="1.3" fill="currentColor" stroke="none" />
				</svg>
			)}
		</span>
	);
}

/** "Kit": the store's add-ons for this court or session (rackets, balls, towels…), paid with the game. Skippable. */
export function KitStep({ b }: { b: GameBooking }) {
	const { availableAddOns, addOnsLoading, selectedAddOns, updateQuantity } = b.addOns;
	const any = selectedAddOns.size > 0;

	if (addOnsLoading) {
		return (
			<div className="space-y-2" aria-busy>
				{[0, 1, 2].map((i) => (
					<div key={i} className="h-20 animate-pulse rounded-2xl bg-[var(--color-surface-2)]" />
				))}
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{availableAddOns.length === 0 ? (
				<p className="text-sm text-[var(--color-ink-muted)]">Nothing extra to add for this booking. Bring your own kit, or ask at reception.</p>
			) : (
				<div className="space-y-2">
					{availableAddOns.map((a) => {
						const q = selectedAddOns.get(a.id) ?? 0;
						const unit = a.durationMultiplied ? a.price * b.units : a.price;
						return (
							<div
								key={a.id}
								className={clsx(
									'flex flex-wrap items-center gap-4 rounded-2xl border px-5 py-4 transition-colors',
									q > 0 ? 'border-[var(--color-primary)]/70 bg-[var(--color-tint)]' : 'border-[var(--color-line-strong)]',
								)}
							>
								<KitIcon slug={a.slug} />
								<div className="min-w-0 flex-1">
									<p className="font-semibold text-[var(--color-ink)]">{a.title ?? a.slug}</p>
									{a.description ? <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{a.description}</p> : null}
								</div>
								<span className="text-sm font-semibold tabular-nums text-[var(--color-ink)]">
									{formatPrice(unit, b.currency)}
									<span className="text-xs font-normal text-[var(--color-ink-dim)]">{a.durationMultiplied ? ' / game' : ' each'}</span>
								</span>
								{q === 0 ? (
									<button
										type="button"
										onClick={() => updateQuantity(a.id, 1)}
										className="rounded-full border border-[var(--color-line-strong)] px-4 py-2 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
									>
										Add
									</button>
								) : a.durationMultiplied ? (
									<button type="button" onClick={() => updateQuantity(a.id, 0)} className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-black">
										Added ✓
									</button>
								) : (
									<Counter value={q} min={0} max={a.maxQuantity ?? 4} onChange={(v) => updateQuantity(a.id, v)} label={a.title ?? a.slug} />
								)}
							</div>
						);
					})}
				</div>
			)}
			<div className="flex flex-wrap items-center gap-5">
				<button type="button" className={BTN} onClick={b.next}>
					{any ? 'Continue' : 'We have our own kit'}
				</button>
				{any ? <p className="text-xs text-[var(--color-ink-dim)]">Your kit will be waiting at reception.</p> : null}
			</div>
		</div>
	);
}
