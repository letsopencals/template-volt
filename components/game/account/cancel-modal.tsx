'use client';

import { useState } from 'react';
import { at } from '@/lib/club';
import { gameName, type Game } from '@/lib/game';
import { BTN_GHOST, ErrorNote, Label } from '@/components/game/bits';
import { ModalShell } from '@/components/game/account/modal-shell';

export function CancelModal({ game: g, tz, onClose, onCanceled }: { game: Game; tz: string; onClose: () => void; onCanceled: () => void }) {
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');
	const from = Date.parse(g.from) / 60000;

	async function cancel() {
		setSubmitting(true);
		setError('');
		try {
			const res = await fetch(`/api/account/appointments/${g.id}/cancel`, { method: 'PUT' });
			if (res.ok) return onCanceled();
			const data = await res.json().catch(() => null);
			setError(data?.error ?? 'Couldn’t cancel the booking. Try again.');
		} catch {
			setError('Something went wrong. Try again.');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<ModalShell onClose={onClose} locked={submitting} label="Cancel booking">
			<Label className="text-[var(--color-primary)]">Cancel</Label>
			<p className="heading-display mt-2 text-2xl leading-tight text-[var(--color-ink)]">Cancel this booking?</p>
			<p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-muted)]">
				{gameName(g)} at {g.clubTitle}, {at(from, tz, 'dddd D MMMM')} at {at(from, tz, 'HH:mm')} goes back on the board for others.
				{g.crew.length ? ` Let ${g.crew.join(', ')} know.` : ''} This can’t be undone.
			</p>
			{error ? (
				<div className="mt-4">
					<ErrorNote>{error}</ErrorNote>
				</div>
			) : null}
			<div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
				<button type="button" className={`${BTN_GHOST} flex-1`} disabled={submitting} onClick={onClose}>
					Keep it
				</button>
				<button
					type="button"
					disabled={submitting}
					onClick={cancel}
					className="inline-flex flex-1 items-center justify-center rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-40"
				>
					{submitting ? 'Cancelling…' : 'Cancel booking'}
				</button>
			</div>
		</ModalShell>
	);
}
