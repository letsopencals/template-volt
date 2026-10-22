'use client';

import { memo, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import type { AppointmentListItemResponse } from '@opencals/storefront-sdk';
import { at, formatLength, type Catalogue } from '@/lib/club';
import { gameName, gamePhase, rebookHref, toGame, untilText, type Game, type GamePhase } from '@/lib/game';
import { useNow } from '@/hooks/use-now';
import { MatchTicket } from '@/components/game/confirmation/match-ticket';
import { BTN, BTN_GHOST, Label, Monogram } from '@/components/game/bits';

const EASE = [0.22, 1, 0.36, 1] as const;
const ITEM = (i: number) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay: 0.05 * i, ease: EASE } });
const isoMin = (iso: string) => Date.parse(iso) / 60000;

/**
 * "My games": a stats strip (games played, hours on court, your home club, clubs played out of all of them), the next
 * game as the full ticket, upcoming games and trainings as compact tickets, the players you play with, and past
 * games with "Book again" (same club, weekday, time and length).
 */
export function GamesBoard({ appointments, cat, tz }: { appointments: AppointmentListItemResponse[]; cat: Catalogue; tz: string }) {
	const now = useNow(60_000);
	const { data: session } = useSession();
	const me = session?.customer?.firstName ?? null;
	const games = useMemo(() => appointments.map((a) => toGame(a as never, cat)), [appointments, cat]);
	const { upcoming, past } = useMemo(() => {
		const t = now ?? 0;
		const up: Game[] = [];
		const done: Game[] = [];
		for (const g of games) {
			const p = gamePhase(g, t, tz);
			if (p === 'upcoming' || p === 'today' || p === 'now') up.push(g);
			else done.push(g);
		}
		up.sort((a, b) => Date.parse(a.from) - Date.parse(b.from));
		done.sort((a, b) => Date.parse(b.from) - Date.parse(a.from));
		return { upcoming: up, past: done };
	}, [games, now, tz]);

	if (now == null) return <GamesBoardLoading />;

	if (games.length === 0) {
		return (
			<div className="flex flex-col items-start gap-5 rounded-[28px] border border-[var(--color-line)] bg-[var(--color-surface)] px-6 py-12 md:px-10">
				<Label className="text-[var(--color-primary)]">No bookings yet</Label>
				<h2 className="heading-display text-3xl text-[var(--color-ink)]">
					First game? <span className="text-[var(--color-primary)]">Grab a court.</span>
				</h2>
				<p className="max-w-lg text-sm text-[var(--color-ink-muted)]">Everything you book at any club lands here: courts, lessons and classes. Change or cancel without calling.</p>
				<Link href="/book" className={BTN}>
					Book a court
				</Link>
			</div>
		);
	}

	const played = past.filter((g) => g.status !== 'canceled');
	const hours = Math.round(played.reduce((s, g) => s + g.minutes, 0) / 60);
	const clubCount = new Map<string, number>();
	for (const g of [...played, ...upcoming]) if (g.clubTitle) clubCount.set(g.clubTitle, (clubCount.get(g.clubTitle) ?? 0) + 1);
	const home = [...clubCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
	const clubsTotal = cat.clubs.filter((c) => c.courtCount > 0).length;
	const playedWith = [...new Set(games.filter((g) => g.status !== 'canceled').flatMap((g) => g.crew))].slice(0, 8);
	const [next, ...later] = upcoming;
	const laterCourts = later.filter((g) => g.kind === 'court');
	const trainings = later.filter((g) => g.kind !== 'court');

	return (
		<div className="space-y-14">
			<dl className="grid grid-cols-2 overflow-hidden rounded-[28px] border border-[var(--color-line)] bg-[var(--color-surface)] sm:grid-cols-4">
				<Stat label="Games played" value={String(played.length)} />
				<Stat label="Hours on court" value={String(hours)} />
				<Stat label="Your club" value={home.replace(/^VOLT\s+/i, '')} />
				<Stat label="Clubs played" value={`${clubCount.size} of ${clubsTotal || clubCount.size}`} last />
			</dl>

			<section>
				<div className="mb-6 flex flex-wrap items-end justify-between gap-4">
					<h2 className="heading-display text-3xl text-[var(--color-ink)]">
						{upcoming.length ? (
							<>
								Next <span className="text-[var(--color-primary)]">games</span>
							</>
						) : (
							'Nothing coming up'
						)}
					</h2>
					<Link href="/book" className={BTN}>
						Book a court
					</Link>
				</div>
				{next ? (
					<div className="space-y-8">
						<motion.div {...ITEM(0)}>
							<Link href={`/account/appointments/${next.id}`} className="block transition-transform hover:-translate-y-0.5">
								<MatchTicket game={next} tz={tz} me={me} until={Date.parse(next.from) - now} badge={badgeFor(gamePhase(next, now, tz), untilText(next.from, now, tz))} />
							</Link>
						</motion.div>
						{laterCourts.length ? <TicketGrid title="Upcoming games" games={laterCourts} tz={tz} me={me} now={now} offset={1} /> : null}
						{trainings.length ? <TicketGrid title="Trainings" games={trainings} tz={tz} me={me} now={now} offset={1 + laterCourts.length} /> : null}
					</div>
				) : (
					<p className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] px-6 py-5 text-sm text-[var(--color-ink-muted)]">
						Time for another game?{' '}
						<Link href="/book" className="font-semibold text-[var(--color-primary)] underline underline-offset-4">
							See free courts this week
						</Link>
						.
					</p>
				)}
			</section>

			{playedWith.length ? (
				<section className="overflow-hidden rounded-[24px] border border-[var(--color-line)] bg-[var(--color-surface)]">
					<p className="border-b border-[var(--color-line)] px-5 py-3">
						<Label className="text-[var(--color-ink-dim)]">Your players</Label>
					</p>
					<div className="flex flex-wrap items-center gap-4 px-5 py-5">
						{playedWith.map((p) => (
							<span key={p} className="flex items-center gap-2.5">
								<Monogram name={p} size="sm" />
								<span className="font-semibold text-[var(--color-ink)]">{p}</span>
							</span>
						))}
						<span className="ml-auto text-xs text-[var(--color-ink-dim)]">Add them as your crew on your next booking.</span>
					</div>
				</section>
			) : null}

			{past.length ? (
				<section>
					<h2 className="heading-display mb-5 text-2xl text-[var(--color-ink)]">Played</h2>
					<ul className="overflow-hidden rounded-[24px] border border-[var(--color-line)] bg-[var(--color-surface)]">
						{past.map((g, i) => (
							<PastRow key={g.id} game={g} tz={tz} first={i === 0} />
						))}
					</ul>
				</section>
			) : null}
		</div>
	);
}

