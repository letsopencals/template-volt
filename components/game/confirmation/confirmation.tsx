'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import moment from 'moment-timezone';
import { at } from '@/lib/club';
import type { Receipt } from '@/lib/order';
import { changeDeadline, directionsUrl, formatGap, gameName, gamePhase, icsHref, inviteText, rebookHref, untilText, type Game } from '@/lib/game';
import { siteConfig } from '@/lib/site-config';
import { useNow } from '@/hooks/use-now';
import { MatchTicket, SealedTicket } from '@/components/game/confirmation/match-ticket';
import { ShareInvite } from '@/components/game/confirmation/share-invite';
import { BTN, BTN_GHOST, Label, Monogram } from '@/components/game/bits';

const EASE = [0.22, 1, 0.36, 1] as const;
const RISE = (delay: number) => ({ initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay, ease: EASE } });
const IN_VIEW = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.55, ease: EASE } };
const MENU = 'px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink)] transition-colors hover:text-[var(--color-primary)]';

const isoMin = (iso: string) => Date.parse(iso) / 60000;

/**
 * After checkout: a full-bleed club hero ("Game on, Sam! / VOLT Madrid"), the match ticket with a countdown, the
 * actions (calendar, directions, send to the crew, manage), then the crew, "Before you play", "Getting there",
 * the free-cancellation line and "Same time next week?". Renders from the order for signed-in players, or from the
 * flow's snapshot for guests (`signedIn` false).
 */
