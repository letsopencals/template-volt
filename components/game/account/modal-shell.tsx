'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';

const BACKDROP = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
const PANEL = {
	initial: { opacity: 0, y: 24, scale: 0.98 },
	animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
	exit: { opacity: 0, y: 12, transition: { duration: 0.15 } },
};

/** Dimmed backdrop + panel; Escape or a backdrop click closes (unless `locked`). */
export function ModalShell({ onClose, locked, wide, label, children }: { onClose: () => void; locked?: boolean; wide?: boolean; label: string; children: React.ReactNode }) {
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && !locked) onClose();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [onClose, locked]);

	return (
		<motion.div {...BACKDROP} className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center" onClick={locked ? undefined : onClose}>
			<motion.div
				{...PANEL}
				role="dialog"
				aria-modal
				aria-label={label}
				onClick={(e) => e.stopPropagation()}
				className={`max-h-[90vh] w-full overflow-y-auto rounded-[28px] border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.6)] sm:p-8 ${wide ? 'max-w-2xl' : 'max-w-md'}`}
			>
				{children}
			</motion.div>
		</motion.div>
	);
}
