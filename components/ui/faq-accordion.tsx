'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export interface FaqItem {
	q: string;
	a: string;
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
	const [openIndex, setOpenIndex] = useState<number | null>(0);

	return (
		<div className="flex flex-col gap-3">
			{items.map((item, i) => {
				const isOpen = openIndex === i;
				return (
					<div
						key={item.q}
						className={`overflow-hidden rounded-2xl border transition-colors ${
							isOpen
								? 'border-[var(--color-primary)]/25 bg-[var(--color-surface)] card-shadow'
								: 'border-[var(--color-line)] bg-[var(--color-surface)] hover:border-[var(--color-line-strong)]'
						}`}
					>
						<button
							type="button"
							onClick={() => setOpenIndex(isOpen ? null : i)}
							aria-expanded={isOpen}
							className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left lg:px-7"
						>
							<span className={`text-base font-semibold transition-colors ${isOpen ? 'text-[var(--color-primary)]' : 'text-[var(--color-ink)]'}`}>
								{item.q}
							</span>
							<span
								className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all ${
									isOpen ? 'rotate-45 bg-[var(--color-primary)] text-white' : 'border border-[var(--color-line-strong)] text-[var(--color-primary)]'
								}`}
							>
								<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
									<path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
								</svg>
							</span>
						</button>
						<AnimatePresence initial={false}>
							{isOpen && (
								<motion.div
									initial={{ height: 0, opacity: 0 }}
									animate={{ height: 'auto', opacity: 1 }}
									exit={{ height: 0, opacity: 0 }}
									transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
									className="overflow-hidden"
								>
									<p className="px-6 pb-6 text-sm leading-relaxed text-[var(--color-ink-muted)] lg:px-7">
										{item.a}
									</p>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				);
			})}
		</div>
	);
}
