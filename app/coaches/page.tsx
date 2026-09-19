'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { siteConfig } from '@/lib/site-config';

type Coach = (typeof siteConfig.coaches)[number];

const HERO_INITIAL = { opacity: 0, y: 24 };
const HERO_ANIMATE = { opacity: 1, y: 0 };
const CARD_INITIAL = { opacity: 0, y: 24 };
const CARD_ANIMATE = { opacity: 1, y: 0 };

function initialsFor(name: string): string {
	return name
		.split(' ')
		.map((p) => p[0])
		.slice(0, 2)
		.join('')
		.toUpperCase();
}

/** Sport tag colours: padel = electric orange, squash = steel. */
function sportStyle(sport: string): React.CSSProperties {
	const squash = sport.toLowerCase() === 'squash';
	return {
		color: squash ? 'var(--color-sage)' : 'var(--color-primary)',
		background: squash ? 'var(--color-sage-soft)' : 'var(--color-tint)',
	};
}

function CoachCard({ coach, index }: { coach: Coach; index: number }) {
	// Primary sport drives the training CTA link.
	const primarySport = coach.sports[0]?.toLowerCase() ?? 'padel';

	return (
		<motion.article
			initial={CARD_INITIAL}
			whileInView={CARD_ANIMATE}
			viewport={{ once: true, margin: '-60px' }}
			transition={{ duration: 0.55, delay: Math.min(index * 0.06, 0.3) }}
			className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] transition-all hover:-translate-y-1 hover:border-[var(--color-primary)]/40 hover:card-shadow-lg"
		>
			{/* Portrait */}
			<div className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--color-surface-2)]">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={`/images/${coach.image}`}
					alt={coach.name}
					className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
				/>
				{/* fallback initials sit behind the img; if the img fails to load its
				    transparent area reveals them. */}
				<div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
					<span className="heading-display text-5xl text-[var(--color-ink-dim)]">
						{initialsFor(coach.name)}
					</span>
				</div>
				<div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/40 to-transparent" />
				{/* sport tags over the portrait */}
				<div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
					{coach.sports.map((s) => (
						<span
							key={s}
							className="rounded-full px-2.5 py-1 font-display text-[0.6rem] font-semibold uppercase tracking-[0.16em]"
							style={sportStyle(s)}
						>
							{s}
						</span>
					))}
				</div>
			</div>

			{/* Body */}
			<div className="flex flex-1 flex-col p-6">
				<h2 className="heading-display text-xl text-[var(--color-ink)]">{coach.name}</h2>
				<p className="mt-1 font-display text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
					{coach.role}
				</p>
				<p className="mt-4 text-sm leading-relaxed text-[var(--color-ink-muted)]">{coach.bio}</p>

				{/* Stats */}
				<div className="mt-auto grid grid-cols-2 gap-3 pt-5">
					<div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2.5">
						<p className="font-display text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-dim)]">
							Experience
						</p>
						<p className="heading-display mt-0.5 text-base text-[var(--color-ink)]">{coach.stats.experience}</p>
					</div>
					<div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2.5">
						<p className="font-display text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-dim)]">
							Level
						</p>
						<p className="heading-display mt-0.5 text-base text-[var(--color-ink)]">{coach.stats.level}</p>
					</div>
				</div>

				<Link
					href={`/training?sport=${primarySport}`}
					className="group/cta mt-6 inline-flex items-center justify-center gap-2 rounded-full border border-[var(--color-line-strong)] px-5 py-3 font-display text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink)] transition-all hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
				>
					Train with {coach.name.split(' ')[0]}
					<svg className="h-4 w-4 transition-transform group-hover/cta:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
					</svg>
				</Link>
			</div>
		</motion.article>
	);
}

export default function CoachesPage() {
	const section = siteConfig.coachesSection;

	return (
		<>
			{/* Hero */}
			<section className="relative overflow-hidden bg-[var(--color-bg)] pt-32 pb-14 lg:pt-40 lg:pb-16">
				<div className="mx-auto max-w-[1400px] px-6 lg:px-10">
					<motion.p
						initial={HERO_INITIAL}
						animate={HERO_ANIMATE}
						transition={{ duration: 0.6 }}
						className="font-display text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[var(--color-primary)]"
					>
						{section.eyebrow}
					</motion.p>
					<motion.h1
						initial={HERO_INITIAL}
						animate={HERO_ANIMATE}
						transition={{ duration: 0.7, delay: 0.1 }}
						className="heading-display mt-4 whitespace-pre-line text-5xl text-[var(--color-ink)] md:text-6xl lg:text-7xl"
					>
						{section.heading}
					</motion.h1>
					<motion.p
						initial={HERO_INITIAL}
						animate={HERO_ANIMATE}
						transition={{ duration: 0.6, delay: 0.2 }}
						className="mt-7 max-w-xl text-lg leading-relaxed text-[var(--color-ink-muted)]"
					>
						{section.body}
					</motion.p>
				</div>
			</section>

			{/* Grid */}
			<section className="bg-[var(--color-bg)] pb-24 lg:pb-32">
				<div className="mx-auto max-w-[1400px] px-6 lg:px-10">
					<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{siteConfig.coaches.map((coach, i) => (
							<CoachCard key={coach.slug} coach={coach} index={i} />
						))}
					</div>

					{/* Book CTA band */}
					<div className="mt-16 flex flex-col items-start justify-between gap-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-8 lg:flex-row lg:items-center lg:p-10">
						<div>
							<h2 className="heading-display text-2xl text-[var(--color-ink)] lg:text-3xl">
								Ready to level up?
							</h2>
							<p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--color-ink-muted)]">
								Book an individual lesson or a small-group class with any of our coaches.
							</p>
						</div>
						<Link
							href="/training"
							className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--color-primary)] px-7 py-4 font-display text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[var(--color-primary-bright)]"
						>
							Browse training
							<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
							</svg>
						</Link>
					</div>
				</div>
			</section>
		</>
	);
}
