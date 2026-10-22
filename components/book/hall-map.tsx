'use client';

import { memo, useMemo, useRef } from 'react';
import moment from 'moment-timezone';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { clsx } from 'clsx';
import { useNow } from '@/hooks/use-now';
import { formatPrice } from '@/lib/format';
import { at, playersOn, STEP_MIN, type BoardRow, type Court, type FreeCourt } from '@/lib/club';

/**
 * The hall, from above: every court of the club (for the chosen sport) as a tile, doubles wide and singles narrow,
 * re-coloured for one start time. Orange = free for the whole game; a pulsing orange edge = free within the hour;
 * dim = free later ("from 21:00"); hatched = nothing left that day. A scrubber over the hall's pulse (free courts per
 * half hour) and quick chips move the start. "Book at 19:30" takes the best free court; tapping a tile opens that
 * court's free starts and books exactly that court. Everything comes from the club's board rows, so the map, the
 * pulse and the drawer can't disagree.
 */

const SOON = 60;
const QUICK = ['07:00', '09:00', '12:00', '17:00', '18:00', '19:30', '21:00'];
const EASE = [0.22, 1, 0.36, 1] as const;
const FLOOR_STYLE: React.CSSProperties = {
	backgroundImage:
		'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
	backgroundSize: '32px 32px',
};
const HATCH_STYLE: React.CSSProperties = {
	backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0 2px, transparent 2px 8px)',
};
const HALL_GRID_STYLE: React.CSSProperties = {
	gridTemplateColumns: 'repeat(auto-fit, clamp(48px, 7vw, 88px))',
};

type TileState = 'free' | 'soon' | 'later' | 'none' | 'checking';

interface Tile {
	court: Court;
	state: TileState;
	here: FreeCourt | null;
	next: number | null;
	rows: BoardRow[];
}

const BG: Record<TileState, string> = {
	free: '#FF4A1C',
	soon: '#1F120C',
	later: 'rgba(255,255,255,0.06)',
	none: 'rgba(255,255,255,0.025)',
	checking: 'rgba(255,255,255,0.05)',
};

export interface HallMapProps {
	tz: string;
	sport: { key: string; label: string };
	courts: Court[];
	rows: BoardRow[];
	/** Every court has answered (else unread courts show as "checking") */
	complete: boolean;
	pendingIds: Set<string>;
	date: string;
	today: string;
	minutes: number;
	start: number | null;
	onStart: (min: number) => void;
	openCourt: string | null;
	onOpenCourt: (id: string | null) => void;
	onBook: (court: Court, start: number) => void;
	nextDay: string | null;
	onDate: (d: string) => void;
	onMinutes: (m: number) => void;
	currency: string | undefined;
}

