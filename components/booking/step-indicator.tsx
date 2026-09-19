'use client';

import { memo } from 'react';
import { STEP_LABELS, type BookingStep } from '@/lib/booking-constants';

interface StepProgressProps {
	steps: BookingStep[];
	current: BookingStep;
	completed: Record<BookingStep, boolean>;
	canEnter: (s: BookingStep) => boolean;
	onSelect: (s: BookingStep) => void;
}

export const StepProgress = memo(function StepProgress({
	steps,
	current,
	completed,
	canEnter,
	onSelect,
}: StepProgressProps) {
	const currentIndex = steps.indexOf(current);

	return (
		<ol className="no-scrollbar -mx-2 flex items-center gap-1 overflow-x-auto px-2">
			{steps.map((s, i) => {
				const isActive = s === current;
				const isDone = completed[s] && !isActive;
				const enabled = canEnter(s);
				const isPast = i < currentIndex;

				return (
					<li key={s} className="flex shrink-0 items-center">
						<button
							type="button"
							disabled={!enabled}
							onClick={() => onSelect(s)}
							className="group flex items-center gap-2.5 rounded-full py-1.5 pr-3 transition-opacity disabled:opacity-50"
						>
							<span
								className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
									isActive
										? 'bg-[var(--color-primary)] text-white'
										: isDone
											? 'bg-[var(--color-brass-soft)] text-[var(--color-primary)]'
											: 'bg-[var(--color-surface-2)] text-[var(--color-ink-dim)]'
								}`}
							>
								{isDone ? (
									<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
										<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
									</svg>
								) : (
									i + 1
								)}
							</span>
							<span
								className={`whitespace-nowrap text-sm font-medium ${
									isActive ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-dim)]'
								}`}
							>
								{STEP_LABELS[s]}
							</span>
						</button>
						{i < steps.length - 1 ? (
							<span
								className={`mx-1 h-px w-6 shrink-0 ${
									isPast ? 'bg-[var(--color-primary)]/40' : 'bg-[var(--color-line-strong)]'
								}`}
							/>
						) : null}
					</li>
				);
			})}
		</ol>
	);
});
