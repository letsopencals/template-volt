'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import type { ProductCollectionProduct, ProductCollectionResponse } from '@opencals/storefront-sdk';
import { formatDuration, formatPrice } from '@/lib/format';
import { useSettings } from '@/contexts/settings-context';
import { siteConfig } from '@/lib/site-config';

export type Sport = 'padel' | 'squash';

export interface TrainingSportGroup {
	sport: Sport;
	label: string;
	collection: ProductCollectionResponse | null;
}

type SportFilter = Sport | 'all';
type FormatFilter = 'all' | 'individual' | 'group';

/** A training variant flattened with its sport, so filters can act across both collections. */
interface TrainingItem {
	sport: Sport;
	product: ProductCollectionProduct;
	/** Level keyword derived from the variant title (Starter / Beginner / …), if any. */
	level: string | null;
	isGroup: boolean;
}

const HERO_INITIAL = { opacity: 0, y: 24 };
const HERO_ANIMATE = { opacity: 1, y: 0 };
const CARD_INITIAL = { opacity: 0, y: 20 };
const CARD_ANIMATE = { opacity: 1, y: 0 };

const LEVEL_KEYWORDS = ['Starter', 'Beginner', 'Intermediate', 'Advanced'];

const SPORT_FILTERS: { key: SportFilter; label: string }[] = [
	{ key: 'all', label: 'All sports' },
	{ key: 'padel', label: 'Padel' },
	{ key: 'squash', label: 'Squash' },
];

const FORMAT_FILTERS: { key: FormatFilter; label: string }[] = [
	{ key: 'all', label: 'All formats' },
	{ key: 'individual', label: '1-on-1' },
	{ key: 'group', label: 'Group' },
];

function deriveLevel(title: string): string | null {
	const found = LEVEL_KEYWORDS.find((kw) => title.toLowerCase().includes(kw.toLowerCase()));
	return found ?? null;
}

function flattenItems(groups: TrainingSportGroup[]): TrainingItem[] {
	const items: TrainingItem[] = [];
	for (const group of groups) {
		for (const product of group.collection?.products ?? []) {
			items.push({
				sport: group.sport,
				product,
				level: deriveLevel(product.variantTitle || product.title),
				isGroup: product.maxAttendees > 1,
			});
		}
	}
	return items;
}

function Toggle<T extends string>({
	options,
	value,
	onChange,
}: {
	options: { key: T; label: string }[];
	value: T;
	onChange: (v: T) => void;
}) {
	return (
		<div className="no-scrollbar flex gap-2 overflow-x-auto">
			{options.map((opt) => {
				const active = opt.key === value;
				return (
					<button
						key={opt.key}
						type="button"
						onClick={() => onChange(opt.key)}
						className={`shrink-0 rounded-full border px-4 py-2 font-display text-[0.72rem] font-semibold uppercase tracking-[0.16em] transition-all ${
							active
								? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
								: 'border-[var(--color-line-strong)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-ink)]'
						}`}
					>
						{opt.label}
					</button>
				);
			})}
		</div>
	);
}

function TrainingCard({ item, index }: { item: TrainingItem; index: number }) {
	const { currency } = useSettings();
	const { product, sport, isGroup } = item;
	const sportAccent =
		sport === 'squash' ? 'var(--color-sage)' : 'var(--color-primary)';

	return (
		<motion.div
			initial={CARD_INITIAL}
			whileInView={CARD_ANIMATE}
			viewport={{ once: true, margin: '-60px' }}
			transition={{ duration: 0.5, delay: Math.min(index * 0.04, 0.3) }}
		>
			<Link
				href={`/booking/${product.slug}`}
				className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6 transition-all hover:-translate-y-0.5 hover:border-[var(--color-primary)]/40 hover:card-shadow-lg lg:p-7"
			>
				{/* diagonal-stripe corner label */}
				<div className="mb-5 flex items-center justify-between gap-3">
					<span
						className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-display text-[0.62rem] font-semibold uppercase tracking-[0.18em]"
						style={{ color: sportAccent, background: 'var(--color-surface-2)' }}
					>
						<span className="h-1.5 w-1.5 rounded-full" style={{ background: sportAccent }} />
						{sport}
					</span>
					<span className="font-display text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-dim)]">
						{String(index + 1).padStart(2, '0')}
					</span>
				</div>

				<h3 className="heading-display text-xl text-[var(--color-ink)]">
					{product.title}
				</h3>
				{product.variantTitle && product.variantTitle !== product.title ? (
					<p className="mt-1 text-sm font-medium text-[var(--color-ink-muted)]">
						{product.variantTitle}
					</p>
				) : null}
				{product.description ? (
					<p className="mt-3 line-clamp-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
						{product.description}
					</p>
				) : null}

				{/* tags */}
				<div className="mt-5 flex flex-wrap items-center gap-2">
					<span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-2)] px-3 py-1 font-display text-[0.68rem] font-medium uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
						{formatDuration(product.duration)}
					</span>
					<span
						className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-display text-[0.68rem] font-medium uppercase tracking-[0.1em]"
						style={{
							color: isGroup ? 'var(--color-sage)' : 'var(--color-primary)',
							background: isGroup ? 'var(--color-sage-soft)' : 'var(--color-tint)',
						}}
					>
						{isGroup ? `Group · up to ${product.maxAttendees}` : '1-on-1'}
					</span>
					{item.level ? (
						<span className="inline-flex items-center rounded-full bg-[var(--color-surface-2)] px-3 py-1 font-display text-[0.68rem] font-medium uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
							{item.level}
						</span>
					) : null}
				</div>

				{/* footer */}
				<div className="mt-6 flex flex-1 items-end justify-between gap-4 border-t border-[var(--color-line)] pt-5">
					<div>
						<p className="font-display text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-dim)]">
							From
						</p>
						<p className="heading-display text-2xl text-[var(--color-primary)]">
							{formatPrice(product.price, currency)}
						</p>
					</div>
					<span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 font-display text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-white transition-colors group-hover:bg-[var(--color-primary-bright)]">
						Book
						<svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
						</svg>
					</span>
				</div>
			</Link>
		</motion.div>
	);
}

