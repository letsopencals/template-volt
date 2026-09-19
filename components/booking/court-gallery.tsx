'use client';

/**
 * "The Courts" gallery shown below the booking grid. Each court gets its own photo
 * so players can see exactly where they'll be playing. Images are static template
 * assets (`/images/courts/<sport>-<n>.jpg`) mapped to courts by their sorted position
 * (the grid route returns courts ordered by number). Clicking a card opens a
 * full-screen lightbox with prev/next navigation. Re-animates on sport switch.
 */

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import type { CourtGridCourt } from '@/app/api/courts/[collection]/route';

const CARD_INITIAL = { opacity: 0, y: 16 };
const CARD_ANIMATE = { opacity: 1, y: 0 };
const OVERLAY_MOTION = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
const IMG_MOTION = {
	initial: { opacity: 0, scale: 0.96 },
	animate: { opacity: 1, scale: 1 },
	exit: { opacity: 0, scale: 0.96 },
	transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const },
};

const courtImg = (sport: string, i: number) => `/images/courts/${sport}-${i + 1}.jpg`;

function Lightbox({
	sport,
	courts,
	index,
	onClose,
	onStep,
}: {
	sport: 'padel' | 'squash';
	courts: CourtGridCourt[];
	index: number;
	onClose: () => void;
	onStep: (delta: number) => void;
}) {
	const court = courts[index];

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
			if (e.key === 'ArrowRight') onStep(1);
			if (e.key === 'ArrowLeft') onStep(-1);
		};
		window.addEventListener('keydown', onKey);
		// lock body scroll while open
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			window.removeEventListener('keydown', onKey);
			document.body.style.overflow = prevOverflow;
		};
	}, [onClose, onStep]);

	if (!court) return null;

	return (
		<motion.div
			{...OVERLAY_MOTION}
			transition={{ duration: 0.2 }}
			className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--color-bg-deep)]/92 p-4 backdrop-blur-sm sm:p-8"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-label={`${court.variantTitle} — full screen`}
		>
			{/* Close */}
			<button
				type="button"
				onClick={onClose}
				aria-label="Close"
				className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-line-strong)] bg-[var(--color-surface)]/70 text-[var(--color-ink)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
			>
				<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
					<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>

			{courts.length > 1 ? (
				<>
					<button
						type="button"
						onClick={(e) => { e.stopPropagation(); onStep(-1); }}
						aria-label="Previous court"
						className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-line-strong)] bg-[var(--color-surface)]/70 text-[var(--color-ink)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] sm:left-6"
					>
						<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
						</svg>
					</button>
					<button
						type="button"
						onClick={(e) => { e.stopPropagation(); onStep(1); }}
						aria-label="Next court"
						className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-line-strong)] bg-[var(--color-surface)]/70 text-[var(--color-ink)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] sm:right-6"
					>
						<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
						</svg>
					</button>
				</>
			) : null}

			<motion.figure
				key={court.id}
				{...IMG_MOTION}
				className="relative flex max-h-full w-full max-w-5xl flex-col"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl border border-[var(--color-line)]">
					<Image src={courtImg(sport, index)} alt={court.variantTitle} fill sizes="90vw" className="object-cover" priority />
				</div>
				<figcaption className="mt-3 flex items-center justify-between">
					<span className="heading-display text-lg text-[var(--color-ink)]">{court.variantTitle}</span>
					<span className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-[var(--color-ink-dim)]">
						{index + 1} / {courts.length}
					</span>
				</figcaption>
			</motion.figure>
		</motion.div>
	);
}

export function CourtGallery({ sport, courts }: { sport: 'padel' | 'squash'; courts: CourtGridCourt[] }) {
	const [openIndex, setOpenIndex] = useState<number | null>(null);

	// Close the lightbox whenever the sport (and thus the court set) changes.
	useEffect(() => {
		setOpenIndex(null);
	}, [sport]);

	const step = useCallback(
		(delta: number) => {
			setOpenIndex((cur) => (cur === null ? cur : (cur + delta + courts.length) % courts.length));
		},
		[courts.length],
	);

	if (courts.length === 0) return null;

	return (
		<section className="mt-16">
			<div className="flex items-end justify-between gap-4">
				<div>
					<span className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[var(--color-primary)]">
						{'///'} The courts
					</span>
					<h2 className="heading-display mt-2 text-2xl uppercase text-[var(--color-ink)] lg:text-3xl">
						{courts.length} {sport} courts
					</h2>
				</div>
				<p className="hidden max-w-xs text-sm text-[var(--color-ink-muted)] sm:block">
					Tap any court to see it full screen — so you know exactly where you’ll be playing.
				</p>
			</div>

			{/* key by sport so the cards remount + re-animate on toggle */}
			<div key={sport} className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
				{courts.map((court, i) => (
					<motion.button
						type="button"
						key={court.id}
						onClick={() => setOpenIndex(i)}
						initial={CARD_INITIAL}
						animate={CARD_ANIMATE}
						transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.4) }}
						aria-label={`Expand ${court.variantTitle}`}
						className="group relative overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] text-left transition-colors hover:border-[var(--color-primary)]/50"
					>
						<div className="relative aspect-[3/2] overflow-hidden">
							<Image
								src={courtImg(sport, i)}
								alt={court.variantTitle}
								fill
								sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
								className="object-cover transition-transform duration-500 group-hover:scale-105"
							/>
							<div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)]/75 via-transparent to-transparent" />
							{/* expand affordance */}
							<span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-bg-deep)]/60 text-[var(--color-ink)] opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
								<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
									<path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
								</svg>
							</span>
							<span className="absolute bottom-2 left-2.5 heading-display text-sm text-[var(--color-ink)]">
								{court.variantTitle}
							</span>
						</div>
					</motion.button>
				))}
			</div>

			<AnimatePresence>
				{openIndex !== null ? (
					<Lightbox
						sport={sport}
						courts={courts}
						index={openIndex}
						onClose={() => setOpenIndex(null)}
						onStep={step}
					/>
				) : null}
			</AnimatePresence>
		</section>
	);
}
