'use client';

import { memo } from 'react';
import Image from 'next/image';
import { clsx } from 'clsx';
import { at, formatLength, sportOf } from '@/lib/club';
import { playersOnCourt, spotsOf, type Game } from '@/lib/game';
import { initials, Label } from '@/components/game/bits';

interface Props {
	game: Game;
	tz: string;
	/** Name on the first spot (the booker) */
	me?: string | null;
	/** Live countdown (ms until the start); null hides it */
	until?: number | null;
	compact?: boolean;
	badge?: string | null;
}

const isoMin = (iso: string) => Date.parse(iso) / 60000;

/**
 * The match ticket. Courts are drawn from above with a spot per player (the booker and their crew by initials,
 * open spots dashed; four for doubles, two for singles, the squash court shape for squash); then day / time /
 * length / players / booking ref / kit in a ruled grid, and a countdown. Trainings get the same ticket with the
 * club photo in place of the court.
 */
export const MatchTicket = memo(function MatchTicket({ game: g, tz, me, until, compact, badge }: Props) {
	const court = g.kind === 'court';
	const faded = g.status === 'canceled';
	const spots = spotsOf(g);
	const names = [me || 'You', ...g.crew];
	const from = isoMin(g.from);
	return (
		<article
			className={clsx('overflow-hidden rounded-[28px] border border-[var(--color-line)] bg-[var(--color-surface)] text-white', faded && 'opacity-60')}
			aria-label={`${g.title}, ${g.clubTitle}, ${at(from, tz, 'dddd D MMMM, HH:mm')}`}
		>
			<div className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] px-5 py-3">
				<Label className="truncate text-white/55">{g.clubTitle}</Label>
				<span className="flex shrink-0 items-center gap-2">
					{badge ? <Label className="rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-black">{badge}</Label> : null}
					<Label className="text-[var(--color-primary)]">{court ? sportOf(g.sport).label : 'Training'}</Label>
				</span>
			</div>

			<div className={clsx('grid', !compact && 'md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]')}>
				{!compact ? (
					<div className="border-b border-[var(--color-line)] p-5 md:border-b-0 md:border-r">
						{court ? (
							<CourtFromAbove spots={spots} names={names} squash={g.sport === 'squash'} />
						) : g.clubImage ? (
							<div className="relative aspect-[2/1] w-full overflow-hidden rounded-[18px]">
								<Image src={`/images/${g.clubImage}`} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover opacity-80" />
								<span className="absolute inset-0 bg-gradient-to-b from-transparent to-black/85" />
								<Label className="absolute bottom-3 left-4 text-white">{g.detail}</Label>
							</div>
						) : null}
						{court ? (
							<p className="mt-3 flex flex-wrap gap-1.5">
								{g.format && sportOf(g.sport).fixedPlayers == null ? (
									<Label className="rounded-full border border-[var(--color-primary)]/50 px-2.5 py-1 text-[var(--color-primary)]">{g.format === 'singles' ? 'Singles' : 'Doubles'}</Label>
								) : null}
								<Label className="rounded-full border border-white/15 px-2.5 py-1 text-white/60">{spots} players</Label>
							</p>
						) : null}
					</div>
				) : null}

				<div className="flex flex-col">
					<div className="px-5 pb-4 pt-5">
						<p className={clsx('heading-display leading-tight', compact ? 'text-xl' : 'text-3xl md:text-4xl', faded && 'line-through decoration-2')}>{g.title}</p>
						<p className="mt-2 text-sm text-white/60">{g.coach ? `Coach: ${g.coach} · ${g.detail}` : g.detail}</p>
					</div>
					<dl className="mt-1 grid grid-cols-2 border-t border-[var(--color-line)] sm:grid-cols-3">
						<Cell label="Day">{at(from, tz, 'ddd D MMM')}</Cell>
						<Cell label="Time">
							{at(from, tz, 'HH:mm')}–{at(isoMin(g.to), tz, 'HH:mm')}
						</Cell>
						<Cell label="Length" wide>
							{formatLength(g.minutes)}
						</Cell>
						{compact ? null : (
							<>
								<Cell label={court ? 'Players' : 'Places'}>{court ? `${playersOnCourt(g)} of ${spots}` : g.seats}</Cell>
								<Cell label="Booking">{g.ref ? `#${g.ref}` : 'Confirmed'}</Cell>
								<Cell label="Kit" wide>
									{g.extras.length ? g.extras.map((x) => `${x.title}${x.quantity > 1 ? ` ×${x.quantity}` : ''}`).join(', ') : g.extrasKnown ? 'Own kit' : '—'}
								</Cell>
							</>
						)}
					</dl>
					{until != null && until > 0 && !compact ? <Countdown ms={until} /> : null}
				</div>
			</div>
		</article>
	);
});

