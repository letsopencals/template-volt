'use client';

import { memo, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { clsx } from 'clsx';

interface StepSectionProps {
	index: number;
	title: string;
	/** One-line recap shown once the step is done and collapsed */
	summary?: string | null;
	active: boolean;
	done: boolean;
	/** Reopen the step (omitted once the booking is held) */
	onEdit?: () => void;
	children: React.ReactNode;
}

const EASE = [0.22, 1, 0.36, 1] as const;
const BODY = {
	initial: { height: 0, opacity: 0 },
	animate: { height: 'auto', opacity: 1, transition: { height: { duration: 0.5, ease: EASE }, opacity: { duration: 0.35, delay: 0.1 } } },
	exit: { height: 0, opacity: 0, transition: { height: { duration: 0.4, ease: EASE }, opacity: { duration: 0.15 } } },
};
const INNER = { initial: { y: 14 }, animate: { y: 0, transition: { duration: 0.5, ease: EASE } } };
const SUMMARY = {
	initial: { opacity: 0, y: -4 },
	animate: { opacity: 1, y: 0, transition: { duration: 0.3, delay: 0.15 } },
	exit: { opacity: 0, transition: { duration: 0.1 } },
};

/**
 * A numbered step of the booking flow: a dark card with an orange edge when active, the number as a mono "01" (an
 * orange tick when done). The body animates open and closed; a finished step shows a one-line recap and "Change".
 */
export const StepSection = memo(function StepSection({ index, title, summary, active, done, onEdit, children }: StepSectionProps) {
	const ref = useRef<HTMLElement>(null);
	const mounted = useRef(false);

	useEffect(() => {
		if (!mounted.current) {
			mounted.current = true;
			return;
		}
		if (!active) return;
		const t = window.setTimeout(() => {
			const top = (ref.current?.getBoundingClientRect().top ?? 0) + window.scrollY - 120;
			if (Math.abs(window.scrollY - top) > 40) window.scrollTo({ top, behavior: 'smooth' });
		}, 420);
		return () => window.clearTimeout(t);
	}, [active]);

	return (
		<motion.section
			ref={ref}
			layout="position"
			className={clsx(
				'overflow-hidden rounded-[24px] border bg-[var(--color-surface)] transition-colors duration-500',
				active ? 'border-[var(--color-primary)]/70' : 'border-[var(--color-line)]',
			)}
		>
			<header className={clsx('flex items-stretch', !active && done && onEdit && 'cursor-pointer')} onClick={!active && done ? onEdit : undefined}>
				<span
					className={clsx(
						'flex w-14 shrink-0 items-center justify-center font-mono text-base font-bold transition-colors duration-300 sm:w-16',
						active ? 'bg-[var(--color-primary)] text-black' : done ? 'bg-[var(--color-tint)] text-[var(--color-primary)]' : 'bg-[var(--color-surface-2)] text-[var(--color-ink-dim)]',
					)}
				>
					{done && !active ? (
						<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden>
							<motion.path strokeLinecap="round" d="M5 13l4 4L19 7" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, ease: EASE }} />
						</svg>
					) : (
						String(index).padStart(2, '0')
					)}
				</span>
				<div className="min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-5">
					<h2 className={clsx('heading-display text-lg uppercase leading-tight sm:text-xl', !active && !done ? 'text-[var(--color-ink-dim)]' : 'text-[var(--color-ink)]')}>{title}</h2>
					<AnimatePresence initial={false}>
						{!active && summary ? (
							<motion.p key="summary" {...SUMMARY} className="mt-1 truncate text-sm text-[var(--color-ink-muted)]">
								{summary}
							</motion.p>
						) : null}
					</AnimatePresence>
				</div>
				{!active && done && onEdit ? (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onEdit();
						}}
						className="m-3 self-center rounded-full border border-[var(--color-line-strong)] px-4 py-1.5 text-xs font-semibold text-[var(--color-ink-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] sm:m-4"
					>
						Change
					</button>
				) : null}
			</header>
			<AnimatePresence initial={false}>
				{active ? (
					<motion.div key="body" {...BODY} className="overflow-hidden">
						<motion.div {...INNER} className="border-t border-[var(--color-line)] px-4 pb-6 pt-6 sm:px-6 sm:pb-8">
							{children}
						</motion.div>
					</motion.div>
				) : null}
			</AnimatePresence>
		</motion.section>
	);
});
