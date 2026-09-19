'use client';

/**
 * Process strip — "Court booked in four taps." Four numbered steps from
 * siteConfig.process, with big mono numerals and a chevron connector.
 */

import { motion } from 'framer-motion';
import { siteConfig } from '@/lib/site-config';

const CARD_MOTION = {
	initial: { opacity: 0, y: 22 },
	whileInView: { opacity: 1, y: 0 },
	viewport: { once: true, margin: '-60px' },
};

export function HowItWorks() {
	const { process } = siteConfig;

	return (
		<section id="how-it-works" className="relative scroll-mt-24 overflow-hidden bg-[var(--color-sand)] py-20 lg:py-28">
			<div className="mx-auto max-w-[1400px] px-6 lg:px-10">
				<div className="max-w-2xl">
					<span className="chip">
						<span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
						{process.eyebrow}
					</span>
					<h2 className="heading-display mt-5 text-4xl text-[var(--color-ink)] lg:text-5xl">
						{process.heading} <span className="text-[var(--color-primary)]">{process.headingAccent}</span>
					</h2>
					<p className="mt-5 text-lg leading-relaxed text-[var(--color-ink-muted)]">{process.body}</p>
				</div>

				<div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
					{process.steps.map((step, i) => (
						<motion.div
							key={step.number}
							{...CARD_MOTION}
							transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
							className="group relative flex flex-col rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-7 transition-all hover:-translate-y-1 hover:border-[var(--color-primary)]/30"
						>
							<span className="heading-display text-5xl text-[var(--color-surface-3)] transition-colors group-hover:text-[var(--color-primary)]">
								{step.number}
							</span>
							<h3 className="mt-5 text-lg font-semibold text-[var(--color-ink)]">{step.title}</h3>
							<p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">{step.body}</p>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
