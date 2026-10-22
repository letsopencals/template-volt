'use client';

import { memo, useMemo } from 'react';
import moment from 'moment-timezone';
import { clsx } from 'clsx';
import type { CurrentAvailabilitySlot } from '@opencals/storefront-sdk';
import { formatPrice } from '@/lib/format';
import { at, nextDays, WINDOW_DAYS } from '@/lib/club';
import { slotIso, type GameBooking } from '@/hooks/use-game-booking';
import { DayStrip } from '@/components/book/book-controls';
import { BTN, Counter, ErrorNote, Label } from '@/components/game/bits';

const chip = (on: boolean) =>
	clsx(
		'rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
		on ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-[var(--color-line-strong)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]',
	);

/**
 * Step 1 for a training: the level (variants), the club and the coach ("Any coach" or one), then a day and a
 * start from the coach's free hours. Group classes show places left and how many you're booking.
 */
export function SessionStep({ b }: { b: GameBooking }) {
	const days = useMemo(() => nextDays(b.today, WINDOW_DAYS), [b.today]);
	const allDays = useMemo(() => new Set(days), [days]);
	const group = (b.variant?.maxAttendees ?? 1) > 1;

	return (
		<div className="space-y-7">
			{b.variants.length > 1 ? (
				<div>
					<Label className="mb-3 block text-[var(--color-ink-dim)]">Level</Label>
					<div className="flex flex-wrap gap-2">
						{b.variants.map((v) => (
							<button key={v.id} type="button" onClick={() => b.setVariantId(v.id)} className={chip(v.id === b.variant?.id)}>
								{v.variantTitle || v.title} · {formatPrice(v.price, b.currency)}
							</button>
						))}
					</div>
				</div>
			) : null}

			{b.trainingClubs.length > 1 ? (
				<div>
					<Label className="mb-3 block text-[var(--color-ink-dim)]">Club</Label>
					<div className="flex flex-wrap gap-2">
						{b.trainingClubs.map((c) => (
							<button key={c.id} type="button" onClick={() => b.chooseClub(c.id)} className={chip(c.id === b.club?.id)}>
								{c.name}
							</button>
						))}
					</div>
				</div>
			) : null}

			{b.coaches.length > 0 ? (
				<div>
					<Label className="mb-3 block text-[var(--color-ink-dim)]">Coach</Label>
					<div className="flex flex-wrap gap-2">
						<button type="button" onClick={() => b.chooseCoach(null)} className={chip(b.coachId === null)}>
							Any coach
						</button>
						{b.coaches.map((s) => (
							<button key={s.id} type="button" onClick={() => b.chooseCoach(s.id)} className={chip(b.coachId === s.id)}>
								{[s.firstName, s.lastName].filter(Boolean).join(' ')}
							</button>
						))}
					</div>
				</div>
			) : null}

			<div>
				<Label className="mb-3 block text-[var(--color-ink-dim)]">Day</Label>
				<DayStrip days={days} date={b.date} today={b.today} open={allDays} known={false} onChange={b.setDate} />
			</div>

			<div>
				<Label className="mb-3 block text-[var(--color-ink-dim)]">Start</Label>
				{b.slotsLoading ? (
					<div className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-busy>
						{Array.from({ length: 6 }, (_, i) => (
							<div key={i} className="h-14 animate-pulse rounded-xl bg-[var(--color-surface-2)]" />
						))}
					</div>
				) : b.slotsError ? (
					<ErrorNote>Couldn’t load the times. Try again, or pick another day.</ErrorNote>
				) : b.sessionSlots.length === 0 ? (
					<p className="rounded-2xl border border-[var(--color-line)] px-5 py-6 text-sm text-[var(--color-ink-muted)]">
						No free starts on {moment(b.date).format('dddd D MMM')}. Try another day{b.coachId ? ' or any coach' : ''}.
					</p>
				) : (
					<div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
						{b.sessionSlots.map((s) => (
							<SlotChip key={slotIso(s) + (s.staffMemberIds?.[0] ?? '')} slot={s} tz={b.tz} group={group} selected={b.slot === s} onSelect={b.setSlot} />
						))}
					</div>
				)}
			</div>

			{group && b.slot ? (
				<div className="flex flex-wrap items-center gap-4 rounded-2xl bg-[var(--color-surface-2)] px-5 py-4">
					<p className="text-sm text-[var(--color-ink)]">
						Places <span className="text-[var(--color-ink-dim)]">· {b.spaces} left</span>
					</p>
					<Counter value={b.places} min={1} max={b.spaces} onChange={b.setPlaces} label="places" />
				</div>
			) : null}

			<button type="button" className={BTN} disabled={!b.slot} onClick={b.next}>
				Continue
			</button>
		</div>
	);
}

const SlotChip = memo(function SlotChip({
	slot,
	tz,
	group,
	selected,
	onSelect,
}: {
	slot: CurrentAvailabilitySlot;
	tz: string;
	group: boolean;
	selected: boolean;
	onSelect: (s: CurrentAvailabilitySlot) => void;
}) {
	const left = slot.maxAttendees - slot.attendees;
	return (
		<button
			type="button"
			aria-pressed={selected}
			onClick={() => onSelect(slot)}
			className={clsx(
				'flex flex-col items-center rounded-xl border px-2 py-2.5 transition-colors',
				selected ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15' : 'border-[var(--color-line-strong)] hover:border-[var(--color-primary)]',
			)}
		>
			<span className="heading-display text-base tabular-nums text-[var(--color-ink)]">{at(Date.parse(slotIso(slot)) / 60000, tz, 'HH:mm')}</span>
			{group ? <span className={clsx('text-[0.68rem] font-semibold', left <= 2 ? 'text-[var(--color-primary)]' : 'text-[var(--color-ink-dim)]')}>{left} left</span> : null}
		</button>
	);
});