export function HallMap(props: HallMapProps) {
	const { tz, sport, courts, rows, complete, pendingIds, date, today, minutes, start, onStart, openCourt, onOpenCourt, onBook, nextDay, onDate, onMinutes, currency } = props;
	const reduce = useReducedMotion() ?? false;
	const drawerRef = useRef<HTMLDivElement>(null);
	const now = useNow(60_000);
	const byStart = useMemo(() => new Map(rows.map((r) => [r.start, r])), [rows]);

	// A uniform half-hour axis from the first to the last free start; today it starts at "now" (the next half hour),
	// so the hall shows each court's next free start even when the first free one is later.
	const axis = useMemo(() => {
		if (!rows.length) return [] as number[];
		const first = rows[0]!.start;
		const last = rows[rows.length - 1]!.start;
		const nowCeil = now !== null && date === today ? Math.ceil(now / 60000 / STEP_MIN) * STEP_MIN : null;
		const a = nowCeil !== null && nowCeil < first && first - nowCeil <= 2 * 60 ? nowCeil : first;
		const out: number[] = [];
		for (let t = a; t <= last; t += STEP_MIN) out.push(t);
		return out;
	}, [rows, now, date, today]);

	const idx = useMemo(() => {
		if (!axis.length) return -1;
		if (start !== null) {
			let best = 0;
			axis.forEach((t, i) => {
				if (Math.abs(t - start) < Math.abs(axis[best]! - start)) best = i;
			});
			return best;
		}
		// Today: the first start with a free court (the hall as it is, from now on).
		if (date === today) return Math.max(0, axis.findIndex((t) => byStart.has(t)));
		const evening = axis.findIndex((t) => byStart.has(t) && Number(at(t, tz, 'H')) >= 18);
		return evening >= 0 ? evening : 0;
	}, [axis, start, date, today, byStart, tz]);

	const chosen = idx >= 0 ? axis[idx]! : null;
	const row = chosen !== null ? (byStart.get(chosen) ?? null) : null;

	const tiles: Tile[] = useMemo(
		() =>
			courts.map((court) => {
				const own = rows.filter((r) => r.courts.some((c) => c.court.id === court.id));
				if (pendingIds.has(court.id) || (!complete && rows.length === 0)) return { court, state: 'checking' as const, here: null, next: null, rows: own };
				const here = row?.courts.find((c) => c.court.id === court.id) ?? null;
				const t = chosen ?? 0;
				const next = own.find((r) => r.start > t)?.start ?? null;
				const state: TileState = here ? 'free' : next !== null ? (next - t <= SOON ? 'soon' : 'later') : 'none';
				return { court, state, here, next, rows: own };
			}),
		[courts, rows, row, chosen, complete, pendingIds],
	);

	const counts = useMemo(() => axis.map((t) => byStart.get(t)?.courts.length ?? 0), [axis, byStart]);
	const peak = Math.max(1, ...counts);
	const quick = useMemo(() => {
		const list: { label: string; t: number; n: number }[] = [];
		// "Now" only when the axis really starts at the current half hour (the club is open now).
		const nowCeil = now !== null ? Math.ceil(now / 60000 / STEP_MIN) * STEP_MIN : null;
		if (date === today && axis[0] !== undefined && axis[0] === nowCeil) list.push({ label: 'Now', t: axis[0], n: counts[0] ?? 0 });
		for (const q of QUICK) {
			const i = axis.findIndex((t) => at(t, tz, 'HH:mm') === q);
			if (i > 0 || (i === 0 && !list.length)) list.push({ label: q, t: axis[i]!, n: counts[i] ?? 0 });
		}
		return list.slice(0, 7);
	}, [axis, counts, date, today, tz, now]);

	const open = tiles.find((t) => t.court.id === openCourt) ?? null;
	const freeHere = tiles.filter((t) => t.state === 'free').length;
	const checking = !complete && rows.length === 0;
	const empty = complete && rows.length === 0;
	const when = date === today ? 'today' : date === moment(today).add(1, 'day').format('YYYY-MM-DD') ? 'tomorrow' : moment(date).format('dddd D MMM');
	const nextAny = row ? null : (rows.find((r) => chosen !== null && r.start > chosen) ?? null);
	const best = row?.courts[0] ?? null;

	return (
		<div className="space-y-4">
			<div className="relative overflow-hidden rounded-[28px] border border-[var(--color-line)] bg-[var(--color-bg-deep)] text-white">
				<span aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.05]" style={FLOOR_STYLE} />
				<span aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[60%] -translate-x-1/2 rounded-full bg-[var(--color-primary)]/10 blur-3xl" />

				<div className="relative px-4 pb-5 pt-5 sm:px-8 sm:pb-8 sm:pt-7">
					<div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
						<div className="min-w-0">
							<p className="mb-2 flex items-center gap-2.5 font-mono text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[var(--color-primary)]">
								<span className="relative flex h-2 w-2" aria-hidden>
									<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-primary)] opacity-60" />
									<span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-primary)]" />
								</span>
								{sport.label} hall · live · {when}
							</p>
							<h2 className="heading-display text-[26px] sm:text-[40px]">
								{checking ? (
									'Checking every court…'
								) : empty ? (
									'Every court is taken'
								) : (
									<>
										<span className="text-white/45">At </span>
										<Swap k={String(chosen)}>{chosen !== null ? at(chosen, tz, 'HH:mm') : ''}</Swap>
										<span className="text-white/45"> · </span>
										<span className="text-[var(--color-primary)]">
											<Swap k={`${chosen}-${freeHere}`}>{freeHere}</Swap>
										</span>
										<span className="text-white/45"> of {courts.length} free</span>
									</>
								)}
							</h2>
						</div>
						<p className="font-mono text-[0.72rem] text-white/50">
							{courts.length} {courts.length === 1 ? 'court' : 'courts'} · {minutes} min game
						</p>
					</div>

					{axis.length > 1 ? (
						<div className="mt-6">
							<div className="relative h-[60px]">
								<div className="absolute inset-x-0 bottom-[14px] flex h-[38px] items-end gap-[2px]" aria-hidden>
									{counts.map((n, i) => (
										<motion.span
											key={axis[i]}
											className={clsx('min-w-0 flex-1 rounded-t-[2px]', i === idx ? 'bg-[var(--color-primary)]' : n ? 'bg-white/25' : 'bg-white/[0.06]')}
											initial={false}
											animate={{ height: `${Math.max(8, (n / peak) * 100)}%` }}
											transition={{ duration: 0.4, ease: EASE }}
										/>
									))}
								</div>
								<div className="absolute inset-x-0 bottom-[6px] h-[3px] rounded-full bg-white/15" aria-hidden />
								<input
									type="range"
									min={0}
									max={axis.length - 1}
									step={1}
									value={idx}
									onChange={(e) => onStart(axis[Number(e.target.value)]!)}
									aria-label="Game start time"
									aria-valuetext={chosen !== null ? `${at(chosen, tz, 'HH:mm')}, ${counts[idx] ?? 0} courts free` : undefined}
									className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
								/>
								<motion.span
									aria-hidden
									className="pointer-events-none absolute bottom-0 h-[18px] w-[18px] -translate-x-1/2 rounded-full border-[3px] border-[var(--color-bg-deep)] bg-[var(--color-primary)] shadow-[0_0_0_2px_rgba(255,74,28,0.5),0_0_18px_rgba(255,74,28,0.7)] peer-focus-visible:ring-2 peer-focus-visible:ring-white"
									initial={false}
									animate={{ left: `${(idx / Math.max(1, axis.length - 1)) * 100}%` }}
									transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 40 }}
								/>
							</div>
							<div className="mt-1 flex justify-between font-mono text-[0.68rem] font-semibold tabular-nums text-white/45">
								<span>{at(axis[0]!, tz, 'HH:mm')}</span>
								<span className="hidden sm:inline">drag to change the start · bars = free courts</span>
								<span>{at(axis[axis.length - 1]!, tz, 'HH:mm')}</span>
							</div>
							{quick.length ? (
								<div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Quick start times">
									{quick.map((q) => {
										const on = q.t === chosen;
										return (
											<button
												key={q.label}
												type="button"
												aria-pressed={on}
												onClick={() => onStart(q.t)}
												className={clsx(
													'flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 font-mono text-[0.75rem] font-semibold transition-colors',
													on ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-black' : 'border-white/20 text-white hover:border-white/60',
												)}
											>
												{q.label === 'Now' ? <span className={clsx('h-1.5 w-1.5 rounded-full', on ? 'bg-black' : 'bg-[var(--color-primary)]')} aria-hidden /> : null}
												{q.label}
												<span className={clsx('text-[0.65rem] tabular-nums', on ? 'text-black/60' : 'text-white/45')}>{q.n}</span>
											</button>
										);
									})}
								</div>
							) : null}
						</div>
					) : null}

					{/* The hall */}
					<div className="relative mt-6 overflow-hidden rounded-[20px] border border-white/10 bg-black/30 p-3 sm:p-6">
						{chosen !== null && !reduce ? (
							<motion.span
								key={chosen}
								aria-hidden
								className="pointer-events-none absolute inset-y-0 left-0 z-10 w-1/3 bg-gradient-to-r from-transparent via-[rgba(255,74,28,0.12)] to-transparent"
								initial={{ x: '-100%' }}
								animate={{ x: '320%' }}
								transition={{ duration: 0.9, ease: 'easeOut' }}
							/>
						) : null}
						<div className="grid grid-flow-row-dense justify-center gap-2 sm:gap-3" style={HALL_GRID_STYLE}>
							{tiles.map((t, i) => (
								<CourtTile
									key={t.court.id}
									tile={t}
									index={i}
									tz={tz}
									selected={openCourt === t.court.id}
									reduce={reduce}
									squash={sport.key === 'squash'}
									currency={currency}
									onToggle={onOpenCourt}
								/>
							))}
						</div>
						<div className="mt-5 flex items-center justify-center gap-3" aria-hidden>
							<span className="h-px flex-1 bg-white/10" />
							<span className="rounded-full border border-dashed border-white/20 px-3 py-1 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-white/40">
								Reception · entrance
							</span>
							<span className="h-px flex-1 bg-white/10" />
						</div>
					</div>

					<div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
						<ul className="flex flex-wrap gap-x-4 gap-y-2 text-[0.72rem] font-medium text-white/60">
							<Legend swatch="bg-[var(--color-primary)]">Free</Legend>
							<Legend swatch="border-2 border-[var(--color-primary)] shadow-[0_0_8px_rgba(255,74,28,0.7)]">Free within the hour</Legend>
							<Legend swatch="bg-white/15">Free later</Legend>
							<Legend swatch="border border-white/15 bg-white/[0.04]">Taken for the day</Legend>
						</ul>
						{checking ? null : empty ? null : row && best && chosen !== null ? (
							<div className="flex flex-wrap items-center gap-4">
								<p className="text-right text-[0.75rem] font-medium leading-tight text-white/60">
									from <span className="text-base font-bold text-white">{formatPrice(best.price, currency)}</span> per court
									<br />
									{formatPrice(best.price / playersOn(best.court), currency)} each for {playersOn(best.court)}
								</p>
								<button
									type="button"
									onClick={() => onBook(best.court, chosen)}
									className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-bright)]"
								>
									Book {at(chosen, tz, 'HH:mm')} · Court {best.court.number}
									<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
										<path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
									</svg>
								</button>
							</div>
						) : nextAny ? (
							<button
								type="button"
								onClick={() => onStart(nextAny.start)}
								className="rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-[var(--color-primary)]"
							>
								Next free court at {at(nextAny.start, tz, 'HH:mm')} →
							</button>
						) : null}
					</div>

					{empty ? (
						<div className="mt-5 rounded-[18px] border border-white/15 px-5 py-5">
							<p className="text-base font-semibold">No court is free for {minutes} minutes {when}.</p>
							<div className="mt-4 flex flex-wrap gap-3">
								{nextDay ? (
									<button type="button" onClick={() => onDate(nextDay)} className="rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white">
										Next free day: {moment(nextDay).format('ddd D MMM')}
									</button>
								) : null}
								{minutes > 60 ? (
									<button type="button" onClick={() => onMinutes(60)} className="rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold text-white">
										Try 60 min
									</button>
								) : null}
							</div>
						</div>
					) : null}
				</div>
			</div>

			<div ref={drawerRef} className="scroll-mb-24">
				<AnimatePresence initial={false}>
					{open ? (
						<motion.div
							key={open.court.id}
							initial={{ height: 0, opacity: 0 }}
							animate={{ height: 'auto', opacity: 1 }}
							exit={{ height: 0, opacity: 0 }}
							transition={{ duration: 0.3, ease: EASE }}
							onAnimationComplete={() => drawerRef.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })}
							className="overflow-hidden"
						>
							<CourtDrawer tile={open} tz={tz} chosen={chosen} minutes={minutes} sportLabel={sport.label} currency={currency} onBook={onBook} onClose={() => onOpenCourt(null)} />
						</motion.div>
					) : null}
				</AnimatePresence>
			</div>
		</div>
	);
}

