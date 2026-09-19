'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { siteConfig } from '@/lib/site-config';

const BAND_MOTION = { initial: { opacity: 0, scale: 1.04 }, whileInView: { opacity: 1, scale: 1 }, viewport: { once: true, margin: '-80px' }, transition: { duration: 1, ease: [0.22, 1, 0.36, 1] as const } };

function ClubPhotoBand() {
	return (
		<motion.section {...BAND_MOTION} className="relative h-[42vh] min-h-[320px] w-full overflow-hidden lg:h-[56vh]">
			<Image src="/images/about/club.jpg" alt={`Inside ${siteConfig.name}`} fill priority className="object-cover" sizes="100vw" />
			<div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] via-transparent to-[var(--color-bg)]/40" />
			<span className="absolute bottom-6 left-6 flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[var(--color-ink)] lg:left-10">
				<span className="text-[var(--color-primary)]">{'///'}</span> Madrid · Two sports · One roof
			</span>
		</motion.section>
	);
}

const HERO_EYEBROW_MOTION = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay: 0.1 } };
const HERO_HEADING_MOTION = { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay: 0.2 } };
const HERO_BODY_MOTION = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay: 0.4 } };

function StorySection() {
	const ref = useRef<HTMLDivElement>(null);
	const isInView = useInView(ref, { once: true, margin: '-100px' });
	const { about, statsBand } = siteConfig;

	return (
		<section ref={ref} className="bg-[var(--color-bg)] py-section-sm lg:py-section">
			<div className="mx-auto max-w-[1400px] px-6 lg:px-10">
				<div className="grid items-start gap-16 lg:grid-cols-2">
					{/* Story */}
					<div>
						<motion.p
							initial={{ opacity: 0, y: 20 }}
							animate={isInView ? { opacity: 1, y: 0 } : {}}
							transition={{ duration: 0.6, delay: 0.2 }}
							className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[var(--color-primary)]"
						>
							Our Story
						</motion.p>
						<motion.h2
							initial={{ opacity: 0, y: 30 }}
							animate={isInView ? { opacity: 1, y: 0 } : {}}
							transition={{ duration: 0.7, delay: 0.3 }}
							className="heading-display mt-4 text-4xl uppercase text-[var(--color-ink)] md:text-5xl"
						>
							Built around <span className="text-[var(--color-primary)]">the game.</span>
						</motion.h2>
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={isInView ? { opacity: 1, y: 0 } : {}}
							transition={{ duration: 0.6, delay: 0.5 }}
							className="mt-8 space-y-4 text-base leading-relaxed text-[var(--color-ink-muted)]"
						>
							{about.storyParagraphs.map((p, i) => (
								<p key={i}>{p}</p>
							))}
						</motion.div>
					</div>

					{/* Stats panel */}
					<motion.div
						initial={{ opacity: 0, x: 30 }}
						animate={isInView ? { opacity: 1, x: 0 } : {}}
						transition={{ duration: 0.8, delay: 0.3 }}
						className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-[var(--color-line)] bg-[var(--color-line)]"
					>
						{statsBand.stats.map((stat) => (
							<div key={stat.label} className="bg-[var(--color-surface)] p-8 lg:p-10">
								<p className="heading-display text-5xl text-[var(--color-primary)] lg:text-6xl">{stat.value}</p>
								<p className="mt-2 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">
									{stat.label}
								</p>
							</div>
						))}
					</motion.div>
				</div>
			</div>
		</section>
	);
}

export default function AboutPage() {
	const { about } = siteConfig;

	return (
		<>
			{/* Page hero */}
			<section className="relative overflow-hidden bg-[var(--color-bg)] pt-32 pb-20 lg:pt-40 lg:pb-28">
				<span
					aria-hidden
					className="pointer-events-none absolute inset-0 opacity-[0.3]"
					style={{
						backgroundImage:
							'repeating-linear-gradient(135deg, var(--color-line) 0px, var(--color-line) 1px, transparent 1px, transparent 22px)',
					}}
				/>
				<div className="relative mx-auto max-w-[1400px] px-6 lg:px-10">
					<motion.p {...HERO_EYEBROW_MOTION} className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[var(--color-primary)]">
						{about.heroEyebrow}
					</motion.p>
					<motion.h1
						{...HERO_HEADING_MOTION}
						className="heading-display mt-4 text-6xl uppercase text-[var(--color-ink)] md:text-7xl lg:text-8xl"
					>
						{about.heroHeading.map((line, i) => (
							<span key={i}>
								{line}
								<br />
							</span>
						))}
						<span className="text-[var(--color-primary)]">{about.heroHeadingAccent}</span>
					</motion.h1>
					<motion.p {...HERO_BODY_MOTION} className="mt-8 max-w-xl text-lg leading-relaxed text-[var(--color-ink-muted)]">
						{about.heroBody}
					</motion.p>
				</div>
			</section>

			<ClubPhotoBand />

			<StorySection />

			{/* Bottom CTA */}
			<section className="bg-[var(--color-bg-deep)] py-20 lg:py-28">
				<div className="mx-auto max-w-[1400px] px-6 text-center lg:px-10">
					<h2 className="heading-display text-4xl uppercase text-[var(--color-ink)] md:text-5xl">{about.bottomCta}</h2>
					<p className="mx-auto mt-4 max-w-md text-base text-[var(--color-ink-muted)]">{about.bottomCtaBody}</p>
					<div className="mt-8 flex flex-wrap items-center justify-center gap-4">
						<Link
							href="/book"
							className="inline-flex items-center gap-3 rounded-full bg-[var(--color-primary)] px-10 py-4 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-white transition-all hover:bg-[var(--color-primary-bright)]"
						>
							Book a Court
						</Link>
						<Link
							href="/training"
							className="inline-flex items-center gap-3 rounded-full border border-[var(--color-line-strong)] px-10 py-4 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[var(--color-ink)] transition-all hover:border-[var(--color-primary)]/40"
						>
							Train with a Coach
						</Link>
					</div>
				</div>
			</section>
		</>
	);
}
