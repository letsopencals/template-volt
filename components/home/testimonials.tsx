'use client';

/**
 * Testimonials — player stories from siteConfig.testimonials. One featured
 * quote on an orange gradient panel, the rest as glassy cards.
 */

import { motion } from 'framer-motion';
import { siteConfig } from '@/lib/site-config';

const avatarTones = [
	'bg-[var(--color-tint)] text-[var(--color-primary)]',
	'bg-[var(--color-sage-soft)] text-[var(--color-sage)]',
	'bg-[var(--color-tint-strong)] text-[var(--color-brass)]',
];

const FEATURED_MOTION = {
	initial: { opacity: 0, y: 22 },
	whileInView: { opacity: 1, y: 0 },
	viewport: { once: true, margin: '-60px' },
};

export function Testimonials() {
	const { testimonials } = siteConfig;
	const [featured, ...rest] = testimonials;

	return (
		<section id="testimonials" className="relative scroll-mt-24 bg-[var(--color-sand)] py-20 lg:py-28">
			<div className="mx-auto max-w-[1400px] px-6 lg:px-10">
				<div className="max-w-2xl">
					<span className="chip">
						<span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
						Player Stories
					</span>
					<h2 className="heading-display mt-5 text-4xl leading-[1.05] text-[var(--color-ink)] lg:text-5xl">
						Loved by players <span className="text-[var(--color-primary)]">across Madrid</span>
					</h2>
				</div>

				<div className="mt-10 grid gap-6 lg:grid-cols-3">
					{featured ? (
						<motion.figure
							{...FEATURED_MOTION}
							transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
							className="gradient-medical relative flex flex-col gap-6 overflow-hidden rounded-[1.75rem] p-8 card-shadow-lg lg:col-span-3 lg:flex-row lg:items-center lg:gap-10 lg:p-10"
						>
							<span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
							<svg aria-hidden className="relative h-12 w-12 flex-none text-white/30" viewBox="0 0 24 24" fill="currentColor">
								<path d="M7 7h4v4c0 3-2 5-5 5V14c1 0 2-1 2-2H7V7zm8 0h4v4c0 3-2 5-5 5v-2c1 0 2-1 2-2h-3V7z" />
							</svg>
							<blockquote className="relative flex-1 text-xl font-medium leading-relaxed text-white lg:text-2xl">
								“{featured.quote}”
							</blockquote>
							<figcaption className="relative flex flex-none items-center gap-3 lg:flex-col lg:items-start lg:gap-4 lg:border-l lg:border-white/20 lg:pl-10">
								<span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-lg font-semibold text-white">
									{featured.author.charAt(0)}
								</span>
								<div>
									<p className="text-sm font-semibold text-white">{featured.author}</p>
									<p className="text-xs text-white/70">{featured.role}</p>
								</div>
							</figcaption>
						</motion.figure>
					) : null}

					{rest.map((t, i) => (
						<motion.figure
							key={t.author}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, margin: '-60px' }}
							transition={{ duration: 0.5, delay: 0.08 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
							className="flex flex-col rounded-[1.75rem] border border-[var(--color-line)] bg-[var(--color-surface)] p-7 card-shadow transition-all hover:-translate-y-1 hover:card-shadow-lg"
						>
							<blockquote className="flex-1 text-[0.95rem] leading-relaxed text-[var(--color-ink)]">
								“{t.quote}”
							</blockquote>
							<figcaption className="mt-6 flex items-center gap-3">
								<span className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${avatarTones[i % avatarTones.length]}`}>
									{t.author.charAt(0)}
								</span>
								<div>
									<p className="text-sm font-semibold text-[var(--color-ink)]">{t.author}</p>
									<p className="text-xs text-[var(--color-ink-dim)]">{t.role}</p>
								</div>
							</figcaption>
						</motion.figure>
					))}
				</div>
			</div>
		</section>
	);
}
