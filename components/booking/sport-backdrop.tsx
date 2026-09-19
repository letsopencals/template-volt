'use client';

/**
 * Animated backdrop behind the court grid that reacts to the sport toggle. Each
 * sport crossfades to its own media: a looping ambience video (`/videos/bg-<sport>.mp4`)
 * when the browser can play it, otherwise a slow ken-burns still of the sport's courts.
 * Heavily darkened + faded to the page background so the grid and gallery stay readable.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { siteConfig } from '@/lib/site-config';

const LAYER = {
	initial: { opacity: 0 },
	animate: { opacity: 1 },
	exit: { opacity: 0 },
	transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const },
};

const KENBURNS = { scale: [1, 1.08, 1] };
const KENBURNS_T = { duration: 28, ease: 'easeInOut' as const, repeat: Infinity };

function SportMedia({ sport, image }: { sport: string; image: string }) {
	const ref = useRef<HTMLVideoElement>(null);
	const [videoOk, setVideoOk] = useState(false);

	useEffect(() => {
		const v = ref.current;
		if (!v) return;
		v.muted = true;
		v.play()
			.then(() => setVideoOk(true))
			.catch(() => setVideoOk(false));
	}, [sport]);

	return (
		<>
			<motion.div animate={KENBURNS} transition={KENBURNS_T} className="absolute inset-0">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img src={`/images/${image}`} alt="" className="h-full w-full object-cover" />
			</motion.div>
			<video
				ref={ref}
				className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${videoOk ? 'opacity-100' : 'opacity-0'}`}
				autoPlay
				muted
				loop
				playsInline
				preload="auto"
				onError={() => setVideoOk(false)}
			>
				<source src={`/videos/bg-${sport}.mp4`} type="video/mp4" />
			</video>
		</>
	);
}

export function SportBackdrop({ sport }: { sport: string }) {
	const active = siteConfig.sports.find((s) => s.key === sport) ?? siteConfig.sports[0]!;

	return (
		<div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
			<AnimatePresence mode="popLayout">
				<motion.div key={active.key} {...LAYER} className="absolute inset-0">
					<SportMedia sport={active.key} image={active.image} />
				</motion.div>
			</AnimatePresence>
			{/* darken (keeps the grid readable) + fade to the solid page background toward
			    the bottom so the gallery below sits on a clean surface */}
			<div className="absolute inset-0 bg-[var(--color-bg)]/68" />
			<div className="absolute inset-0 bg-gradient-to-b from-[var(--color-bg)]/30 via-[var(--color-bg)]/75 to-[var(--color-bg)]" />
			<div
				className="absolute inset-0 opacity-[0.12]"
				style={{ backgroundImage: 'repeating-linear-gradient(135deg, var(--color-ink) 0 1px, transparent 1px 24px)' }}
			/>
		</div>
	);
}