/** A number or time that rolls when it changes. */
function Swap({ k, children }: { k: string; children: React.ReactNode }) {
	return (
		<span className="relative inline-flex overflow-hidden align-bottom">
			<AnimatePresence mode="popLayout" initial={false}>
				<motion.span
					key={k}
					className="inline-block tabular-nums"
					initial={{ y: '70%', opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: '-70%', opacity: 0 }}
					transition={{ duration: 0.25, ease: EASE }}
				>
					{children}
				</motion.span>
			</AnimatePresence>
		</span>
	);
}

function Legend({ swatch, children }: { swatch: string; children: React.ReactNode }) {
	return (
		<li className="flex items-center gap-2">
			<span className={clsx('h-3 w-3 shrink-0 rounded-[3px]', swatch)} aria-hidden />
			{children}
		</li>
	);
}

/** Court lines from above (portrait). Padel: glass box, net, service lines, centre line. Squash: front wall, short line, half-court line, boxes. */
function CourtLines({ tone, squash }: { tone: string; squash: boolean }) {
	if (squash) {
		return (
			<svg viewBox="0 0 100 160" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
				<rect x="5" y="4" width="90" height="152" rx="3" fill="none" stroke={tone} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
				<line x1="5" y1="8" x2="95" y2="8" stroke={tone} strokeWidth="3" vectorEffect="non-scaling-stroke" />
				<line x1="5" y1="90" x2="95" y2="90" stroke={tone} strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.8" />
				<line x1="50" y1="90" x2="50" y2="156" stroke={tone} strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.8" />
				<rect x="5" y="90" width="22" height="22" fill="none" stroke={tone} strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.7" />
				<rect x="73" y="90" width="22" height="22" fill="none" stroke={tone} strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.7" />
			</svg>
		);
	}
	return (
		<svg viewBox="0 0 100 160" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
			<rect x="5" y="4" width="90" height="152" rx="3" fill="none" stroke={tone} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
			<line x1="0" y1="80" x2="100" y2="80" stroke={tone} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
			<line x1="5" y1="25" x2="95" y2="25" stroke={tone} strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.8" />
			<line x1="5" y1="135" x2="95" y2="135" stroke={tone} strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.8" />
			<line x1="50" y1="25" x2="50" y2="135" stroke={tone} strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.8" />
		</svg>
	);
}

