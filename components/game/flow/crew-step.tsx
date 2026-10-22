'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { clsx } from 'clsx';
import { formatPrice } from '@/lib/format';
import type { GameBooking } from '@/hooks/use-game-booking';
import { BTN, Monogram } from '@/components/game/bits';

/**
 * Step 2 for a court: "Your crew". The court as four places (two for singles): you, then up to three players by
 * first name. An email invites them (they get the booking emails); names travel with the booking so the ticket
 * shows who's playing. Each player's share of the court is shown, so splitting it is one glance.
 */
export function CrewStep({ b }: { b: GameBooking }) {
	const slots = Math.max(0, b.onCourt - 1);
	const crew = Array.from({ length: slots }, (_, i) => b.crew[i] ?? { name: '', email: '' });
	const set = (i: number, field: 'name' | 'email', v: string) => b.setCrew(crew.map((c, j) => (j === i ? { ...c, [field]: v } : c)));
	const me = b.firstName || 'You';

	return (
		<div className="space-y-6">
			<div className="grid gap-2 sm:grid-cols-2">
				<div className="flex items-center gap-4 rounded-2xl border border-[var(--color-primary)]/60 bg-[var(--color-tint)] p-4">
					<Monogram name={me} tone="orange" />
					<div>
						<p className="heading-display text-base leading-none text-[var(--color-ink)]">{me}</p>
						<p className="mt-1 text-xs text-[var(--color-ink-dim)]">Booking the court</p>
					</div>
				</div>
				{crew.map((c, i) => (
					<div key={i} className="rounded-2xl border border-[var(--color-line-strong)] p-4">
						<div className="flex items-center gap-3">
							<AnimatePresence mode="popLayout" initial={false}>
								{c.name.trim() ? (
									<motion.span key="m" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
										<Monogram name={c.name} />
									</motion.span>
								) : (
									<motion.span
										key="e"
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										className="flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-[var(--color-line-strong)] font-mono text-xs text-[var(--color-ink-dim)]"
									>
										{i + 2}
									</motion.span>
								)}
							</AnimatePresence>
							<input
								value={c.name}
								onChange={(e) => set(i, 'name', e.target.value)}
								placeholder={`Player ${i + 2}`}
								aria-label={`Player ${i + 2} first name`}
								className="h-11 min-w-0 flex-1 border-b border-[var(--color-line)] bg-transparent text-[15px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-dim)] focus:border-[var(--color-primary)]"
							/>
						</div>
						<input
							type="email"
							value={c.email}
							onChange={(e) => set(i, 'email', e.target.value)}
							placeholder="Email (we'll send them the booking)"
							aria-label={`Player ${i + 2} email`}
							className={clsx(
								'mt-2 h-9 w-full bg-transparent pl-[3.5rem] text-[13px] text-[var(--color-ink-muted)] outline-none placeholder:text-[var(--color-ink-dim)]',
								!c.name.trim() && 'pointer-events-none opacity-40',
							)}
						/>
					</div>
				))}
			</div>

			<div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[var(--color-surface-2)] px-5 py-4">
				<p className="text-sm text-[var(--color-ink)]">
					Split {b.onCourt} ways: <strong className="text-[var(--color-primary)]">{formatPrice(b.each ?? 0, b.currency)} each</strong>. The price is for the
					whole court, however many play.
				</p>
				<p className="text-xs text-[var(--color-ink-dim)]">You pay for the court now. Invited players get the booking by email.</p>
			</div>

			<div className="flex flex-wrap items-center gap-5">
				<button type="button" className={BTN} onClick={b.next}>
					{b.crew.some((c) => c.name.trim()) ? 'Continue' : 'Continue without names'}
				</button>
				<p className="text-xs text-[var(--color-ink-dim)]">You can add your crew later from your account.</p>
			</div>
		</div>
	);
}