function TicketGrid({ title, games, tz, me, now, offset }: { title: string; games: Game[]; tz: string; me: string | null; now: number; offset: number }) {
	return (
		<div>
			<h3 className="heading-display mb-4 text-xl text-[var(--color-ink)]">{title}</h3>
			<div className="grid gap-4 md:grid-cols-2">
				{games.map((g, i) => (
					<motion.div key={g.id} {...ITEM(i + offset)}>
						<Link href={`/account/appointments/${g.id}`} className="block transition-transform hover:-translate-y-0.5">
							<MatchTicket game={g} tz={tz} me={me} compact badge={badgeFor(gamePhase(g, now, tz), untilText(g.from, now, tz))} />
						</Link>
					</motion.div>
				))}
			</div>
		</div>
	);
}

function Stat({ label, value, last }: { label: string; value: string; last?: boolean }) {
	return (
		<div className={clsx('px-4 py-5 sm:px-6', !last && 'border-r border-[var(--color-line)]')}>
			<dt>
				<Label className="text-[var(--color-ink-dim)]">{label}</Label>
			</dt>
			<dd className="heading-display mt-2 truncate text-2xl text-[var(--color-primary)] sm:text-4xl">{value}</dd>
		</div>
	);
}

export function badgeFor(phase: GamePhase, until: string | null): string | null {
	if (phase === 'now') return 'Playing now';
	if (phase === 'today') return until ? `Today, ${until}` : 'Today';
	return until ? until[0]!.toUpperCase() + until.slice(1) : null;
}

const PastRow = memo(function PastRow({ game: g, tz, first }: { game: Game; tz: string; first: boolean }) {
	const canceled = g.status === 'canceled';
	return (
		<li className={clsx('flex items-center gap-4 px-4 py-3 sm:gap-6 sm:px-5', !first && 'border-t border-[var(--color-line)]')}>
			<Link href={`/account/appointments/${g.id}`} className="flex min-w-0 flex-1 items-center gap-4 sm:gap-6">
				<span className="w-12 shrink-0 text-center">
					<span className="heading-display block text-2xl leading-none text-[var(--color-ink)]">{at(isoMin(g.from), tz, 'D')}</span>
					<Label className="text-[var(--color-ink-dim)]">{at(isoMin(g.from), tz, 'MMM')}</Label>
				</span>
				<span className="min-w-0 flex-1">
					<span className={clsx('block truncate font-semibold text-[var(--color-ink)]', canceled && 'line-through opacity-50')}>{gameName(g)}</span>
					<span className="text-xs text-[var(--color-ink-dim)]">
						{g.clubTitle} · {at(isoMin(g.from), tz, 'ddd HH:mm')} · {formatLength(g.minutes)}
						{g.crew.length ? ` · with ${g.crew.join(', ')}` : ''}
					</span>
				</span>
			</Link>
			{canceled ? (
				<Label className="shrink-0 rounded-full border border-[var(--color-line-strong)] px-2.5 py-1 text-[var(--color-ink-dim)]">Cancelled</Label>
			) : (
				<Link href={rebookHref(g, tz)} className={clsx(BTN_GHOST, 'shrink-0 !px-4 !py-2 text-xs')}>
					Book again
				</Link>
			)}
		</li>
	);
});

export function GamesBoardLoading() {
	return (
		<div className="space-y-4" aria-busy>
			<div className="h-24 animate-pulse rounded-[28px] bg-[var(--color-surface)]" />
			<div className="h-72 animate-pulse rounded-[28px] bg-[var(--color-surface)]" />
			<div className="h-32 animate-pulse rounded-[28px] bg-[var(--color-surface)]" />
		</div>
	);
}