export function Confirmation({ games, me, receipt, tz, signedIn = true }: { games: Game[]; me: string | null; receipt: Receipt; tz: string; signedIn?: boolean }) {
	const now = useNow(30_000);
	const lead = games[0];
	if (!lead) return <ConfirmationSignedOut orderId={null} signedIn={signedIn} />;

	const court = lead.kind === 'court';
	const phase = now == null ? 'upcoming' : gamePhase(lead, now, tz);
	const until = now == null ? null : untilText(lead.from, now, tz);
	const nextWeek = moment.utc(lead.from).tz(tz).add(7, 'days');
	const again = court && lead.clubSlug
		? `/book?club=${lead.clubSlug}&sport=${lead.sport}&date=${nextWeek.format('YYYY-MM-DD')}${[60, 90, 120].includes(lead.minutes) ? `&length=${lead.minutes}` : ''}&time=${nextWeek.format('HH:mm')}`
		: rebookHref(lead, tz);
	const manage = signedIn ? (lead.id === 'snapshot' ? '/account' : `/account/appointments/${lead.id}`) : `/auth/sign-in?callbackUrl=${encodeURIComponent('/account')}`;
	const headline = court ? (me ? `Game on, ${me}!` : 'Game on!') : me ? `See you on court, ${me}` : 'See you on court';

	return (
		<div className="bg-[var(--color-bg)]">
			<section className="relative overflow-hidden">
				{lead.clubImage ? <Image src={`/images/${lead.clubImage}`} alt="" fill priority sizes="100vw" className="object-cover" /> : null}
				<span className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/30" />
				<span className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[var(--color-bg)] to-transparent" />
				<div className="relative mx-auto max-w-[1400px] px-4 pb-16 pt-32 sm:px-6 lg:px-10 lg:pb-20 lg:pt-40">
					<motion.p {...RISE(0.1)} className="flex items-center gap-2.5">
						<span className="relative flex h-2 w-2">
							<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-primary)] opacity-60" />
							<span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-primary)]" />
						</span>
						<Label className="text-[var(--color-primary)]">Booked{until && phase !== 'past' ? ` · ${until}` : ''}</Label>
					</motion.p>
					<motion.h1 {...RISE(0.2)} className="heading-display mt-4 max-w-4xl text-4xl text-white sm:text-6xl">
						{headline}
						<br />
						<span className="text-[var(--color-primary)]">{lead.clubTitle}</span>
					</motion.h1>
					<motion.p {...RISE(0.3)} className="mt-5 max-w-2xl text-base text-white/75">
						{gameName(lead)}, {at(isoMin(lead.from), tz, 'dddd D MMMM')} at {at(isoMin(lead.from), tz, 'HH:mm')}. Your ticket is below; the confirmation is on its way by email.
					</motion.p>
				</div>
			</section>

			<div className="mx-auto max-w-[1400px] space-y-6 px-4 pb-24 sm:px-6 lg:px-10">
				{games.map((g, i) => (
					<motion.div key={`${g.id}${g.from}`} {...RISE(0.4 + i * 0.12)}>
						<MatchTicket game={g} tz={tz} me={me} until={now == null ? null : Date.parse(g.from) - now} />
					</motion.div>
				))}

				<motion.nav {...RISE(0.55)} className="flex flex-wrap items-center divide-x divide-[var(--color-line)] overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)]" aria-label="Your booking">
					<a href={icsHref(lead)} download={`volt-${lead.ref || 'game'}.ics`} className={MENU}>
						Add to calendar
					</a>
					<a href={directionsUrl(lead)} target="_blank" rel="noreferrer" className={MENU}>
						Directions
					</a>
					{court ? <ShareInvite text={inviteText(lead, tz)} className={MENU} /> : null}
					<Link href={manage} className={MENU}>
						{signedIn ? 'Change or cancel' : 'Sign in to manage'}
					</Link>
					<span className="ml-auto px-4 py-3 text-xs text-[var(--color-ink-muted)]">
						<strong className="font-semibold text-[var(--color-ink)]">{receipt.line}</strong>
						{receipt.ref ? ` · #${receipt.ref}` : ''}
						{receipt.email ? <span className="block text-[var(--color-ink-dim)]">Confirmation sent to {receipt.email}</span> : null}
					</span>
				</motion.nav>

				<motion.div {...IN_VIEW} className="grid gap-4 pt-4 md:grid-cols-3">
					<Box title={court ? 'Your crew' : 'Who’s coming'}>
						{court ? (
							<>
								<ul className="space-y-2.5">
									<li className="flex items-center gap-3">
										<Monogram name={me || 'You'} size="sm" tone="orange" />
										<span className="font-semibold text-[var(--color-ink)]">{me || 'You'}</span>
										<span className="text-xs text-[var(--color-ink-dim)]">booker</span>
									</li>
									{lead.crew.map((c) => (
										<li key={c} className="flex items-center gap-3 text-[var(--color-ink)]">
											<Monogram name={c} size="sm" />
											{c}
										</li>
									))}
									{Array.from({ length: Math.max(0, (lead.format === 'singles' ? 1 : 3) - lead.crew.length) }, (_, i) => (
										<li key={`open${i}`} className="flex items-center gap-3 text-[var(--color-ink-dim)]">
											<span className="h-8 w-8 rounded-full border border-dashed border-[var(--color-line-strong)]" />
											Open spot
										</li>
									))}
								</ul>
								{lead.invited.length ? (
									<p className="mt-4 text-xs text-[var(--color-ink-dim)]">
										Invited by email: {lead.invited.join(', ')}
									</p>
								) : null}
								<div className="mt-5">
									<ShareInvite text={inviteText(lead, tz)} label="Send the game to your crew" className={BTN_GHOST} />
								</div>
							</>
						) : (
							<p>{lead.seats === 1 ? 'Just you.' : `${lead.seats} places booked.`} Arrive ten minutes early to warm up.</p>
						)}
					</Box>
					<Box title="Before you play">
						<ul className="list-disc space-y-2 pl-4 marker:text-[var(--color-primary)]">
							<li>Check in at reception five minutes before your start.</li>
							{court ? <li>Courts are lit and ready a few minutes before the hour. Please leave on time for the next game.</li> : null}
							{lead.extras.length ? (
								<li>{lead.extras.map((x) => `${x.title} × ${x.quantity}`).join(', ')}: waiting at reception.</li>
							) : (
								<li>Rackets and balls can be hired at reception.</li>
							)}
							<li>Indoor court shoes only.</li>
						</ul>
					</Box>
					<Box title="Getting there">
						<p className="heading-display text-lg leading-tight text-[var(--color-ink)]">{lead.address || lead.clubTitle}</p>
						{lead.hours ? <p className="mt-2 text-sm text-[var(--color-ink-muted)]">{lead.hours}</p> : null}
						{lead.phone ? (
							<p className="text-sm text-[var(--color-ink-muted)]">
								Reception:{' '}
								<a href={`tel:${lead.phone.replace(/\s/g, '')}`} className="hover:text-[var(--color-primary)]">
									{lead.phone}
								</a>
							</p>
						) : null}
						<a href={directionsUrl(lead)} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-bright)]">
							Get directions →
						</a>
					</Box>
				</motion.div>

				<motion.p {...IN_VIEW} className="rounded-2xl bg-[var(--color-surface-2)] px-5 py-4 text-sm text-[var(--color-ink-muted)]">
					{lead.cancelGap > 0 ? (
						<>
							Free to change or cancel until <strong className="text-[var(--color-ink)]">{at(isoMin(changeDeadline(lead, lead.cancelGap)), tz, 'ddd D MMM, HH:mm')}</strong> ({formatGap(lead.cancelGap)} before you play), from your account.
						</>
					) : (
						'Free to change or cancel from your account any time before you play.'
					)}
					{!signedIn && receipt.email ? ` Sign in with ${receipt.email} to manage it.` : ''}
				</motion.p>

				<motion.div {...IN_VIEW} className="flex flex-col items-start gap-6 rounded-[28px] border border-[var(--color-primary)]/30 bg-[var(--color-bg-deep)] px-6 py-10 md:flex-row md:items-end md:justify-between md:px-10">
					<div>
						<Label className="text-[var(--color-primary)]">Make it a habit</Label>
						<h2 className="heading-display mt-2 text-3xl text-[var(--color-ink)]">
							Same time <span className="text-[var(--color-primary)]">next week?</span>
						</h2>
						<p className="mt-2 max-w-md text-sm text-[var(--color-ink-muted)]">
							Evenings go first. Grab {at(isoMin(lead.from), tz, 'dddd')} {at(isoMin(lead.from), tz, 'HH:mm')} at {lead.clubTitle} again while it’s free.
						</p>
					</div>
					<div className="flex flex-wrap gap-3">
						<Link href={again} className={BTN}>
							Book next week
						</Link>
						<Link href={signedIn ? '/account' : '/auth/sign-in'} className={BTN_GHOST}>
							My account
						</Link>
					</div>
				</motion.div>
			</div>
		</div>
	);
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col overflow-hidden rounded-[24px] border border-[var(--color-line)] bg-[var(--color-surface)]">
			<p className="border-b border-[var(--color-line)] px-5 py-3">
				<Label className="text-[var(--color-ink-dim)]">{title}</Label>
			</p>
			<div className="flex-1 p-5 text-sm text-[var(--color-ink-muted)] sm:p-6">{children}</div>
		</div>
	);
}

