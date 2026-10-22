'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import type { AppointmentDetailResponse } from '@opencals/storefront-sdk';
import { fetcher } from '@/lib/fetcher';
import { formatPrice } from '@/lib/format';
import { at, type Catalogue } from '@/lib/club';
import { canChange, changeDeadline, directionsUrl, formatGap, gamePhase, icsHref, inviteText, rebookHref, toGame, untilText, type Game } from '@/lib/game';
import { useNow } from '@/hooks/use-now';
import { revalidateClubAvailability } from '@/hooks/use-game-checkout';
import { MatchTicket } from '@/components/game/confirmation/match-ticket';
import { ShareInvite } from '@/components/game/confirmation/share-invite';
import { BTN, BTN_GHOST, ErrorNote } from '@/components/game/bits';
import { CancelModal } from '@/components/game/account/cancel-modal';
import { RescheduleModal } from '@/components/game/account/reschedule-modal';

type Modal = 'none' | 'cancel' | 'reschedule';
const MENU = 'px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink)] transition-colors hover:text-[var(--color-primary)]';
const isoMin = (iso: string) => Date.parse(iso) / 60000;

function paymentLine(order: AppointmentDetailResponse['order']): string | null {
	if (!order) return null;
	const c = order.paymentCurrencyCode;
	if (order.total <= 0) return 'Nothing to pay';
	if (order.isFullyPaid) return `Paid ${formatPrice(order.paidTotal || order.total, c)}`;
	return `${formatPrice(order.dueToPay, c)} to pay at the club`;
}

/** One game. Emailed links carry `?action=cancel|reschedule`, which opens that dialog once the booking has loaded. */
export function GameDetail({ appointmentId, cat, tz }: { appointmentId: string; cat: Catalogue; tz: string }) {
	const router = useRouter();
	const { data: appointment, error, isLoading, mutate } = useSWR<AppointmentDetailResponse>(`/api/account/appointments/${appointmentId}`, fetcher, { revalidateOnFocus: false });
	const [modal, setModal] = useState<Modal>('none');
	const actionHandled = useRef(false);

	const game = useMemo(
		() => (appointment ? toGame(appointment as never, cat, (appointment.addOns ?? []).map((a) => ({ title: a.addOn?.title ?? 'Extra', quantity: a.quantity ?? 1 }))) : null),
		[appointment, cat],
	);
	const gameTz = game?.clubId ? (cat.clubs.find((c) => c.id === game.clubId)?.tz ?? tz) : tz;

	useEffect(() => {
		if (!appointment || actionHandled.current) return;
		actionHandled.current = true;
		const action = new URLSearchParams(window.location.search).get('action');
		if (action === 'cancel' || action === 'reschedule') setModal(action);
	}, [appointment]);

	if (isLoading) {
		return (
			<div className="space-y-5" aria-busy>
				<div className="h-6 w-32 animate-pulse rounded-full bg-[var(--color-surface)]" />
				<div className="h-72 animate-pulse rounded-[28px] bg-[var(--color-surface)]" />
			</div>
		);
	}
	if (error || !appointment || !game) {
		return (
			<div className="rounded-[28px] border border-[var(--color-line)] bg-[var(--color-surface)] px-6 py-16">
				<p className="heading-display text-2xl text-[var(--color-ink)]">We couldn’t find this booking</p>
				<p className="mt-2 text-sm text-[var(--color-ink-muted)]">It may have been made with another email address.</p>
				<Link href="/account" className={`${BTN_GHOST} mt-6`}>
					Back to your games
				</Link>
			</div>
		);
	}

	return (
		<>
			<GameSheet game={game} tz={gameTz} payment={paymentLine(appointment.order)} onCancel={() => setModal('cancel')} onReschedule={() => setModal('reschedule')} onInvited={() => void mutate()} />
			<AnimatePresence>
				{modal === 'cancel' ? (
					<CancelModal
						key="cancel"
						game={game}
						tz={gameTz}
						onClose={() => setModal('none')}
						onCanceled={() => {
							revalidateClubAvailability();
							router.push('/account');
						}}
					/>
				) : modal === 'reschedule' ? (
					<RescheduleModal
						key="reschedule"
						game={game}
						tz={gameTz}
						onClose={() => setModal('none')}
						onRescheduled={() => {
							revalidateClubAvailability();
							setModal('none');
							void mutate();
						}}
					/>
				) : null}
			</AnimatePresence>
		</>
	);
}

