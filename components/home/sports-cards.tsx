'use client';

/**
 * Sports cards — Padel & Squash, each with diagonal-stripe overlay, court
 * count, price hint, blurb and a "Book {sport}" CTA. Uses each sport's accent
 * colour. Falls back to a tinted gradient if the sport image is missing.
 */

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { siteConfig } from '@/lib/site-config';

const CARD_MOTION = {
	initial: { opacity: 0, y: 24 },
	whileInView: { opacity: 1, y: 0 },
	viewport: { once: true, margin: '-60px' },
};

export function SportsCards() {
	const { sports } = siteConfig;

	return (
		<section className="relative bg-[var(--color-sand)] py-20 lg:py-28">
			<div className="mx-auto max-w-[1400px] px-6 lg:px-10">
				<div className="max-w-2xl">
					<span className="chip">
						<span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
						Two sports, one club
					</span>
					<h2 className="heading-display mt-5 text-4xl text-[var(--color-ink)] lg:text-5xl">
						Pick your <span className="text-[var(--color-primary)]">game.</span>
					</h2>
				</div>

				<div className="mt-12 grid gap-6 lg:grid-cols-2">
					{sports.map((sport, i) => (
						<motion.div key={sport.key} {...CARD_MOTION} transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}>
							<Link
								href={`/book?sport=${sport.key}`}
								className="group relative flex min-h-[26rem] flex-col justify-end overflow-hidden rounded-3xl border border-[var(--color-line)] card-shadow transition-all hover:-translate-y-1 hover:card-shadow-lg"
							>
								{/* image / tinted fallback */}
								<div className="absolute inset-0">
									<Image
										src={`/images/${sport.image}`}
										alt={sport.label}
										fill
										className="object-cover transition-transform duration-700 group-hover:scale-[1.05]"
										sizes="(max-width: 1024px) 100vw, 50vw"
									/>
									<div
										className="absolute inset-0"
										style={{ background: `linear-gradient(160deg, ${sport.accent}22 0%, var(--color-bg-deep) 82%)` }}
									/>
								</div>

								{/* diagonal-stripe overlay in the sport accent */}
								<span
									aria-hidden
									className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen"
									style={{
										backgroundImage: `repeating-linear-gradient(135deg, ${sport.accent}40 0px, ${sport.accent}40 1px, transparent 1px, transparent 24px)`,
									}}
								/>

								{/* court count badge */}
								<span
									className="absolute right-6 top-6 heading-display text-6xl leading-none"
									style={{ color: sport.accent }}
								>
									{sport.courtCount}
									<span className="ml-2 align-top text-[0.7rem] font-semibold uppercase tracking-[0.24em]">courts</span>
								</span>

								{/* body */}
								<div className="relative p-8 lg:p-10">
									<span
										className="text-[0.7rem] font-semibold uppercase tracking-[0.28em]"
										style={{ color: sport.accent }}
									>
										{sport.tagline}
									</span>
									<h3 className="heading-display mt-3 text-4xl uppercase text-[var(--color-ink)]">{sport.label}</h3>
									<p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--color-ink-muted)]">{sport.blurb}</p>
									<div className="mt-6 flex items-center justify-between">
										<span className="text-sm font-semibold text-[var(--color-ink)]">{sport.priceHint}</span>
										<span
											className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-white transition-transform group-hover:translate-x-1"
											style={{ backgroundColor: sport.accent }}
										>
											Book {sport.label}
										</span>
									</div>
								</div>
							</Link>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
