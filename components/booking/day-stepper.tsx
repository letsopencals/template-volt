'use client';

/**
 * A compact ‹ date › stepper for the court grid. Steps a single day at a time
 * (today .. +90d), rendering the localized weekday + date. Emits YYYY-MM-DD in
 * local calendar terms (matching how the grid keys its columns).
 */

const DAY_MS = 86_400_000;

function toDateString(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayString(): string {
	return toDateString(new Date());
}

function parseDateString(dateStr: string): [number, number, number] {
	const parts = dateStr.split('-').map(Number);
	return [parts[0] ?? 1970, parts[1] ?? 1, parts[2] ?? 1];
}

function addDays(dateStr: string, delta: number): string {
	const [y, m, d] = parseDateString(dateStr);
	return toDateString(new Date(y, m - 1, d + delta));
}

export function DayStepper({
	date,
	onChange,
	maxDaysAhead = 90,
}: {
	date: string;
	onChange: (next: string) => void;
	maxDaysAhead?: number;
}) {
	const [ty, tm, td] = parseDateString(todayString());
	const [dy, dm, dd] = parseDateString(date);
	const daysAhead = Math.round(
		(Date.UTC(dy, dm - 1, dd) - Date.UTC(ty, tm - 1, td)) / DAY_MS,
	);
	const atMin = daysAhead <= 0;
	const atMax = daysAhead >= maxDaysAhead;

	const label = new Date(dy, dm - 1, dd).toLocaleDateString('en-US', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
	});
	const relative = daysAhead === 0 ? 'Today' : daysAhead === 1 ? 'Tomorrow' : `+${daysAhead} days`;

	return (
		<div className="inline-flex items-center gap-1 rounded-full border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-1">
			<button
				type="button"
				disabled={atMin}
				onClick={() => onChange(addDays(date, -1))}
				aria-label="Previous day"
				className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-2)] disabled:cursor-not-allowed disabled:opacity-30"
			>
				<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
					<path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
				</svg>
			</button>
			<div className="min-w-[9.5rem] px-3 text-center">
				<p className="heading-display text-sm leading-none text-[var(--color-ink)]">{label}</p>
				<p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
					{relative}
				</p>
			</div>
			<button
				type="button"
				disabled={atMax}
				onClick={() => onChange(addDays(date, 1))}
				aria-label="Next day"
				className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-2)] disabled:cursor-not-allowed disabled:opacity-30"
			>
				<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
					<path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
				</svg>
			</button>
		</div>
	);
}

export { todayString };
