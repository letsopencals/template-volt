'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { clsx } from 'clsx';
import type { CurrentAvailabilitySlot } from '@opencals/storefront-sdk';
import { fetcher } from '@/lib/fetcher';
import { at, formatLength, nextDays, todayIn, WINDOW_DAYS } from '@/lib/club';
import { gameName, type Game } from '@/lib/game';
import { slotIso } from '@/hooks/use-game-booking';
import { DayStrip } from '@/components/book/book-controls';
import { BTN, BTN_GHOST, ErrorNote, Label } from '@/components/game/bits';
import { ModalShell } from '@/components/game/account/modal-shell';

const isoMin = (iso: string) => Date.parse(iso) / 60000;

/**
 * Move a game to another day or time: same court (or session), same length. Slots come from `/api/availability`
 * with `duration` for courts (the booked length) and `excludeAppointmentId`, so the game doesn't block itself.
 */
export function RescheduleModal({ game: g, tz, onClose, onRescheduled }: { game: Game; tz: string; onClose: () => void; onRescheduled: () => void }) {
	const today = useMemo(() => todayIn(tz), [tz]);
	const days = useMemo(() => nextDays(today, WINDOW_DAYS), [today]);
	const allDays = useMemo(() => new Set(days), [days]);
	const booked = at(isoMin(g.from), tz, 'YYYY-MM-DD');
	const [date, setDate] = useState<string>(() => (booked >= today ? booked : today));
	const [slot, setSlot] = useState<CurrentAvailabilitySlot | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');

	const key = useMemo(() => {
		const p = new URLSearchParams({ productId: g.productId, date, timezone: tz, excludeAppointmentId: g.id });
		if (g.custom) p.set('duration', String(g.minutes * 60));
		if (g.staffMemberId) p.set('staffMemberId', g.staffMemberId);
		if (g.locationId) p.set('locationId', g.locationId);
		return `/api/availability?${p}`;
	}, [g.productId, g.id, g.staffMemberId, g.locationId, g.custom, g.minutes, date, tz]);
	const { data, error: loadError, isLoading } = useSWR<CurrentAvailabilitySlot[]>(key, fetcher, { revalidateOnFocus: false });
	const need = g.kind === 'court' ? 1 : g.seats;
	const slots = useMemo(
		() => (data ?? []).filter((s) => s.maxAttendees - s.attendees >= need && Date.parse(slotIso(s)) > Date.now() && slotIso(s) !== new Date(g.from).toISOString()),
		[data, need, g.from],
	);

	async function confirm() {
		if (!slot) return;
		setSubmitting(true);
		setError('');
		try {
			const res = await fetch(`/api/account/appointments/${g.id}/reschedule`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					slot: {
						productId: g.productId,
						fromDate: slot.fromDate,
						fromTime: slot.fromTime,
						toDate: slot.toDate,
						toTime: slot.toTime,
						staffMemberId: slot.staffMemberIds?.[0] ?? g.staffMemberId ?? null,
						locationId: slot.locationIds?.[0] ?? g.locationId ?? null,
					},
				}),
			});
			if (res.ok) return onRescheduled();
			const body = await res.json().catch(() => null);
			setError(body?.error ?? 'That time was just taken. Pick another one.');
		} catch {
			setError('Something went wrong. Try again.');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<ModalShell onClose={onClose} locked={submitting} wide label="Change time">
			<Label className="text-[var(--color-primary)]">Change time</Label>
			<p className="heading-display mt-2 text-2xl leading-tight text-[var(--color-ink)]">
				{gameName(g)}, {g.clubTitle}
			</p>
			<p className="mt-2 text-sm text-[var(--color-ink-muted)]">
				{g.kind === 'court' ? 'Same court, ' : ''}
				{formatLength(g.minutes)}. Now: {at(isoMin(g.from), tz, 'ddd D MMM, HH:mm')}.
			</p>

			<div className="mt-6">
				<DayStrip
					days={days}
					date={date}
					today={today}
					open={allDays}
					known={false}
					onChange={(d) => {
						setDate(d);
						setSlot(null);
					}}
				/>
			</div>

			<div className="mt-5 min-h-[120px]">
				{isLoading ? (
					<div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
						{Array.from({ length: 10 }, (_, i) => (
							<div key={i} className="h-12 animate-pulse rounded-xl bg-[var(--color-surface-2)]" />
						))}
					</div>
				) : loadError ? (
					<ErrorNote>Couldn’t load the times. Try again, or pick another day.</ErrorNote>
				) : slots.length === 0 ? (
					<p className="rounded-2xl border border-[var(--color-line)] px-5 py-8 text-center text-sm text-[var(--color-ink-muted)]">No free times on this day. Pick another one.</p>
				) : (
					<div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
						{slots.map((x) => (
							<button
								key={slotIso(x)}
								type="button"
								aria-pressed={slot === x}
								onClick={() => setSlot(x)}
								className={clsx(
									'heading-display rounded-xl border py-3 text-base tabular-nums transition-colors',
									slot === x ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-[var(--color-ink)]' : 'border-[var(--color-line-strong)] text-[var(--color-ink)] hover:border-[var(--color-primary)]',
								)}
							>
								{at(isoMin(slotIso(x)), tz, 'HH:mm')}
							</button>
						))}
					</div>
				)}
			</div>

			{slot ? (
				<p className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-[var(--color-surface-2)] px-5 py-4 text-sm text-[var(--color-ink)]">
					<span className="line-through opacity-60">{at(isoMin(g.from), tz, 'ddd D MMM, HH:mm')}</span>
					<span aria-hidden>→</span>
					<span className="font-semibold text-[var(--color-primary)]">{at(isoMin(slotIso(slot)), tz, 'ddd D MMM, HH:mm')}</span>
				</p>
			) : null}

			{error ? (
				<div className="mt-4">
					<ErrorNote>{error}</ErrorNote>
				</div>
			) : null}

			<div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
				<button type="button" className={`${BTN_GHOST} flex-1`} disabled={submitting} onClick={onClose}>
					Keep this time
				</button>
				<button type="button" className={`${BTN} flex-1`} disabled={!slot || submitting} onClick={confirm}>
					{submitting ? 'Moving…' : 'Move it'}
				</button>
			</div>
		</ModalShell>
	);
}
