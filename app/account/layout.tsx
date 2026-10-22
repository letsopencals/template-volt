'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

/**
 * The player's account: one place for every game and training at every club. A club-photo band with the greeting
 * and tabs, then the page.
 */
const TABS = [
	{ href: '/account', label: 'My games', match: (p: string) => p === '/account' || p.startsWith('/account/appointments') },
	{ href: '/account/orders', label: 'Orders', match: (p: string) => p.startsWith('/account/orders') },
	{ href: '/account/settings', label: 'My details', match: (p: string) => p.startsWith('/account/settings') },
];

const ENTER = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } };
const TAB = 'rounded-full border px-4 py-2 font-mono text-[0.7rem] font-bold uppercase tracking-[0.16em] transition-colors';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const { data: session } = useSession();
	const first = session?.customer?.firstName || null;

	return (
		<div className="min-h-screen bg-[var(--color-bg)]">
			<section className="relative overflow-hidden">
				<Image src="/images/hero/hero-full.jpg" alt="" fill priority sizes="100vw" className="object-cover opacity-40" />
				<span className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/40" />
				<span className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[var(--color-bg)] to-transparent" />
				<motion.div {...ENTER} className="relative mx-auto flex max-w-[1400px] flex-wrap items-end justify-between gap-8 px-4 pb-14 pt-32 sm:px-6 lg:px-10 lg:pt-36">
					<div className="min-w-0">
						<p className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[var(--color-primary)]">My account</p>
						<h1 className="heading-display mt-3 text-4xl text-white sm:text-6xl">
							{first ? `Hi, ${first}!` : 'Hi!'}
							<br />
							<span className="text-[var(--color-primary)]">Every club, one account.</span>
						</h1>
						{session?.customer?.email ? <p className="mt-3 truncate text-sm text-white/55">{session.customer.email}</p> : null}
					</div>
					<nav className="flex flex-wrap gap-2" aria-label="Account">
						{TABS.map((t) => (
							<Link
								key={t.href}
								href={t.href}
								aria-current={t.match(pathname) ? 'page' : undefined}
								className={clsx(TAB, t.match(pathname) ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-black' : 'border-white/25 text-white hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]')}
							>
								{t.label}
							</Link>
						))}
						<button type="button" onClick={() => signOut({ callbackUrl: '/' })} className={clsx(TAB, 'border-white/25 text-white hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]')}>
							Sign out
						</button>
					</nav>
				</motion.div>
			</section>
			<section className="mx-auto max-w-[1400px] px-4 pb-24 pt-6 sm:px-6 lg:px-10">{children}</section>
		</div>
	);
}
