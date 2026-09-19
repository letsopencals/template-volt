'use client';

/**
 * Stats band — four oversized-numeral stats from siteConfig.statsBand.
 */

import { motion } from 'framer-motion';
import { siteConfig } from '@/lib/site-config';

const ITEM_MOTION = {
	initial: { opacity: 0, y: 22 },
	whileInView: { opacity: 1, y: 0 },
	viewport: { once: true, margin: '-60px' },
};

export function StatsBand() {
	const { statsBand } = siteConfig;

	return (
		<section className="noise-overlay relative overflow-hidden bg-[var(--color-bg-deep)] py-20 lg:py-24">
			<div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-10">
				<div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
					{statsBand.stats.map((stat, i) => (
						<motion.div
							key={stat.label}
							{...ITEM_MOTION}
							transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
							className="text-center lg:text-left"
						>
							<p className="heading-display text-6xl text-[var(--color-primary)] lg:text-7xl">{stat.value}</p>
							<p className="mt-2 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">
								{stat.label}
							</p>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