export function ConfirmationLoading() {
	return (
		<div className="flex min-h-[80vh] items-center justify-center bg-[var(--color-bg)] px-6">
			<span className="inline-flex items-center gap-3 text-sm text-[var(--color-ink-muted)]">
				<span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-line-strong)] border-t-[var(--color-primary)]" />
				Getting your booking ready…
			</span>
		</div>
	);
}

export function ConfirmationSignedOut({ orderId, signedIn }: { orderId: string | null; signedIn: boolean }) {
	const callbackUrl = orderId ? `/thank-you?orderId=${encodeURIComponent(orderId)}` : '/account';
	return (
		<section className="bg-[var(--color-bg)] pb-24 pt-32 md:pt-40">
			<div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-10">
				<motion.p {...RISE(0.1)}>
					<Label className="text-[var(--color-primary)]">Booked</Label>
				</motion.p>
				<motion.h1 {...RISE(0.2)} className="heading-display mt-3 text-5xl text-[var(--color-ink)]">
					Game <span className="text-[var(--color-primary)]">on!</span>
				</motion.h1>
				<motion.p {...RISE(0.3)} className="mt-5 max-w-2xl text-base text-[var(--color-ink-muted)]">
					Your confirmation is in your inbox: court, time and directions.
					{signedIn ? '' : ` Sign in with the email you booked with to see it here, change it or cancel it. ${siteConfig.name} keeps every game in one account.`}
				</motion.p>
				<motion.div {...RISE(0.45)} className="mt-10">
					<SealedTicket />
				</motion.div>
				<motion.div {...RISE(0.6)} className="mt-10 flex flex-wrap gap-3">
					<Link href={signedIn ? '/account' : `/auth/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`} className={BTN}>
						{signedIn ? 'My account' : 'Sign in to see your booking'}
					</Link>
					<Link href="/book" className={BTN_GHOST}>
						Book another court
					</Link>
				</motion.div>
			</div>
		</section>
	);
}
