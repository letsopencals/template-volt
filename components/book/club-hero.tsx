'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { clsx } from 'clsx';
import { formatPrice } from '@/lib/format';
import { priceFor, sportOf, type Catalogue, type Club, type Court } from '@/lib/club';

const MENU_INITIAL = { opacity: 0, y: -6, scale: 0.98 };
const MENU_ANIMATE = { opacity: 1, y: 0, scale: 1 };

/**
 * The club as the page header: full-bleed photo, "VOLT / Madrid", address, hours, phone, courts per sport with the
 * hourly price, and a quiet "Change club" pill (every club + "Near me"). Switching is always there but never in
 * the way.
 */
export function ClubHero({
	cat,
	club,
	courts,
	currency,
	onChange,
	onLocate,
	canLocate,
	locating,
}: {
	cat: Catalogue;
	club: Club;
	courts: Court[];
	currency: string | undefined;
	onChange: (club: Club) => void;
	onLocate: () => void;
	canLocate: boolean;
	locating: boolean;
}) {
	const [open, setOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const onDown = (e: PointerEvent) => {
			if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
		};
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
		document.addEventListener('pointerdown', onDown);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('pointerdown', onDown);
			document.removeEventListener('keydown', onKey);
		};
	}, [open]);

	const others = cat.clubs.filter((c) => c.courtCount > 0);

	return (
		<header className="relative overflow-hidden">
						<Image src={`/images/${club.image}`} alt="" fill priority sizes="100vw" className="object-cover" />
			<span className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/30" />
			<span className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[var(--color-bg)] to-transparent" />

			<div className="relative mx-auto max-w-[1600px] px-4 pb-14 pt-28 sm:px-6 lg:px-10 lg:pb-20 lg:pt-36">
				<div className="flex flex-wrap items-start justify-between gap-6">
					<div className="min-w-0">
						<p className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[var(--color-primary)]">Your club</p>
						<h1 className="heading-display mt-2 text-5xl text-white sm:text-7xl">
							<span className="text-white/40">VOLT </span>
							{club.name}
						</h1>
						{club.tagline ? <p className="mt-3 max-w-xl text-base text-white/75">{club.tagline}</p> : null}
					</div>

					<div ref={menuRef} className="relative">
						<button
							type="button"
							aria-haspopup="listbox"
							aria-expanded={open}
							onClick={() => setOpen((v) => !v)}
							className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/40 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:border-[var(--color-primary)]"
						>
							<svg className="h-4 w-4 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-6.2-7-11a7 7 0 1114 0c0 4.8-7 11-7 11z" />
								<circle cx="12" cy="10" r="2.5" />
							</svg>
							Change club
							<svg className={clsx('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
							</svg>
						</button>
						<AnimatePresence>
							{open ? (
								<motion.div
									initial={MENU_INITIAL}
									animate={MENU_ANIMATE}
									exit={MENU_INITIAL}
									transition={{ duration: 0.16 }}
									role="listbox"
									className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-1.5 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.8)]"
								>
									{others.map((c) => (
										<button
											key={c.id}
											type="button"
											role="option"
											aria-selected={c.id === club.id}
											onClick={() => {
												setOpen(false);
												onChange(c);
											}}
											className={clsx(
												'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
												c.id === club.id ? 'bg-[var(--color-tint)] text-[var(--color-ink)]' : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]',
											)}
										>
											<span>
												<span className="block font-semibold">{c.name}</span>
												<span className="block text-xs text-[var(--color-ink-dim)]">
													{c.courtCount} courts · {c.sports.map((s) => sportOf(s).label).join(' + ')}
												</span>
											</span>
											{c.id === club.id ? <span className="h-2 w-2 rounded-full bg-[var(--color-primary)]" /> : null}
										</button>
									))}
									{canLocate ? (
										<button
											type="button"
											onClick={() => {
												setOpen(false);
												onLocate();
											}}
											className="mt-1 flex w-full items-center gap-2 rounded-xl border-t border-[var(--color-line)] px-3 py-2.5 text-left text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-surface-2)]"
										>
											{locating ? 'Finding you…' : 'Near me'}
										</button>
									) : null}
								</motion.div>
							) : null}
						</AnimatePresence>
					</div>
				</div>

				<dl className="mt-8 grid max-w-4xl grid-cols-2 gap-x-8 gap-y-4 text-sm sm:grid-cols-4">
					{club.address ? <Fact label="Address" value={club.address} /> : null}
					{club.hours ? <Fact label="Hours" value={club.hours} /> : null}
					{club.phone ? <Fact label="Reception" value={club.phone} href={`tel:${club.phone.replace(/\s/g, '')}`} /> : null}
					{club.sports.map((key) => {
						const own = courts.filter((c) => c.sport === key);
						const from = Math.min(...own.map((c) => priceFor(c, 60)));
						return <Fact key={key} label={sportOf(key).label} value={`${own.length} courts · from ${formatPrice(from, currency)}/h`} />;
					})}
				</dl>
			</div>
		</header>
	);
}

function Fact({ label, value, href }: { label: string; value: string; href?: string }) {
	return (
		<div className="min-w-0">
			<dt className="font-mono text-[0.62rem] font-bold uppercase tracking-[0.2em] text-white/45">{label}</dt>
			<dd className="mt-1 text-white/90">
				{href ? (
					<a href={href} className="hover:text-[var(--color-primary)]">
						{value}
					</a>
				) : (
					value
				)}
			</dd>
		</div>
	);
}
