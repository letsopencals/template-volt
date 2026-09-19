'use client';

/**
 * Booking banner — "READY TO PLAY?" CTA from siteConfig.bookingBanner, on an
 * electric-orange gradient panel with a diagonal-stripe motif.
 */

import Link from 'next/link';
import { motion } from 'framer-motion';
import { siteConfig } from '@/lib/site-config';

const PANEL_MOTION = {
	initial: { opacity: 0, y: 20 },
	whileInView: { opacity: 1, y: 0 },
	viewport: { once: true },
};

export function CtaBand() {
	const { bookingBanner } = siteConfig;

	return (
		<section id="book-cta" className="relative scroll-mt-24 bg-[var(--color-bg)] py-20 lg:py-28">
			<div className="mx-auto max-w-[1400px] px-6 lg:px-10">
				<motion.div
					{...PANEL_MOTION}
					transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
					className="gradient-medical relative overflow-hidden rounded-[2.5rem] px-8 py-16 text-center card-shadow-lg lg:px-16 lg:py-24"
				>
					{/* diagonal-stripe motif */}
					<span
						aria-hidden
						className="pointer-events-none absolute inset-0 opacity-20"
						style={{
							backgroundImage:
								'repeating-linear-gradient(135deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 26px)',
						}}
					/>
					<div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/15 blur-3xl" aria-hidden />

					<div className="relative">
						<h2 className="heading-display mx-auto max-w-2xl text-5xl uppercase leading-[0.95] text-white lg:text-7xl">
							{bookingBanner.heading.join(' ')} <span className="text-[var(--color-bg-deep)]">{bookingBanner.headingAccent}</span>
						</h2>
						<p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-white/85">{bookingBanner.body}</p>

						<div className="mt-9 flex flex-wrap items-center justify-center gap-4">
							<Link
								href={bookingBanner.cta.href}
								className="group inline-flex items-center gap-2.5 rounded-full bg-white px-8 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)] transition-transform hover:-translate-y-0.5 card-shadow"
							>
								{bookingBanner.cta.label}
								<svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
									<path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
								</svg>
							</Link>
							<Link
								href="/training"
								className="inline-flex items-center gap-2 rounded-full border border-white/40 px-8 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-white/10"
							>
								Train with a Coach
							</Link>
						</div>
					</div>
				</motion.div>
			</div>
		</section>
	);
}
