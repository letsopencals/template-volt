'use client';

/**
 * Coaches teaser — a strip of coach portraits (with graceful initials fallback
 * if the image is missing) leading to the full /coaches page.
 */

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { siteConfig } from '@/lib/site-config';

const CARD_MOTION = {
	initial: { opacity: 0, y: 22 },
	whileInView: { opacity: 1, y: 0 },
	viewport: { once: true, margin: '-60px' },
};

function initialsOf(name: string) {
	return name
		.split(' ')
		.map((p) => p.charAt(0))
		.slice(0, 2)
		.join('');
}

function CoachPortrait({ src, name }: { src: string; name: string }) {
	const [failed, setFailed] = useState(false);

	if (failed) {
		return (
			<div className="flex h-full w-full items-center justify-center bg-[var(--color-surface-2)]">
				<span className="heading-display text-5xl text-[var(--color-surface-3)]">{initialsOf(name)}</span>
			</div>
		);
	}

	return (
		<Image
			src={src}
			alt={name}
			fill
			className="object-cover transition-transform duration-500 group-hover:scale-105"
			sizes="(max-width: 640px) 50vw, 25vw"
			onError={() => setFailed(true)}
		/>
	);
}

export function CoachesTeaser() {
	const { coachesSection, coaches } = siteConfig;

	return (
		<section className="relative bg-[var(--color-sand)] py-20 lg:py-28">
			<div className="mx-auto max-w-[1400px] px-6 lg:px-10">
				<div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
					<div className="max-w-2xl">
						<span className="chip">
							<span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
							{coachesSection.eyebrow}
						</span>
						<h2 className="heading-display mt-5 whitespace-pre-line text-4xl text-[var(--color-ink)] lg:text-5xl">
							{coachesSection.heading}
						</h2>
						<p className="mt-5 text-lg leading-relaxed text-[var(--color-ink-muted)]">{coachesSection.body}</p>
					</div>
					<Link
						href="/coaches"
						className="group inline-flex flex-none items-center gap-2 rounded-full border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-6 py-3 text-sm font-semibold text-[var(--color-ink)] transition-all hover:border-[var(--color-primary)]/40"
					>
						Meet the coaches
						<svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
						</svg>
					</Link>
				</div>

				<div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
					{coaches.map((coach, i) => (
						<motion.div key={coach.slug} {...CARD_MOTION} transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}>
							<Link href="/coaches" className="group block">
								<div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-[var(--color-line)]">
									<CoachPortrait src={`/images/${coach.image}`} name={coach.name} />
									<div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-deep)]/70 via-transparent to-transparent" />
									<div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1.5 p-4">
										{coach.sports.map((s) => (
											<span
												key={s}
												className="rounded-full bg-[var(--color-bg-deep)]/70 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)] backdrop-blur"
											>
												{s}
											</span>
										))}
									</div>
								</div>
								<h3 className="mt-5 font-display text-lg font-semibold text-[var(--color-ink)]">{coach.name}</h3>
								<p className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)]">
									{coach.role}
								</p>
							</Link>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
