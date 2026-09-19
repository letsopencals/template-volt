'use client';

import type { ProductListVariantLocation } from '@opencals/storefront-sdk';

interface LocationSelectorProps {
	locations: ProductListVariantLocation[];
	selected: string | null;
	onSelect: (locationId: string) => void;
}

function isOnline(location: ProductListVariantLocation): boolean {
	return location.type === 'online';
}

function subtitleFor(location: ProductListVariantLocation): string {
	if (isOnline(location)) return 'Video or phone visit';
	return location.city ?? 'In person';
}

function PinIcon({ className }: { className?: string }) {
	return (
		<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
			<path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
			<path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
		</svg>
	);
}

function VideoIcon({ className }: { className?: string }) {
	return (
		<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
			<path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
		</svg>
	);
}

export function LocationSelector({ locations, selected, onSelect }: LocationSelectorProps) {
	if (locations.length === 0) return null;

	// Single location — small read-only chip
	if (locations.length === 1) {
		const loc = locations[0]!;
		const online = isOnline(loc);
		return (
			<div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-medium text-[var(--color-ink)]">
				<span className="text-[var(--color-primary)]">
					{online ? <VideoIcon className="h-4 w-4" /> : <PinIcon className="h-4 w-4" />}
				</span>
				{loc.title ?? 'Location'}
				<span className="text-[var(--color-ink-dim)]">· {subtitleFor(loc)}</span>
			</div>
		);
	}

	return (
		<div role="tablist" className="no-scrollbar -mx-2 flex gap-2.5 overflow-x-auto px-2">
			{locations.map((loc) => {
				const isActive = loc.id === selected;
				const online = isOnline(loc);
				return (
					<button
						key={loc.id}
						role="tab"
						aria-selected={isActive}
						type="button"
						onClick={() => onSelect(loc.id)}
						className={`flex min-w-[150px] shrink-0 items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
							isActive
								? 'border-[var(--color-primary)] bg-[var(--color-bg)]'
								: 'border-[var(--color-line-strong)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/40'
						}`}
					>
						<span
							className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
								isActive ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-brass-soft)] text-[var(--color-primary)]'
							}`}
						>
							{online ? <VideoIcon className="h-5 w-5" /> : <PinIcon className="h-5 w-5" />}
						</span>
						<span className="min-w-0">
							<span className="block truncate text-sm font-semibold text-[var(--color-ink)]">
								{online ? 'Online visit' : (loc.title ?? 'Location')}
							</span>
							<span className="block truncate text-xs text-[var(--color-ink-dim)]">{subtitleFor(loc)}</span>
						</span>
					</button>
				);
			})}
		</div>
	);
}