const CourtTile = memo(function CourtTile({
	tile,
	index,
	tz,
	selected,
	reduce,
	squash,
	currency,
	onToggle,
}: {
	tile: Tile;
	index: number;
	tz: string;
	selected: boolean;
	reduce: boolean;
	squash: boolean;
	currency: string | undefined;
	onToggle: (id: string | null) => void;
}) {
	const { court, state, here, next } = tile;
	const singles = court.format === 'singles';
	const free = state === 'free';
	const nextAt = next !== null ? at(next, tz, 'HH:mm') : null;
	const status = free ? `free, ${formatPrice(here!.price, currency)}` : state === 'checking' ? 'checking' : nextAt ? `free from ${nextAt}` : 'taken for the day';
	const lines = free ? 'rgba(0,0,0,0.35)' : state === 'soon' ? 'rgba(255,74,28,0.6)' : 'rgba(255,255,255,0.16)';

	return (
		<div className={clsx('relative', singles ? 'col-span-1' : 'col-span-2')}>
			{state === 'soon' ? (
				<motion.span
					aria-hidden
					className="pointer-events-none absolute -inset-[3px] rounded-[13px] border-2 border-[var(--color-primary)] shadow-[0_0_24px_rgba(255,74,28,0.5)]"
					initial={{ opacity: 0 }}
					animate={reduce ? { opacity: 0.9 } : { opacity: [0.3, 1, 0.3] }}
					transition={reduce ? { duration: 0.2 } : { duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: index * 0.08 }}
				/>
			) : null}
			{free ? (
				<motion.span
					aria-hidden
					className="pointer-events-none absolute -inset-[2px] rounded-[12px] shadow-[0_0_28px_rgba(255,74,28,0.45)]"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.4, delay: reduce ? 0 : index * 0.03 }}
				/>
			) : null}
			<motion.button
				type="button"
				onClick={() => onToggle(selected ? null : court.id)}
				aria-pressed={selected}
				aria-label={`Court ${court.number}${singles ? ', singles' : ''}: ${status}`}
				whileHover={reduce ? undefined : { y: -3 }}
				whileTap={reduce ? undefined : { scale: 0.97 }}
				className={clsx(
					'relative block w-full overflow-hidden rounded-[10px] text-left outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black',
					singles ? 'aspect-[5/16]' : 'aspect-[5/8]',
					selected && 'ring-2 ring-white ring-offset-2 ring-offset-black',
				)}
			>
				<motion.span
					aria-hidden
					className="absolute inset-0"
					initial={false}
					animate={{ backgroundColor: BG[state] }}
					transition={{ duration: 0.35, delay: reduce ? 0 : index * 0.03, ease: EASE }}
				/>
				{state === 'none' ? <span aria-hidden className="absolute inset-0" style={HATCH_STYLE} /> : null}
				{state === 'checking' ? (
					<motion.span
						aria-hidden
						className="absolute inset-0 bg-white/10"
						animate={reduce ? undefined : { opacity: [0.2, 0.7, 0.2] }}
						transition={{ duration: 1.4, repeat: Infinity, delay: index * 0.1 }}
					/>
				) : null}
				<CourtLines tone={lines} squash={squash} />

				<span className={clsx('relative flex h-full flex-col justify-between', singles ? 'items-center px-0.5 py-2' : 'p-2 sm:p-3', free ? 'text-black' : 'text-white')}>
					<span className={clsx('block min-w-0', singles && 'text-center')}>
						<span className={clsx('block font-mono text-[8px] font-bold uppercase tracking-[0.18em] sm:text-[9px]', free ? 'text-black/55' : 'text-white/45')}>
							{singles ? '1v1' : 'Court'}
						</span>
						<span
							className={clsx(
								'heading-display block leading-none tabular-nums',
								singles ? 'text-[15px] sm:text-[20px]' : 'text-[24px] sm:text-[34px]',
								!free && state !== 'soon' && 'text-white/70',
							)}
						>
							{court.number}
						</span>
					</span>

					<span className={clsx('block min-w-0', singles && 'text-center')}>
						<AnimatePresence mode="wait" initial={false}>
							<motion.span
								key={`${state}${nextAt}${here?.price}`}
								className="block"
								initial={{ opacity: 0, y: 6 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -4 }}
								transition={{ duration: 0.2 }}
							>
								{singles ? (
									<span className={clsx('hidden font-mono text-[10px] font-bold tabular-nums sm:block', free ? 'text-black' : state === 'soon' ? 'text-[var(--color-primary)]' : 'text-white/45')}>
										{free ? 'free' : state === 'checking' ? '…' : (nextAt ?? '—')}
									</span>
								) : free ? (
									<>
										<span className="block font-mono text-[9px] font-bold uppercase tracking-[0.12em] sm:text-[10px]">Free</span>
										<span className="block text-[11px] font-bold tabular-nums sm:text-[14px]">{formatPrice(here!.price, currency)}</span>
									</>
								) : state === 'checking' ? (
									<span className="block text-[10px] font-semibold text-white/45">…</span>
								) : nextAt ? (
									<>
										<span className={clsx('block font-mono text-[9px] font-bold uppercase tracking-[0.12em] sm:text-[10px]', state === 'soon' ? 'text-[var(--color-primary)]' : 'text-white/40')}>
											From
										</span>
										<span className={clsx('block text-[12px] font-bold tabular-nums sm:text-[15px]', state === 'soon' ? 'text-[var(--color-primary)]' : 'text-white/60')}>
											{nextAt}
										</span>
									</>
								) : (
									<span className="block font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-white/35 sm:text-[10px]">Taken</span>
								)}
							</motion.span>
						</AnimatePresence>
					</span>
				</span>
			</motion.button>
		</div>
	);
});

