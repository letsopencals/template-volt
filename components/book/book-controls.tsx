'use client';

import { memo } from 'react';
import moment from 'moment-timezone';
import { clsx } from 'clsx';
import { GAME_LENGTHS, sportOf, type SportKey } from '@/lib/club';

export type BookView = 'map' | 'grid';

/** 14 days; days with nothing free for this length are struck through (still clickable). */
export const DayStrip = memo(function DayStrip({
	days,
	date,
	today,
	open,
	known,
	onChange,
}: {
	days: string[];
	date: string;
	today: string;
	/** Days with at least one free start */
	open: Set<string>;
	/** Availability has loaded (until then no day is struck through) */
	known: boolean;
	onChange: (d: string) => void;
}) {
	return (
		<div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Day">
			{days.map((d) => {
				const m = moment(d, 'YYYY-MM-DD');
				const on = d === date;
				const full = known && !open.has(d);
				return (
					<button
						key={d}
						type="button"
						aria-pressed={on}
						onClick={() => onChange(d)}
						className={clsx(
							'flex min-w-[58px] flex-1 shrink-0 flex-col items-center rounded-2xl border py-2 transition-colors',
							on
								? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
								: 'border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:border-[var(--color-line-strong)] hover:text-[var(--color-ink)]',
						)}
					>
						<span className={clsx('font-mono text-[0.6rem] font-bold uppercase tracking-[0.14em]', on ? 'text-white/80' : 'text-[var(--color-ink-dim)]')}>
							{d === today ? 'Today' : m.format('ddd')}
						</span>
						<span className={clsx('heading-display text-lg leading-tight tabular-nums', full && !on && 'line-through opacity-40')}>{m.format('D')}</span>
						<span className={clsx('text-[0.6rem]', on ? 'text-white/70' : 'text-[var(--color-ink-dim)]')}>{m.format('MMM')}</span>
					</button>
				);
			})}
		</div>
	);
});

export function Segmented<T extends string | number>({
	label,
	options,
	value,
	onChange,
	render,
}: {
	label: string;
	options: readonly T[];
	value: T;
	onChange: (v: T) => void;
	render: (v: T) => React.ReactNode;
}) {
	return (
		<div className="inline-flex rounded-full border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-1" role="group" aria-label={label}>
			{options.map((o) => (
				<button
					key={String(o)}
					type="button"
					aria-pressed={o === value}
					onClick={() => onChange(o)}
					className={clsx(
						'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
						o === value ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]',
					)}
				>
					{render(o)}
				</button>
			))}
		</div>
	);
}

/** Sport tabs (only the club's sports), game length and the Hall map | Grid switch. */
export function BookToolbar({
	sports,
	sport,
	onSport,
	minutes,
	onMinutes,
	view,
	onView,
}: {
	sports: SportKey[];
	sport: SportKey;
	onSport: (s: SportKey) => void;
	minutes: number;
	onMinutes: (m: number) => void;
	view: BookView;
	onView: (v: BookView) => void;
}) {
	return (
		<div className="flex flex-wrap items-center gap-3">
			{sports.length > 1 ? <Segmented label="Sport" options={sports} value={sport} onChange={onSport} render={(s) => sportOf(s).label} /> : null}
			{view === 'map' ? (
				<Segmented label="Game length" options={GAME_LENGTHS} value={minutes} onChange={onMinutes} render={(m) => `${m} min`} />
			) : null}
			<div className="ml-auto">
				<Segmented
					label="View"
					options={['map', 'grid'] as const}
					value={view}
					onChange={onView}
					render={(v) => (
						<span className="inline-flex items-center gap-2">
							{v === 'map' ? (
								<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
									<rect x="3" y="4" width="7" height="16" rx="1.5" />
									<rect x="14" y="4" width="7" height="16" rx="1.5" />
									<path d="M3 12h7M14 12h7" />
								</svg>
							) : (
								<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
									<path d="M3 6h18M3 12h18M3 18h18M8 3v18M14 3v18" />
								</svg>
							)}
							{v === 'map' ? 'Hall map' : 'Grid'}
						</span>
					)}
				/>
			</div>
		</div>
	);
}
