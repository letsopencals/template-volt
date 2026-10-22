'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import moment from 'moment-timezone';
import { sportOf, type Court } from '@/lib/club';
import type { DurationOption, GridColumn } from '@/hooks/use-club-grid';
import { DurationPopover } from '@/components/booking/duration-popover';
import { AnchoredPopover, type AnchorRect } from '@/components/booking/anchored-popover';

interface CourtGridProps {
	courts: Court[];
	columns: GridColumn[];
	slotsLoading: boolean;
	error: boolean;
	date: string;
	timezone: string;
	isFree: (courtId: string, columnKey: string) => boolean;
	durationOptions: (court: Court, columnKey: string) => DurationOption[];
	isCourtPending: (courtId: string) => boolean;
	currency: string | undefined;
	onSelect: (court: Court, option: DurationOption) => void;
}

interface OpenCell {
	courtId: string;
	columnKey: string;
	/** Viewport rect of the clicked cell — the popover is `position: fixed` off it. */
	anchor: AnchorRect;
}

/** Smallest duration option spanning at least `span` cells (options only ever cover
 *  consecutive free cells, so a span crossing a booked cell finds nothing). */
function optionCovering(options: DurationOption[], span: number): DurationOption | null {
	let best: DurationOption | null = null;
	for (const o of options) if (o.units >= span && (!best || o.units < best.units)) best = o;
	return best;
}

// Fixed cell + sticky-label widths. One place so header / rows / now-line align.
const CELL_W = 56; // px — the bigger, comfortable blocks
const CELL_GAP = 4; // px
const LABEL_W = 128; // px — sticky court-name column
const CELL_STYLE: React.CSSProperties = { width: CELL_W };
const BOOKED_CELL_STYLE: React.CSSProperties = {
	width: CELL_W,
	backgroundImage: 'repeating-linear-gradient(45deg, var(--color-surface-3) 0 3px, transparent 3px 6px)',
};

/** Live minutes-since-midnight in `timezone` if `date` is today, else null. */
function todayNowMinutes(date: string, timezone: string): number | null {
	const now = moment().tz(timezone);
	return now.format('YYYY-MM-DD') === date ? now.hours() * 60 + now.minutes() : null;
}