function Cell({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
	return (
		<div className={clsx('border-b border-r border-[var(--color-line)] px-5 py-3 sm:[&:nth-child(3n)]:border-r-0', wide && 'col-span-2 sm:col-span-1')}>
			<dt>
				<Label className="text-white/45">{label}</Label>
			</dt>
			<dd className="heading-display mt-1 truncate text-base capitalize tabular-nums">{children}</dd>
		</div>
	);
}

/** Scoreboard digits: DAYS : HRS : MIN until the game. */
function Countdown({ ms }: { ms: number }) {
	const d = Math.floor(ms / 86_400_000);
	const h = Math.floor((ms % 86_400_000) / 3_600_000);
	const m = Math.floor((ms % 3_600_000) / 60_000);
	const parts: [number, string][] = d > 0 ? [[d, 'Days'], [h, 'Hrs'], [m, 'Min']] : [[h, 'Hrs'], [m, 'Min']];
	return (
		<div className="mt-auto flex flex-wrap items-center gap-4 px-5 py-4">
			<Label className="text-[var(--color-primary)]">Game on in</Label>
			<div className="flex gap-2">
				{parts.map(([n, l]) => (
					<span key={l} className="flex min-w-[3.25rem] flex-col items-center rounded-xl bg-black/40 px-2 py-1.5">
						<span className="heading-display text-2xl tabular-nums text-[var(--color-primary)]">{String(n).padStart(2, '0')}</span>
						<Label className="mt-1 text-white/45">{l}</Label>
					</span>
				))}
			</div>
		</div>
	);
}

/** The court from above (landscape): dark turf, white lines, orange service lines, a spot per player. */
function CourtFromAbove({ spots, names, squash }: { spots: number; names: string[]; squash: boolean }) {
	const positions = squash || spots === 2 ? [[30, 50], [70, 50]] : [[25, 28], [25, 72], [75, 28], [75, 72]];
	return (
		<div className="relative aspect-[2/1] w-full">
			<svg viewBox="0 0 200 100" className="absolute inset-0 h-full w-full" aria-hidden>
				<rect x="2" y="2" width="196" height="96" rx="4" fill="#161616" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" />
				<rect x="2" y="2" width="196" height="96" rx="4" fill="none" stroke="#FF4A1C" strokeWidth="6" opacity="0.18" />
				{squash ? (
					<>
						<line x1="6" y1="2" x2="6" y2="98" stroke="#FF4A1C" strokeWidth="3" />
						<line x1="110" y1="2" x2="110" y2="98" stroke="rgba(255,255,255,0.75)" strokeWidth="1.2" />
						<line x1="110" y1="50" x2="198" y2="50" stroke="rgba(255,255,255,0.75)" strokeWidth="1.2" />
						<rect x="110" y="2" width="26" height="26" fill="none" stroke="#FF4A1C" strokeWidth="1" opacity="0.8" />
						<rect x="110" y="72" width="26" height="26" fill="none" stroke="#FF4A1C" strokeWidth="1" opacity="0.8" />
					</>
				) : (
					<>
						<line x1="100" y1="2" x2="100" y2="98" stroke="rgba(255,255,255,0.85)" strokeWidth="2.2" />
						<line x1="34" y1="2" x2="34" y2="98" stroke="#FF4A1C" strokeWidth="1.2" opacity="0.85" />
						<line x1="166" y1="2" x2="166" y2="98" stroke="#FF4A1C" strokeWidth="1.2" opacity="0.85" />
						<line x1="34" y1="50" x2="166" y2="50" stroke="#FF4A1C" strokeWidth="1.2" opacity="0.85" />
					</>
				)}
			</svg>
			{positions.slice(0, Math.max(2, spots)).map(([x, y], i) => {
				const name = names[i];
				return (
					<span
						key={i}
						className={clsx(
							'absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-mono text-[11px] font-bold sm:h-11 sm:w-11 sm:text-[13px]',
							name ? (i === 0 ? 'bg-[var(--color-primary)] text-black' : 'bg-white text-black') : 'border border-dashed border-white/60 text-white/70',
						)}
						style={{ left: `${x}%`, top: `${y}%` }}
						title={name ?? 'Open spot'}
					>
						{name ? initials(name) : '+'}
					</span>
				);
			})}
		</div>
	);
}

/** The ticket with its details blurred, for a signed-out confirmation with nothing saved in this tab. */
export function SealedTicket() {
	return (
		<div className="overflow-hidden rounded-[28px] border border-[var(--color-line)] bg-[var(--color-surface)]" aria-hidden>
			<div className="border-b border-[var(--color-line)] px-5 py-3">
				<Label className="text-white/45">VOLT · Your booking</Label>
			</div>
			<div className="grid md:grid-cols-2">
				<div className="p-5">
					<div className="aspect-[2/1] w-full rounded-[18px] bg-[#161616] blur-[2px]" />
				</div>
				<div className="space-y-3 p-5">
					<div className="h-10 w-2/3 bg-white/20 blur-[3px]" />
					<div className="h-4 w-1/2 bg-white/10 blur-[3px]" />
					<div className="grid grid-cols-2 gap-4 pt-4">
						<div className="h-8 bg-white/10 blur-[3px]" />
						<div className="h-8 bg-white/10 blur-[3px]" />
					</div>
				</div>
			</div>
		</div>
	);
}
