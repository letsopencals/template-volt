'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CourtGridCourt } from '@/app/api/courts/[collection]/route';
import type { DurationOption, GridColumn } from '@/hooks/use-court-grid';
import { nowInTimezone } from '@/hooks/use-court-grid';
import { DurationPopover } from '@/components/booking/duration-popover';

interface CourtGridProps {
	courts: CourtGridCourt[];
	columns: GridColumn[];
	courtsLoading: boolean;
	slotsLoading: boolean;
	error: boolean;
	date: string;
	timezone: string;
	slotAt: (courtId: string, columnKey: string) => unknown | null;
	durationOptions: (court: CourtGridCourt, columnKey: string) => DurationOption[];
	isCourtPending: (courtId: string) => boolean;
	currency: string | undefined;
	onSelect: (court: CourtGridCourt, option: DurationOption) => void;
}

interface OpenCell {
	courtId: string;
	columnKey: string;
	x: number;
	y: number;
}

// Fixed cell + sticky-label widths. One place so header / rows / now-line align.
const CELL_W = 56; // px — the bigger, comfortable blocks
const CELL_GAP = 4; // px
const LABEL_W = 128; // px — sticky court-name column

/** Live minutes-since-midnight in `timezone` if `date` is today, else null. */
function todayNowMinutes(date: string, timezone: string): number | null {
	const { dateStr, minutes } = nowInTimezone(timezone);
	return dateStr === date ? minutes : null;
}

export function CourtGrid({
	courts,
	columns,
	courtsLoading,
	slotsLoading,
	error,
	date,
	timezone,
	slotAt,
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

	// Close the popover on scroll/resize (its anchor would drift).
	useEffect(() => {
		if (!open) return;
		const el = scrollRef.current;
		const onMove = () => {
			setOpen(null);
			setPickedUnits(null);
			setHoverUnits(null);
		};
		el?.addEventListener('scroll', onMove, { passive: true });
		window.addEventListener('resize', onMove);
		return () => {
			el?.removeEventListener('scroll', onMove);
			window.removeEventListener('resize', onMove);
		};
	}, [open]);

	if (error) {
		return (
			<div className="rounded-3xl border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface)] py-14 text-center">
				<p className="text-sm text-[var(--color-ink-muted)]">Couldn’t load court availability. Please try again.</p>
			</div>
		);
	}

	if (courtsLoading) {
		return (
			<div className="rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
				<div className="space-y-2.5">
					{Array.from({ length: 10 }).map((_, i) => (
						<div key={i} className="h-10 animate-pulse rounded-lg bg-[var(--color-surface-2)]/50" />
					))}
				</div>
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

	const handleCellClick = (
		e: React.MouseEvent<HTMLButtonElement>,
		courtId: string,
		columnKey: string,
	) => {
		const container = scrollRef.current;
		if (!container) return;
		const cell = e.currentTarget.getBoundingClientRect();
		const box = container.getBoundingClientRect();
		const x = cell.left - box.left + container.scrollLeft + cell.width / 2;
		const y = cell.bottom - box.top + container.scrollTop;
		const sameCell = open && open.courtId === courtId && open.columnKey === columnKey;
		setPickedUnits(sameCell ? pickedUnits : null);
		setHoverUnits(null);
		setOpen(sameCell ? null : { courtId, columnKey, x, y });
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
							<div key={court.id} className="flex items-center" style={{ gap: CELL_GAP }}>
								{/* Sticky glass court label */}
								<div
									className="glass-strong sticky left-0 z-20 flex shrink-0 items-center gap-2 rounded-lg px-3 py-2"
									style={{ width: LABEL_W }}
								>
									<span
										className="h-5 w-1 shrink-0 rounded-full"
										style={{ backgroundColor: court.color === 'cyan' ? 'var(--color-sage)' : 'var(--color-primary)' }}
									/>
									<span className="truncate text-sm font-semibold text-[var(--color-ink)]">
										{court.variantTitle}
									</span>
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
									const available = slotAt(court.id, col.key) !== null;
									const isOpen = open?.courtId === court.id && open?.columnKey === col.key;
									const inPreview = isPreviewCell(court.id, colIndex);
									return (
										<button
											key={col.key}
											type="button"
											disabled={!available}
											onClick={(e) => handleCellClick(e, court.id, col.key)}
											aria-label={`${court.variantTitle} at ${col.label}`}
											className={`h-10 shrink-0 rounded-md border transition-all ${
												isOpen || inPreview
													? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
													: available
														? 'border-[var(--color-line-strong)] bg-[var(--color-bg)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/20'
														: 'cursor-not-allowed border-transparent'
											}`}
											style={{
												width: CELL_W,
												...(available || inPreview
													? undefined
													: { backgroundImage: 'repeating-linear-gradient(45deg, var(--color-surface-3) 0 3px, transparent 3px 6px)' }),
											}}
										/>
									);
								})}
							</div>
						))}
					</div>
				</div>

				{/* Duration popover, anchored under the clicked cell. Durations are picked
				    (previewing spanned cells) and committed via Confirm. */}
				{open && openCourt && openColumn ? (
					<>
						<div className="fixed inset-0 z-30" onClick={closePopover} aria-hidden />
						<div className="absolute z-40 -translate-x-1/2" style={{ left: open.x, top: open.y + 6 }}>
							<DurationPopover
								courtTitle={`${openCourt.title} · ${openCourt.variantTitle}`}
								startLabel={openColumn.label}
								options={openOptions}
								currency={currency}
								pickedUnits={pickedUnits}
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
						</div>
					</>
				) : null}
			</div>
		</div>
	);
}
