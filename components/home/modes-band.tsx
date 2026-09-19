'use client';

/**
 * Two ways to play — the two booking modes (Book a Court / Train with a Coach)
 * as big kicker-labelled cards linking to /book and /training.
 */

import Link from 'next/link';
import { motion } from 'framer-motion';
import { siteConfig } from '@/lib/site-config';

const CARD_MOTION = {
	initial: { opacity: 0, y: 24 },
	whileInView: { opacity: 1, y: 0 },
	viewport: { once: true, margin: '-60px' },
};

export function ModesBand() {
	const { modes } = siteConfig;

	return (
		<section className="relative bg-[var(--color-bg)] py-20 lg:py-28">
			<div className="mx-auto max-w-[1400px] px-6 lg:px-10">
				<div className="max-w-2xl">
					<span className="chip">
						<span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
						{modes.eyebrow}
					</span>
					<h2 className="heading-display mt-5 whitespace-pre-line text-4xl text-[var(--color-ink)] lg:text-5xl">
						{modes.heading}
					</h2>
					<p className="mt-5 text-lg leading-relaxed text-[var(--color-ink-muted)]">{modes.body}</p>
				</div>

				<div className="mt-12 grid gap-6 lg:grid-cols-2">
					{modes.cards.map((card, i) => (
						<motion.div key={card.key} {...CARD_MOTION} transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}>
							<Link
								href={card.cta.href}
								className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-8 transition-all hover:-translate-y-1 hover:border-[var(--color-primary)]/30 hover:card-shadow-lg lg:p-10"
							>
								{/* diagonal-stripe corner */}
								<span
									aria-hidden
									className="pointer-events-none absolute right-0 top-0 h-40 w-40 opacity-[0.5] transition-opacity group-hover:opacity-100"
									style={{
										backgroundImage:
											'repeating-linear-gradient(135deg, var(--color-line) 0px, var(--color-line) 1px, transparent 1px, transparent 12px)',
									}}
								/>
								<span className="relative font-display text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-[var(--color-primary)]">
									{card.kicker}
								</span>
								<h3 className="heading-display relative mt-6 text-3xl text-[var(--color-ink)] lg:text-4xl">{card.title}</h3>
								<p className="relative mt-4 flex-1 text-base leading-relaxed text-[var(--color-ink-muted)]">{card.body}</p>
								<span className="relative mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">
									{card.cta.label}
									<svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
										<path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
									</svg>
								</span>
							</Link>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