export function CourtGrid({
	courts,
	columns,
	slotsLoading,
	error,
	date,
	timezone,
	isFree,
	durationOptions,
	isCourtPending,
	currency,
	onSelect,
}: CourtGridProps) {
	const [open, setOpen] = useState<OpenCell | null>(null);
	// Duration chosen in the popover (committed on Confirm) and the one currently
	// hovered — both drive the spanned-cell preview highlight on the grid.
	const [pickedUnits, setPickedUnits] = useState<number | null>(null);
	const [hoverUnits, setHoverUnits] = useState<number | null>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	const popoverRef = useRef<HTMLDivElement>(null);
	const didAutoScroll = useRef<string | null>(null);

	// Live "now" minutes — re-evaluated each minute so the cursor drifts.
	const [nowMin, setNowMin] = useState<number | null>(() => todayNowMinutes(date, timezone));
	useEffect(() => {
		setNowMin(todayNowMinutes(date, timezone));
		const id = setInterval(() => setNowMin(todayNowMinutes(date, timezone)), 60_000);
		return () => clearInterval(id);
	}, [date, timezone]);

	const firstMin = columns[0]?.minutes ?? 0;
	// X (px) of a given minute along the cell track (0 = first cell's left edge).
	const xForMinutes = (m: number): number => ((m - firstMin) / 30) * (CELL_W + CELL_GAP);
	const nowX = nowMin !== null ? xForMinutes(nowMin) : null;

	// Auto-scroll so ~1h of past sits left of the now-line, then the now-line, then
	// the open slots — once per date, after the grid has mounted and slots have
	// loaded (so columns are final). Gated on slotsLoading because the effect first
	// runs while the loading skeleton is shown (ref still null); depending on it
	// re-runs once the real grid is on screen.
	useLayoutEffect(() => {
		const el = scrollRef.current;
		if (!el || slotsLoading || nowX === null || columns.length === 0) return;
		if (didAutoScroll.current === date) return;
		didAutoScroll.current = date;
		const target = Math.max(0, nowX - (CELL_W + CELL_GAP) * 2); // ~1h before now
		el.scrollTo({ left: target, behavior: 'auto' });
	}, [date, slotsLoading, nowX, columns.length]);

	// While open: close on any scroll (grid or page — capture catches both) / resize,
	// since the fixed popover's anchor would drift; on Escape; and on a press outside
	// the popover. Presses on free grid cells are left to the cell's own click handler
	// (pick a duration / move the popover / toggle closed). No full-screen backdrop, so
	// the grid cells stay hoverable for the cell → popover preview.
	const isOpen = open !== null;
	useEffect(() => {
		if (!isOpen) return;
		const close = () => {
			setOpen(null);
			setPickedUnits(null);
			setHoverUnits(null);
		};
		const onPointerDown = (e: PointerEvent) => {
			const target = e.target as Element | null;
			if (!target) return;
			if (popoverRef.current?.contains(target)) return;
			if (target.closest('[data-court-cell]')) return;
			close();
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') close();
		};
		window.addEventListener('scroll', close, { passive: true, capture: true });
		window.addEventListener('resize', close);
		document.addEventListener('pointerdown', onPointerDown);
		document.addEventListener('keydown', onKey);
		return () => {
			window.removeEventListener('scroll', close, { capture: true });
			window.removeEventListener('resize', close);
			document.removeEventListener('pointerdown', onPointerDown);
			document.removeEventListener('keydown', onKey);
		};
	}, [isOpen]);

	if (error) {
		return (
			<div className="rounded-3xl border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface)] py-14 text-center">
				<p className="text-sm text-[var(--color-ink-muted)]">Couldn’t load court availability. Please try again.</p>
			</div>
		);
	}

	const openCourt = open ? courts.find((c) => c.id === open.courtId) ?? null : null;
	const openColumn = open ? columns.find((c) => c.key === open.columnKey) ?? null : null;
	const openOptions = openCourt && open ? durationOptions(openCourt, open.columnKey) : [];

	// Preview span: how many consecutive cells (from the open cell) the hovered or
	// picked duration covers, so those cells light up in the open court's row.
	const previewUnits = hoverUnits ?? pickedUnits;
	const openColIndex = open ? columns.findIndex((c) => c.key === open.columnKey) : -1;
	const isPreviewCell = (courtId: string, colIndex: number): boolean => {
		if (!open || !previewUnits || courtId !== open.courtId || openColIndex < 0) return false;
		return colIndex >= openColIndex && colIndex < openColIndex + previewUnits;
	};

	const closePopover = () => {
		setOpen(null);
		setPickedUnits(null);
		setHoverUnits(null);
	};

	// The duration a cell of the open row stands for: the smallest option covering
	// the open cell through this one. Null for other rows / cells before the start.
	const optionForCell = (courtId: string, colIndex: number): DurationOption | null => {
		if (!open || courtId !== open.courtId || openColIndex < 0 || colIndex < openColIndex) return null;
		return optionCovering(openOptions, colIndex - openColIndex + 1);
	};

	// Cell → popover preview: hovering a cell of the open row previews (and lights in
	// the popover) the duration reaching it. Mouse only; touch just taps (handled in click).
	const handleCellHover = (courtId: string, colIndex: number) => {
		if (!open || courtId !== open.courtId) return;
		setHoverUnits(optionForCell(courtId, colIndex)?.units ?? null);
	};

	const handleCellClick = (
		e: React.MouseEvent<HTMLButtonElement>,
		courtId: string,
		columnKey: string,
		colIndex: number,
	) => {
		const sameCell = open && open.courtId === courtId && open.columnKey === columnKey;
		if (sameCell) {
			closePopover();
			return;
		}
		// A cell further along the open row picks the duration reaching it (Confirm
		// still commits). Out of reach → falls through to opening a popover there.
		const reach = colIndex > openColIndex ? optionForCell(courtId, colIndex) : null;
		if (reach) {
			setPickedUnits(reach.units);
			setHoverUnits(reach.units);
			return;
		}
		const r = e.currentTarget.getBoundingClientRect();
		setPickedUnits(null);
		setHoverUnits(null);
		setOpen({ courtId, columnKey, anchor: { left: r.left, top: r.top, bottom: r.bottom, width: r.width } });
	};

	return (
		<div className="overflow-hidden rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] card-shadow">
			{/* Legend */}
			<div className="flex flex-wrap items-center gap-4 border-b border-[var(--color-line)] px-5 py-3 text-[0.68rem] font-medium text-[var(--color-ink-dim)]">
				<span className="flex items-center gap-1.5">
					<span className="h-3 w-3 rounded-sm border border-[var(--color-line-strong)] bg-[var(--color-bg)]" /> Available
				</span>
				<span className="flex items-center gap-1.5">
					<span className="h-3 w-3 rounded-sm bg-[var(--color-primary)]" /> Selected
				</span>
				<span className="flex items-center gap-1.5">
					<span
						className="h-3 w-3 rounded-sm border border-[var(--color-line)]"
						style={{ backgroundImage: 'repeating-linear-gradient(45deg, var(--color-surface-3) 0 2px, transparent 2px 4px)' }}
					/>{' '}
					Booked
				</span>
				<span className="ml-auto flex items-center gap-1.5">
					<span className="h-3 w-0.5 bg-[var(--color-primary)]" /> Now
					{slotsLoading ? (
						<span className="ml-3 inline-flex items-center gap-1.5 text-[var(--color-ink-dim)]">
							<span className="h-2.5 w-2.5 animate-spin rounded-full border border-[var(--color-line-strong)] border-t-[var(--color-primary)]" />
							Loading
						</span>
					) : null}
				</span>
			</div>

			<div ref={scrollRef} className="no-scrollbar relative overflow-x-auto">
				<div className="relative w-max">
					{/* Now line — positioned over the cell track, offset past the sticky label. */}
					{nowX !== null ? (
						<div
							className="pointer-events-none absolute bottom-0 top-8 z-10"
							style={{ left: LABEL_W + CELL_GAP + nowX }}
						>
							<div className="h-full w-px bg-[var(--color-primary)] shadow-[0_0_10px_var(--color-primary)]" />
							<span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-[var(--color-primary)]" />
						</div>
					) : null}

					{/* Time header (leading sticky spacer keeps columns aligned with the labels) */}
					<div className="flex h-8 items-end" style={{ gap: CELL_GAP }}>
						<div className="sticky left-0 z-20 shrink-0" style={{ width: LABEL_W }} />
						{columns.map((col) => (
							<div key={col.key} className="shrink-0 text-center" style={{ width: CELL_W }}>
								{col.isHour ? (
									<span className="text-[0.65rem] font-semibold tracking-tight text-[var(--color-ink-muted)]">
										{col.label}
									</span>
								) : (
									<span className="text-[0.6rem] text-[var(--color-ink-dim)]">·</span>
								)}
							</div>
						))}
					</div>

					{/* Court rows */}
					<div className="mt-1.5 space-y-1.5 pb-1">
						{courts.map((court) => (
							<div
								key={court.id}
								className="flex items-center"
								style={{ gap: CELL_GAP }}
								onMouseLeave={open?.courtId === court.id ? () => setHoverUnits(null) : undefined}
							>
								{/* Sticky glass court label */}
								<div
									className="glass-strong sticky left-0 z-20 flex shrink-0 items-center gap-2 rounded-lg px-3 py-2"
									style={{ width: LABEL_W }}
								>
									<span
										className="h-5 w-1 shrink-0 rounded-full"
										style={{ backgroundColor: sportOf(court.sport).accent }}
									/>
									<span className="truncate text-sm font-semibold text-[var(--color-ink)]">
										Court {court.number}
									</span>
									{court.format === 'singles' ? (
										<span className="ml-auto rounded-sm border border-[var(--color-line-strong)] px-1 font-mono text-[0.6rem] font-bold text-[var(--color-ink-muted)]">
											1v1
										</span>
									) : null}
								</div>
								{columns.map((col, colIndex) => {
									const pending = isCourtPending(court.id);
									// A pending (rate-limited, retrying) court shows a shimmer, not
									// "unavailable" cells — its real availability is still loading.
									if (pending) {
										return (
											<div
												key={col.key}
												className="h-10 shrink-0 animate-pulse rounded-md bg-[var(--color-surface-2)]/50"
												style={{ width: CELL_W }}
											/>
										);
									}
									const available = isFree(court.id, col.key);
									// Booked cells are plain divs, not disabled buttons: disabled
									// buttons may swallow mouse events, which would leave a stale
									// preview while hovering across them.
									if (!available) {
										return (
											<div
												key={col.key}
												aria-hidden
												onMouseEnter={() => handleCellHover(court.id, colIndex)}
												className="h-10 shrink-0 cursor-not-allowed rounded-md border border-transparent"
												style={BOOKED_CELL_STYLE}
											/>
										);
									}
									const isOpenCell = open?.courtId === court.id && open?.columnKey === col.key;
									const inPreview = isPreviewCell(court.id, colIndex);
									return (
										<button
											key={col.key}
											type="button"
											data-court-cell
											onClick={(e) => handleCellClick(e, court.id, col.key, colIndex)}
											onMouseEnter={() => handleCellHover(court.id, colIndex)}
											aria-label={`Court ${court.number}${court.format === 'singles' ? ' (singles)' : ''} at ${col.label}`}
											className={`h-10 shrink-0 rounded-md border transition-all ${
												isOpenCell || inPreview
													? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
													: 'border-[var(--color-line-strong)] bg-[var(--color-bg)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/20'
											}`}
											style={CELL_STYLE}
										/>
									);
								})}
							</div>
						))}
					</div>
				</div>

				{/* Duration popover: portalled + position:fixed off the clicked cell so the
				    scroll container can't clip it (flips above near the bottom). Durations
				    are picked (previewing spanned cells) and committed via Confirm. */}
				{open && openCourt && openColumn ? (
					<AnchoredPopover ref={popoverRef} anchor={open.anchor}>
						<DurationPopover
							courtTitle={`Court ${openCourt.number}${openCourt.format === 'singles' ? ' · Singles' : ''}`}
							startLabel={openColumn.label}
							options={openOptions}
							currency={currency}
							pickedUnits={pickedUnits}
							hoverUnits={hoverUnits}
							onPick={(opt) => setPickedUnits(opt.units)}
							onHover={setHoverUnits}
							onConfirm={() => {
								const opt = openOptions.find((o) => o.units === pickedUnits);
								if (!opt) return;
								onSelect(openCourt, opt);
								closePopover();
							}}
							onClose={closePopover}
						/>
					</AnchoredPopover>
				) : null}
			</div>
		</div>
	);
}
