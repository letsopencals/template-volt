'use client';

import { memo } from 'react';
import { clsx } from 'clsx';

/** Small mono label: section heads, cell labels, chips. */
export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
	return <span className={clsx('font-mono text-[0.66rem] font-bold uppercase tracking-[0.2em]', className)}>{children}</span>;
}

export function initials(name: string): string {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((w) => w[0]!.toUpperCase())
		.join('');
}

/** A player's initials in a disc: orange for the booker, light for the crew. */
export function Monogram({ name, size = 'md', tone = 'light' }: { name: string; size?: 'sm' | 'md'; tone?: 'orange' | 'light' | 'dim' }) {
	return (
		<span
			className={clsx(
				'inline-flex shrink-0 items-center justify-center rounded-full font-mono font-bold',
				size === 'sm' ? 'h-8 w-8 text-[11px]' : 'h-11 w-11 text-[13px]',
				tone === 'orange' ? 'bg-[var(--color-primary)] text-black' : tone === 'light' ? 'bg-[var(--color-ink)] text-black' : 'bg-[var(--color-surface-3)] text-[var(--color-ink-muted)]',
			)}
			aria-hidden
		>
			{initials(name) || '?'}
		</span>
	);
}

interface CounterProps {
	value: number;
	min: number;
	max: number;
	onChange: (v: number) => void;
	label: string;
}

export const Counter = memo(function Counter({ value, min, max, onChange, label }: CounterProps) {
	return (
		<span className="inline-flex items-center rounded-full border border-[var(--color-line-strong)]" role="group" aria-label={label}>
			<button
				type="button"
				onClick={() => onChange(Math.max(min, value - 1))}
				disabled={value <= min}
				aria-label={`Less ${label}`}
				className="flex h-9 w-9 items-center justify-center text-lg text-[var(--color-ink)] disabled:opacity-30"
			>
				−
			</button>
			<span className="min-w-[1.75rem] text-center font-mono text-sm font-bold tabular-nums">{value}</span>
			<button
				type="button"
				onClick={() => onChange(Math.min(max, value + 1))}
				disabled={value >= max}
				aria-label={`More ${label}`}
				className="flex h-9 w-9 items-center justify-center text-lg text-[var(--color-ink)] disabled:opacity-30"
			>
				+
			</button>
		</span>
	);
});

export function ErrorNote({ children }: { children: React.ReactNode }) {
	return (
		<p role="alert" className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
			{children}
		</p>
	);
}

export function Field({ label, required, error, hint, wide, children }: { label: string; required?: boolean; error?: string; hint?: string; wide?: boolean; children: React.ReactNode }) {
	return (
		<label className={clsx('block', wide && 'sm:col-span-2')}>
			<Label className="text-[var(--color-ink-muted)]">
				{label}
				{required ? <span className="text-[var(--color-primary)]"> *</span> : null}
			</Label>
			{hint ? <span className="mt-1 block text-xs text-[var(--color-ink-dim)]">{hint}</span> : null}
			<span className="mt-2 block">{children}</span>
			{error ? <span className="mt-1 block text-xs text-red-300">{error}</span> : null}
		</label>
	);
}

/** A small court from above (landscape) for tiles and the match card. */
export function CourtGlyph({ lit, singles, squash, className }: { lit?: boolean; singles?: boolean; squash?: boolean; className?: string }) {
	const line = lit ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.35)';
	return (
		<svg viewBox="0 0 80 40" className={className} aria-hidden>
			<rect x="1" y="1" width="78" height="38" rx="3" fill={lit ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)'} stroke={line} strokeWidth="1.2" />
			{squash ? (
				<>
					<line x1="4" y1="1" x2="4" y2="39" stroke={line} strokeWidth="2" />
					<line x1="44" y1="1" x2="44" y2="39" stroke={line} strokeWidth="1" />
					<line x1="44" y1="20" x2="79" y2="20" stroke={line} strokeWidth="1" />
				</>
			) : (
				<>
					<line x1="40" y1="0" x2="40" y2="40" stroke={line} strokeWidth="2" />
					<line x1="13" y1="1" x2="13" y2="39" stroke={line} strokeWidth="1" />
					<line x1="67" y1="1" x2="67" y2="39" stroke={line} strokeWidth="1" />
					<line x1="13" y1="20" x2="67" y2="20" stroke={line} strokeWidth="1" />
				</>
			)}
			{singles ? <rect x="1" y="1" width="78" height="38" rx="3" fill="none" stroke={line} strokeWidth="1" strokeDasharray="2 3" /> : null}
		</svg>
	);
}

/** Primary pill (booking actions). */
export const BTN =
	'inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-bright)] disabled:cursor-not-allowed disabled:opacity-40';
/** Outline pill. */
export const BTN_GHOST =
	'inline-flex items-center justify-center gap-2 rounded-full border border-[var(--color-line-strong)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-40';