function CourtDrawer({
	tile,
	tz,
	chosen,
	minutes,
	sportLabel,
	currency,
	onBook,
	onClose,
}: {
	tile: Tile;
	tz: string;
	chosen: number | null;
	minutes: number;
	sportLabel: string;
	currency: string | undefined;
	onBook: (court: Court, start: number) => void;
	onClose: () => void;
}) {
	const { court, rows } = tile;
	const players = playersOn(court);
	const price = rows[0]?.courts.find((c) => c.court.id === court.id)?.price ?? null;
	return (
		<div className="rounded-[28px] border border-[var(--color-primary)]/60 bg-[var(--color-surface)] px-5 py-5 sm:px-8 sm:py-6">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<p className="font-mono text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[var(--color-ink-dim)]">
						Chosen court · {minutes} min game
					</p>
					<h3 className="heading-display mt-1 text-2xl text-[var(--color-ink)] sm:text-3xl">
						{sportLabel} · Court {court.number}
					</h3>
					<p className="mt-1 text-sm text-[var(--color-ink-muted)]">
						{court.format === 'singles' ? 'Singles court · 2 players' : `Doubles court · ${players} players`}
					</p>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="rounded-full border border-[var(--color-line-strong)] px-4 py-2 text-xs font-semibold text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
				>
					Close
				</button>
			</div>
			{rows.length === 0 ? (
				<p className="mt-5 text-sm text-[var(--color-ink-muted)]">
					This court has no {minutes} free minutes left on this day. Pick another court on the map, or another day.
				</p>
			) : (
				<>
					<p className="mt-5 text-[0.8rem] text-[var(--color-ink-dim)]">
						{rows.length} free {rows.length === 1 ? 'start' : 'starts'} · you book exactly this court
						{price !== null ? ` · ${formatPrice(price / players, currency)} each for ${players}` : ''}
					</p>
					<div className="mt-3 flex flex-wrap gap-2">
						{rows.map((r) => {
							const fc = r.courts.find((c) => c.court.id === court.id)!;
							const on = r.start === chosen;
							return (
								<button
									key={r.start}
									type="button"
									onClick={() => onBook(court, r.start)}
									className={clsx(
										'flex min-w-[84px] flex-col items-start rounded-xl border px-3 py-2 text-left transition-colors',
										on
											? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15'
											: 'border-[var(--color-line-strong)] bg-[var(--color-bg)] hover:border-[var(--color-primary)]',
									)}
									aria-label={`Court ${court.number}, ${at(r.start, tz, 'HH:mm')}, ${formatPrice(fc.price, currency)}`}
								>
									<span className="heading-display text-base tabular-nums text-[var(--color-ink)]">{at(r.start, tz, 'HH:mm')}</span>
									<span className="text-[0.7rem] font-semibold text-[var(--color-primary)]">{formatPrice(fc.price, currency)}</span>
								</button>
							);
						})}
					</div>
				</>
			)}
		</div>
	);
}