export function TrainingCatalog({
	groups,
	initialSport = 'all',
}: {
	groups: TrainingSportGroup[];
	initialSport?: SportFilter;
}) {
	const [sport, setSport] = useState<SportFilter>(initialSport);
	const [format, setFormat] = useState<FormatFilter>('all');
	const [level, setLevel] = useState<string>('all');

	const allItems = useMemo(() => flattenItems(groups), [groups]);

	const levelOptions = useMemo(() => {
		const present = LEVEL_KEYWORDS.filter((kw) => allItems.some((it) => it.level === kw));
		return [{ key: 'all', label: 'All levels' }, ...present.map((l) => ({ key: l, label: l }))];
	}, [allItems]);

	const filtered = useMemo(
		() =>
			allItems.filter((it) => {
				if (sport !== 'all' && it.sport !== sport) return false;
				if (format === 'individual' && it.isGroup) return false;
				if (format === 'group' && !it.isGroup) return false;
				if (level !== 'all' && it.level !== level) return false;
				return true;
			}),
		[allItems, sport, format, level],
	);

	const coachingCopy = siteConfig.coachesSection;

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
						Coaching
					</motion.p>
					<motion.h1
						initial={HERO_INITIAL}
						animate={HERO_ANIMATE}
						transition={{ duration: 0.7, delay: 0.1 }}
						className="heading-display mt-4 text-5xl text-[var(--color-ink)] md:text-6xl lg:text-7xl"
					>
						Train with
						<br />
						<span className="heading-display-italic text-[var(--color-primary)]">a coach.</span>
					</motion.h1>
					<motion.p
						initial={HERO_INITIAL}
						animate={HERO_ANIMATE}
						transition={{ duration: 0.6, delay: 0.2 }}
						className="mt-7 max-w-xl text-lg leading-relaxed text-[var(--color-ink-muted)]"
					>
						{coachingCopy.body} Individual lessons and small-group classes for padel and squash — pick a
						session and book a{' '}
						<Link href="/coaches" className="text-[var(--color-primary)] underline underline-offset-4">
							coach
						</Link>
						.
					</motion.p>
				</div>
			</section>

			{/* Catalog */}
			<section className="bg-[var(--color-bg)] pb-24 lg:pb-32">
				<div className="mx-auto max-w-[1400px] px-6 lg:px-10">
					{/* Filters */}
					<div className="flex flex-col gap-4 border-y border-[var(--color-line)] py-5 lg:flex-row lg:items-center lg:justify-between">
						<Toggle options={SPORT_FILTERS} value={sport} onChange={setSport} />
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
							<Toggle options={FORMAT_FILTERS} value={format} onChange={setFormat} />
							{levelOptions.length > 1 ? (
								<Toggle options={levelOptions} value={level} onChange={setLevel} />
							) : null}
						</div>
					</div>

					{filtered.length === 0 ? (
						<div className="py-24 text-center">
							<p className="text-[var(--color-ink-muted)]">
								No sessions match these filters. Try widening your selection.
							</p>
						</div>
					) : (
						<div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
							{filtered.map((item, i) => (
								<TrainingCard key={item.product.id} item={item} index={i} />
							))}
						</div>
					)}
				</div>
			</section>
		</>
	);
}
