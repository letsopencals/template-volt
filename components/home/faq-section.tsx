'use client';

import Link from 'next/link';
import { siteConfig } from '@/lib/site-config';
import { FaqAccordion } from '@/components/ui/faq-accordion';

export function FaqSection() {
	return (
		<section id="faq" className="scroll-mt-24 bg-[var(--color-bg)] py-20 lg:py-28">
			<div className="mx-auto grid max-w-[1400px] gap-12 px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:px-10">
				{/* Left: sticky intro + support card */}
				<div className="lg:sticky lg:top-28 lg:self-start">
					<span className="chip">
						<span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
						Good to Know
					</span>
					<h2 className="heading-display mt-5 text-4xl leading-[1.05] text-[var(--color-ink)] lg:text-5xl">
						Questions, <span className="text-[var(--color-primary)]">answered</span>
					</h2>
					<p className="mt-5 max-w-sm text-lg leading-relaxed text-[var(--color-ink-muted)]">
						Everything you need to know before you book your first court.
					</p>

					<div className="mt-8 rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6 card-shadow">
						<span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-tint)] text-[var(--color-primary)]">
							<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12a8 8 0 01-11.5 7.2L3 21l1.8-6.5A8 8 0 1121 12z" />
							</svg>
						</span>
						<h3 className="mt-4 text-base font-semibold text-[var(--color-ink)]">Still have questions?</h3>
						<p className="mt-1.5 text-sm leading-relaxed text-[var(--color-ink-muted)]">
							Our team is happy to help you get on court.
						</p>
						<Link
							href="/contact"
							className="group mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[var(--color-primary-bright)]"
						>
							Contact us
							<svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
							</svg>
						</Link>
					</div>
				</div>

				{/* Right: accordion */}
				<div>
					<FaqAccordion items={siteConfig.faqs} />
				</div>
			</div>
		</section>
	);
}
