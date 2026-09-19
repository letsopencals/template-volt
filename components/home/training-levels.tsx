'use client';

/**
 * Training levels strip — four level cards (Starter → Advanced) with big code
 * numerals, driven by siteConfig.trainingLevels.
 */

import Link from 'next/link';
import { motion } from 'framer-motion';
import { siteConfig } from '@/lib/site-config';

const CARD_MOTION = {
	initial: { opacity: 0, y: 22 },
	whileInView: { opacity: 1, y: 0 },
	viewport: { once: true, margin: '-60px' },
};

export function TrainingLevels() {
	const { trainingLevels } = siteConfig;

	return (
		<section className="relative bg-[var(--color-bg)] py-20 lg:py-28">
			<div className="mx-auto max-w-[1400px] px-6 lg:px-10">
				<div className="max-w-2xl">
					<span className="chip">
						<span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
						{trainingLevels.eyebrow}
					</span>
					<h2 className="heading-display mt-5 whitespace-pre-line text-4xl text-[var(--color-ink)] lg:text-5xl">
						{trainingLevels.heading}
					</h2>
					<p className="mt-5 text-lg leading-relaxed text-[var(--color-ink-muted)]">{trainingLevels.body}</p>
				</div>

				<div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-2 lg:grid-cols-4">
					{trainingLevels.levels.map((level, i) => (
						<motion.div
							key={level.code}
							{...CARD_MOTION}
							transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
							className="group relative bg-[var(--color-surface)] p-8 transition-colors hover:bg-[var(--color-surface-2)]"
						>
							<span className="heading-display text-6xl text-[var(--color-surface-3)] transition-colors group-hover:text-[var(--color-primary)]">
								{level.code}
							</span>
							<h3 className="heading-display mt-4 text-xl uppercase text-[var(--color-ink)]">{level.name}</h3>
							<p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-muted)]">{level.blurb}</p>
						</motion.div>
					))}
				</div>

				<div className="mt-8">
					<Link href="/training" className="link-underline text-sm font-semibold text-[var(--color-primary)]">
						Browse all training →
					</Link>
				</div>
			</div>
		</section>
	);
}