export function GameSheet({ game: g, tz, payment, onCancel, onReschedule, onInvited }: { game: Game; tz: string; payment: string | null; onCancel: () => void; onReschedule: () => void; onInvited: () => void }) {
	const now = useNow(30_000);
	const { data: session } = useSession();
	const phase = now == null ? 'upcoming' : gamePhase(g, now, tz);
	const live = phase === 'upcoming' || phase === 'today';
	const canMove = now != null && canChange(g, 'reschedule', now);
	const canCancel = now != null && canChange(g, 'cancel', now);
	const until = now == null ? null : untilText(g.from, now, tz);
	const badge = phase === 'canceled' ? 'Cancelled' : phase === 'past' ? 'Played' : phase === 'now' ? 'Playing now' : until ? until[0]!.toUpperCase() + until.slice(1) : null;

	return (
		<div className="space-y-6">
			<Link href="/account" className="inline-flex items-center gap-2 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-primary)]">
				<span aria-hidden>←</span> All games
			</Link>

			<MatchTicket game={g} tz={tz} me={session?.customer?.firstName} until={live && now != null ? Date.parse(g.from) - now : null} badge={badge} />

			{live || phase === 'now' ? (
				<nav className="flex flex-wrap items-center divide-x divide-[var(--color-line)] overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)]" aria-label="This booking">
					<a href={icsHref(g)} download={`volt-${g.ref}.ics`} className={MENU}>
						Add to calendar
					</a>
					<a href={directionsUrl(g)} target="_blank" rel="noreferrer" className={MENU}>
						Directions
					</a>
					{g.kind === 'court' ? <ShareInvite text={inviteText(g, tz)} className={MENU} /> : null}
					{payment ? <span className="ml-auto px-4 py-3 text-xs font-semibold text-[var(--color-ink)]">{payment}</span> : null}
				</nav>
			) : null}

			{live && g.kind === 'court' ? <InviteCrew game={g} onInvited={onInvited} /> : null}

			{live ? (
				<div className="grid gap-5 rounded-[28px] border border-[var(--color-line)] bg-[var(--color-surface)] px-6 py-6 sm:px-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
					<div className="text-sm">
						<p className="heading-display text-xl text-[var(--color-ink)]">Change of plan?</p>
						<p className="mt-1 text-[var(--color-ink-muted)]">{changeRules(g, canMove, canCancel, tz)}</p>
					</div>
					<div className="flex flex-wrap gap-3">
						<button type="button" onClick={onReschedule} disabled={!canMove} className={BTN}>
							Change time
						</button>
						<button type="button" onClick={onCancel} disabled={!canCancel} className={BTN_GHOST}>
							Cancel
						</button>
					</div>
				</div>
			) : phase === 'past' ? (
				<div className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-[var(--color-primary)]/30 bg-[var(--color-bg-deep)] px-6 py-6 sm:px-8">
					<p className="text-[var(--color-ink)]">Good game? Same time next week{g.clubTitle ? ` at ${g.clubTitle}` : ''}.</p>
					<Link href={rebookHref(g, tz)} className={BTN}>
						Book again
					</Link>
				</div>
			) : phase === 'canceled' ? (
				<p className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] px-6 py-5 text-sm text-[var(--color-ink-muted)]">
					This booking was cancelled.{' '}
					<Link href={g.clubSlug ? `/book?club=${g.clubSlug}` : '/book'} className="font-semibold text-[var(--color-primary)] underline underline-offset-4">
						Find another time
					</Link>
				</p>
			) : null}

			<p className="text-sm text-[var(--color-ink-dim)]">
				Booking #{g.ref} · {at(isoMin(g.from), tz, 'dddd D MMMM YYYY')}
			</p>
		</div>
	);
}

/** Add a player by email: they get the booking (and any change) by email. */
function InviteCrew({ game: g, onInvited }: { game: Game; onInvited: () => void }) {
	const [email, setEmail] = useState('');
	const [sending, setSending] = useState(false);
	const [error, setError] = useState('');
	const [sent, setSent] = useState<string[]>([]);
	const invited = [...g.invited, ...sent.filter((s) => !g.invited.includes(s))];
	const max = g.format === 'singles' ? 1 : 3;

	async function invite(e: React.FormEvent) {
		e.preventDefault();
		if (!/.+@.+\..+/.test(email.trim())) return;
		setSending(true);
		setError('');
		try {
			const res = await fetch(`/api/account/appointments/${g.id}/guests`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim() }) });
			if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Couldn’t send the invite.');
			setSent((s) => [...s, email.trim()]);
			setEmail('');
			onInvited();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Couldn’t send the invite.');
		} finally {
			setSending(false);
		}
	}

	return (
		<div className="rounded-[28px] border border-[var(--color-line)] bg-[var(--color-surface)] px-6 py-6 sm:px-8">
			<p className="heading-display text-xl text-[var(--color-ink)]">Your crew</p>
			<p className="mt-1 text-sm text-[var(--color-ink-muted)]">
				{g.crew.length ? `Playing: you, ${g.crew.join(', ')}.` : 'Add who’s playing.'} Invite them by email and they get the booking and any change.
			</p>
			{invited.length ? (
				<ul className="mt-4 flex flex-wrap gap-2">
					{invited.map((x) => (
						<li key={x} className="rounded-full border border-[var(--color-line-strong)] px-3 py-1 text-xs text-[var(--color-ink)]">
							{x}
						</li>
					))}
				</ul>
			) : null}
			<form onSubmit={invite} className="mt-4 flex flex-col gap-3 sm:flex-row">
				<input
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					placeholder="friend@example.com"
					aria-label="Player email"
					className={clsx('h-12 rounded-full border border-[var(--color-line-strong)] bg-[var(--color-bg)] px-5 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)] sm:max-w-sm sm:flex-1')}
				/>
				<button type="submit" disabled={sending || invited.length >= max} className={BTN}>
					{sending ? 'Sending…' : 'Send invite'}
				</button>
			</form>
			{error ? (
				<div className="mt-3">
					<ErrorNote>{error}</ErrorNote>
				</div>
			) : null}
		</div>
	);
}

function changeRules(g: Game, canMove: boolean, canCancel: boolean, tz: string): string {
	if (!canMove && !canCancel) return `It’s less than ${formatGap(g.cancelGap)} to your start, so it can’t be changed online. Call the club’s reception.`;
	if (g.cancelGap <= 0) return 'Free to change or cancel any time before you play. The court goes back on the board for others.';
	return `Free to change or cancel until ${at(isoMin(changeDeadline(g, g.cancelGap)), tz, 'ddd D MMM, HH:mm')} (${formatGap(g.cancelGap)} before you play).`;
}

