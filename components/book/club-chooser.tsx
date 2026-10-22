'use client';

import Image from 'next/image';
import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { useClubAvailability } from '@/hooks/use-club-availability';
import { at, courtsAt, DEFAULT_LENGTH, nextFree, relativeDay, sportOf, todayIn, type Catalogue, type Club } from '@/lib/club';
import { siteConfig } from '@/lib/site-config';

const CARD_INITIAL = { opacity: 0, y: 18 };
const CARD_ANIMATE = { opacity: 1, y: 0 };

/**
 * First visit: "Where are you playing?" One photo card per club with its courts, sports and soonest free court,
 * plus "Near me" (geolocation against each club's coordinates). Picking a club remembers it for next time.
 */
export function ClubChooser({
	cat,
	onPick,
	onLocate,
	canLocate,
	locating,
	distances,
	message,
}: {
	cat: Catalogue;
	onPick: (club: Club) => void;
	onLocate: () => void;
	canLocate: boolean;
	locating: boolean;
	distances: Record<string, number> | null;
	message: string | null;
}) {
	const clubs = useMemo(() => {
		const open = cat.clubs.filter((c) => c.courtCount > 0);
		return distances ? [...open].sort((a, b) => (distances[a.id] ?? 1e9) - (distances[b.id] ?? 1e9)) : open;
	}, [cat.clubs, distances]);

	return (
		<section className="relative min-h-screen overflow-hidden bg-[var(--color-bg)] px-4 pb-20 pt-28 sm:px-6 lg:px-10">
			<span aria-hidden className="pointer-events-none absolute -top-48 right-[-10%] h-[520px] w-[520px] rounded-full bg-[var(--color-primary)]/10 blur-3xl" />
			<div className="relative mx-auto max-w-[1600px]">
				<div className="flex flex-wrap items-end justify-between gap-6">
					<div>
						<span className="chip">{siteConfig.clubs.eyebrow}</span>
						<h1 className="heading-display mt-4 text-4xl text-[var(--color-ink)] sm:text-6xl">
							Where are you <span className="text-[var(--color-primary)]">playing?</span>
						</h1>
						<p className="mt-3 max-w-xl text-[var(--color-ink-muted)]">
							Pick your club. We’ll remember it, so next time you land straight on its courts.
						</p>
					</div>
					{canLocate ? (
						<button
							type="button"
							onClick={onLocate}
							disabled={locating}
							className="inline-flex items-center gap-2 rounded-full border border-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-60"
						>
							<svg className={clsx('h-4 w-4', locating && 'animate-spin')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
								<circle cx="12" cy="12" r="3" />
								<path strokeLinecap="round" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
							</svg>
							{locating ? 'Finding you…' : 'Near me'}
						</button>
					) : null}
				</div>
				{message ? <p className="mt-4 text-sm text-[var(--color-ink-muted)]">{message}</p> : null}

				<div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					{clubs.map((club, i) => (
						<motion.div key={club.id} initial={CARD_INITIAL} animate={CARD_ANIMATE} transition={{ duration: 0.45, delay: Math.min(i * 0.06, 0.3) }}>
							<ClubCard club={club} cat={cat} km={distances?.[club.id] ?? null} onPick={onPick} />
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}

const ClubCard = memo(function ClubCard({ club, cat, km, onPick }: { club: Club; cat: Catalogue; km: number | null; onPick: (club: Club) => void }) {
	const { ranges, loading } = useClubAvailability(club.id);
	const courts = useMemo(() => courtsAt(cat, club.id), [cat, club.id]);
	const soonest = useMemo(() => nextFree(courts, ranges, DEFAULT_LENGTH), [courts, ranges]);
	const today = todayIn(club.tz);

	return (
		<button
			type="button"
			onClick={() => onPick(club)}
			className="group relative flex aspect-[4/5] w-full flex-col justify-end overflow-hidden rounded-[28px] border border-[var(--color-line)] text-left transition-colors hover:border-[var(--color-primary)]"
		>
						<Image src={`/images/${club.image}`} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.05]" />
			<span className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
			{km !== null ? (
				<span className="absolute right-4 top-4 rounded-full bg-black/60 px-3 py-1 font-mono text-[0.7rem] font-semibold text-white backdrop-blur">
					{km < 10 ? km.toFixed(1) : Math.round(km)} km
				</span>
			) : null}
			<span className="relative block p-5 sm:p-6">
				<span className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.22em] text-[var(--color-primary)]">
					{club.courtCount} courts · {club.sports.map((s) => sportOf(s).label).join(' + ')}
				</span>
				<span className="heading-display mt-1 block text-3xl text-white sm:text-4xl">{club.name}</span>
				{club.address ? <span className="mt-1 block truncate text-sm text-white/65">{club.address}</span> : null}
				<span className="mt-4 flex items-center justify-between gap-3 border-t border-white/15 pt-3">
					<span className="text-[0.78rem] text-white/70">
						{loading ? (
							'Checking courts…'
						) : soonest !== null ? (
							<>
								Next free · <span className="font-semibold text-white">{relativeDay(at(soonest, club.tz, 'YYYY-MM-DD'), today)} {at(soonest, club.tz, 'HH:mm')}</span>
							</>
						) : (
							'Fully booked this fortnight'
						)}
					</span>
					<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white transition-transform group-hover:translate-x-1">
						<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
						</svg>
					</span>
				</span>
			</span>
		</button>
	);
});
