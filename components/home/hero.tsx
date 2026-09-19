'use client';

/**
 * Hero — full-bleed cinematic sport opener.
 *
 * A full-viewport background (looping video if `videoSrc` is present, otherwise the
 * cinematic still) sits behind a dark scrim; the oversized mono headline, dual CTA
 * and a live availability chip are overlaid bottom-left, with a technical stat bar
 * pinned to the bottom edge. Deliberately unlike the clinic template's split layout.
 *
 * `videoSrc` is resolved on the server (see app/page.tsx) by checking whether a
 * `public/videos/hero.mp4` exists, so the hero upgrades to video automatically when
 * one is dropped in — and falls back to the still image with zero code changes.
 */

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { siteConfig } from '@/lib/site-config';
import { Button } from '@/components/ui/button';

const fadeUp = {
	hidden: { opacity: 0, y: 24 },
	show: (i: number) => ({
		opacity: 1,
		y: 0,
		transition: { duration: 0.7, delay: 0.1 * i, ease: [0.22, 1, 0.36, 1] as const },
	}),
};

const CHIP_MOTION = {
	initial: { opacity: 0, y: 12 },
	animate: { opacity: 1, y: 0 },
	transition: { delay: 0.7, duration: 0.5 },
};

const HERO_IMAGE = '/images/hero/hero-full.jpg';

export function Hero({ videoSrc }: { videoSrc?: string | null }) {
	const { hero } = siteConfig;
	const videoRef = useRef<HTMLVideoElement>(null);

	// React doesn't reliably set the `muted` DOM property from the `muted` prop, so
	// Chrome treats the video as unmuted and blocks autoplay. Force it muted and kick
	// off playback once mounted; if the browser still blocks it, the poster shows.
	useEffect(() => {
		const v = videoRef.current;
		if (!v) return;
		v.muted = true;
		v.play().catch(() => {
			/* autoplay blocked — poster image remains visible */
		});
	}, [videoSrc]);

	return (
		<section
			id="hero"
			className="relative flex min-h-[100svh] w-full flex-col justify-end overflow-hidden bg-[var(--color-bg-deep)]"
		>
			{/* ── Full-bleed background media ── */}
			<div className="absolute inset-0">
				{videoSrc ? (
					<video
						ref={videoRef}
						className="h-full w-full object-cover"
						autoPlay
						muted
						loop
						playsInline
						preload="auto"
						poster={HERO_IMAGE}
					>
						<source src={videoSrc} type="video/mp4" />
					</video>
				) : (
					<Image
						src={HERO_IMAGE}
						alt={siteConfig.name}
						fill
						priority
						sizes="100vw"
						className="object-cover object-center"
					/>
				)}
			</div>

			{/* scrims: darken bottom-left for legibility, keep the action visible top-right */}
			<div
				aria-hidden
				className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-deep)] via-[var(--color-bg-deep)]/55 to-transparent"
			/>
			<div
				aria-hidden
				className="absolute inset-0 bg-gradient-to-r from-[var(--color-bg-deep)]/85 via-[var(--color-bg-deep)]/30 to-transparent"
			/>
			{/* diagonal-stripe technical texture */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 opacity-[0.18]"
				style={{
					backgroundImage:
						'repeating-linear-gradient(135deg, var(--color-ink) 0px, var(--color-ink) 1px, transparent 1px, transparent 24px)',
				}}
			/>

			{/* ── Top label rail ── */}
			<div className="absolute inset-x-0 top-0 z-10 pt-28 lg:pt-32">
				<div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 lg:px-10">
					<motion.span variants={fadeUp} custom={0} initial="hidden" animate="show" className="chip">
						<span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
						{hero.eyebrow}
					</motion.span>
					<motion.span
						{...CHIP_MOTION}
						className="hidden items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[var(--color-ink-muted)] sm:flex"
					>
						<span className="text-[var(--color-primary)]">{'///'}</span> {siteConfig.logo.text}
					</motion.span>
				</div>
			</div>

			{/* ── Headline + CTA (bottom-left) ── */}
			<div className="relative z-10 mx-auto w-full max-w-[1400px] px-6 pb-10 lg:px-10 lg:pb-14">
				<motion.h1
					variants={fadeUp}
					custom={1}
					initial="hidden"
					animate="show"
					className="heading-display text-[3.75rem] uppercase leading-[0.9] text-[var(--color-ink)] sm:text-8xl lg:text-[10rem]"
				>
					{hero.heading.map((line) => (
						<span key={line} className="block">
							{line}
						</span>
					))}
					<span className="block text-[var(--color-primary)]">{hero.headingAccent}</span>
				</motion.h1>

				<div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
					<motion.p
						variants={fadeUp}
						custom={2}
						initial="hidden"
						animate="show"
						className="max-w-md text-lg leading-relaxed text-[var(--color-ink-muted)]"
					>
						{hero.body}
					</motion.p>

					<motion.div
						variants={fadeUp}
						custom={3}
						initial="hidden"
						animate="show"
						className="flex flex-wrap items-center gap-3"
					>
						<Link href={hero.primaryCta.href}>
							<Button variant="primary" size="lg">
								{hero.primaryCta.label}
							</Button>
						</Link>
						<Link href={hero.secondaryCta.href}>
							<Button variant="outline" size="lg">
								{hero.secondaryCta.label}
							</Button>
						</Link>
					</motion.div>
				</div>
			</div>

			{/* ── Technical stat bar (bottom edge) ── */}
			<motion.div
				variants={fadeUp}
				custom={4}
				initial="hidden"
				animate="show"
				className="relative z-10 border-t border-[var(--color-line)]/60 bg-[var(--color-bg-deep)]/40 backdrop-blur-sm"
			>
				<div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-10 gap-y-4 px-6 py-5 lg:px-10">
					{hero.stats.map((stat) => (
						<div key={stat.label} className="flex items-baseline gap-2.5">
							<span className="heading-display text-2xl text-[var(--color-ink)] lg:text-3xl">{stat.value}</span>
							<span className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[var(--color-ink-dim)]">
								{stat.label}
							</span>
						</div>
					))}

					{/* live availability chip, pushed right */}
					<span className="ml-auto flex items-center gap-2.5 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)]/60 px-4 py-2">
						<span className="relative flex h-2.5 w-2.5">
							<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-primary)] opacity-60" />
							<span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />
						</span>
						<span className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-[var(--color-ink-dim)]">
							{hero.availabilityChip.label}
						</span>
						<span className="text-sm font-semibold text-[var(--color-ink)]">{hero.availabilityChip.value}</span>
					</span>
				</div>
			</motion.div>
		</section>
	);
}
