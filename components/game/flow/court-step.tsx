'use client';

import { memo } from 'react';
import { clsx } from 'clsx';
import { formatPrice } from '@/lib/format';
import { formatLabel, playersOn, sportOf } from '@/lib/club';
import type { CourtChoice, GameBooking } from '@/hooks/use-game-booking';
import { BTN, CourtGlyph, Label } from '@/components/game/bits';

/**
 * Step 1 for a court: "Any court" (the best free one, and if it goes we take the next) or a specific one. Every
 * court free at that start is a tile with its format and its price for the game.
 */
export function CourtStep({ b }: { b: GameBooking }) {
	const best = b.choices[0];
	const currency = b.currency;
	return (
		<div className="space-y-6">
			{b.choices.length > 1 ? (
				<button
					type="button"
					onClick={() => b.setCourtId(null)}
					aria-pressed={b.courtId === null}
					className={clsx(
						'flex w-full items-center gap-5 rounded-2xl border p-5 text-left transition-colors',
						b.courtId === null ? 'border-[var(--color-primary)] bg-[var(--color-tint)]' : 'border-[var(--color-line-strong)] hover:border-[var(--color-primary)]/60',
					)}
				>
					<span className="grid grid-cols-2 gap-1" aria-hidden>
						{[0, 1, 2, 3].map((i) => (
							<CourtGlyph key={i} lit={b.courtId === null && i === 0} className="h-5 w-10" />
						))}
					</span>
					<span className="min-w-0 flex-1">
						<span className="heading-display block text-lg text-[var(--color-ink)]">Any court</span>
						<span className="mt-1 block text-sm text-[var(--color-ink-muted)]">
							{b.choices.length} courts free for your game. We book the best one, and if it goes, the next.
						</span>
					</span>
					{best ? (
						<span className="text-right">
							<span className="block text-lg font-semibold tabular-nums text-[var(--color-ink)]">{formatPrice(best.price, currency)}</span>
							<span className="block text-xs text-[var(--color-ink-dim)]">{formatPrice(best.price / playersOn(best.court), currency)} each</span>
						</span>
					) : null}
				</button>
			) : null}

			<div>
				<Label className="mb-3 block text-[var(--color-ink-dim)]">{b.choices.length > 1 ? 'Or pick a court' : 'Your court'}</Label>
				<div className="grid gap-2 sm:grid-cols-2">
					{b.choices.map((c) => (
						<CourtTile key={c.court.id} choice={c} currency={currency} selected={b.courtId === c.court.id || (b.choices.length === 1)} onSelect={b.setCourtId} />
					))}
				</div>
			</div>

			<button type="button" className={BTN} onClick={b.next}>
				Continue
			</button>
		</div>
	);
}

const CourtTile = memo(function CourtTile({ choice, selected, currency, onSelect }: { choice: CourtChoice; selected: boolean; currency: string | undefined; onSelect: (id: string) => void }) {
	const { court } = choice;
	const singles = court.format === 'singles';
	return (
		<button
			type="button"
			aria-pressed={selected}
			onClick={() => onSelect(court.id)}
			className={clsx(
				'flex items-center gap-4 rounded-2xl border p-4 text-left transition-colors',
				selected ? 'border-[var(--color-primary)] bg-[var(--color-tint)]' : 'border-[var(--color-line-strong)] hover:border-[var(--color-primary)]/60',
			)}
		>
			<CourtGlyph lit={selected} singles={singles} squash={court.sport === 'squash'} className="h-9 w-[4.5rem] shrink-0" />
			<span className="min-w-0 flex-1">
				<span className="heading-display block text-base text-[var(--color-ink)]">Court {court.number}</span>
				<span className="mt-0.5 block text-xs text-[var(--color-ink-muted)]">
					{[sportOf(court.sport).label, formatLabel(court), `${playersOn(court)} players`].filter(Boolean).join(' · ')}
				</span>
			</span>
			<span className="text-right text-base font-semibold tabular-nums text-[var(--color-ink)]">{formatPrice(choice.price, currency)}</span>
		</button>
	);
});
