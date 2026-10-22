'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import moment from 'moment-timezone';
import { useSettings } from '@/contexts/settings-context';
import { useHomeClub } from '@/hooks/use-home-club';
import { useClubAvailability } from '@/hooks/use-club-availability';
import { useClubGrid, type DurationOption } from '@/hooks/use-club-grid';
import type { CourtSelection } from '@/hooks/use-court-booking';
import {
	at,
	courtBoard,
	courtDays,
	courtsAt,
	DEFAULT_LENGTH,
	GAME_LENGTHS,
	nextDays,
	sportOf,
	todayIn,
	toSlot,
	unitsFor,
	WINDOW_DAYS,
	type Catalogue,
	type Club,
	type ClubAvailability,
	type Court,
	type SportKey,
} from '@/lib/club';
import { ClubChooser } from '@/components/book/club-chooser';
import { ClubHero } from '@/components/book/club-hero';
import { HallMap } from '@/components/book/hall-map';
import { BookToolbar, DayStrip, type BookView as View } from '@/components/book/book-controls';
import { CourtGrid } from '@/components/booking/court-grid';
import { CourtCheckout } from '@/components/book/court-checkout';

export interface BookParams {
	club?: string;
	sport?: string;
	date?: string;
	length?: string;
	time?: string;
	view?: string;
}

/**
 * /book: club-first, full-screen court booking.
 *
 * One club at a time (the linked one, the remembered one, or "Near me"); new visitors get the chooser. For the club:
 * the hero, then day / sport / length, then the courts as a **Hall map** (courts from above, lit for one start) or a
 * **Grid** (courts × half hours). Both read the same per-club availability (one request, computed locally) and hand
 * a court + slot to the checkout. View state lives in the URL (`?club=&sport=&date=&length=&time=&view=`), written
 * with replaceState so changing it never re-renders the server page.
 */
export function BookView({
	cat,
	params,
	initialAvailability,
}: {
	cat: Catalogue;
	params: BookParams;
	/** Server-read availability for the linked club, so the hall paints on first load */
	initialAvailability: { clubId: string; data: ClubAvailability } | null;
}) {
	const { currency } = useSettings();
	const home = useHomeClub(cat, params.club);
	const [message, setMessage] = useState<string | null>(null);
	const club = useMemo(() => cat.clubs.find((c) => c.id === home.club) ?? null, [cat.clubs, home.club]);

	if (!home.ready) return <div className="min-h-screen bg-[var(--color-bg)]" />;
	if (!club) {
		return (
			<ClubChooser
				cat={cat}
				onPick={(c) => home.setClub(c.id)}
				onLocate={() => home.locate(setMessage)}
				canLocate={home.canLocate}
				locating={home.locating}
				distances={home.distances}
				message={message}
			/>
		);
	}
	return (
		<ClubBooking
			key={club.id}
			cat={cat}
			club={club}
			params={params}
			currency={currency}
			initialAvailability={initialAvailability?.clubId === club.id ? initialAvailability.data : undefined}
			onChangeClub={(c) => home.setClub(c.id)}
			onLocate={() => home.locate(setMessage)}
			canLocate={home.canLocate}
			locating={home.locating}
		/>
	);
}

function parseLength(v: string | undefined): number {
	const n = Number(v);
	return GAME_LENGTHS.includes(n) ? n : DEFAULT_LENGTH;
}

function ClubBooking({
	cat,
	club,
	params,
	currency,
	initialAvailability,
	onChangeClub,
	onLocate,
	canLocate,
	locating,
}: {
	cat: Catalogue;
	club: Club;
	params: BookParams;
	currency: string | undefined;
	initialAvailability: ClubAvailability | undefined;
	onChangeClub: (c: Club) => void;
	onLocate: () => void;
	canLocate: boolean;
	locating: boolean;
}) {
	const tz = club.tz;
	const today = useMemo(() => todayIn(tz), [tz]);
	const days = useMemo(() => nextDays(today, WINDOW_DAYS), [today]);

	const [sport, setSport] = useState<SportKey>(() => (params.sport && club.sports.includes(params.sport) ? params.sport : (club.sports[0] ?? '')));
	const [date, setDateState] = useState(() => (params.date && days.includes(params.date) ? params.date : today));
	const [minutes, setMinutes] = useState(() => parseLength(params.length));
	const [start, setStart] = useState<number | null>(() => {
		if (!params.time || !/^\d{2}:\d{2}$/.test(params.time)) return null;
		const d = params.date && days.includes(params.date) ? params.date : today;
		return moment.tz(`${d} ${params.time}`, 'YYYY-MM-DD HH:mm', tz).valueOf() / 60000;
	});
	const [view, setView] = useState<View>(params.view === 'grid' ? 'grid' : 'map');
	const [openCourt, setOpenCourt] = useState<string | null>(null);
	const [selection, setSelection] = useState<CourtSelection | null>(null);

	const availability = useClubAvailability(club.id, initialAvailability);
	const clubCourts = useMemo(() => courtsAt(cat, club.id), [cat, club.id]);
	const courts = useMemo(() => clubCourts.filter((c) => c.sport === sport), [clubCourts, sport]);
	const pendingIds = useMemo(() => new Set(courts.filter((c) => !(c.id in availability.ranges)).map((c) => c.id)), [courts, availability.ranges]);

	const rows = useMemo(() => courtBoard(courts, availability.ranges, date, tz, minutes), [courts, availability.ranges, date, tz, minutes]);
	const known = Object.keys(availability.ranges).length > 0;
	const openDays = useMemo(() => courtDays(courts, availability.ranges, days, tz, minutes), [courts, availability.ranges, days, tz, minutes]);
	const nextDay = useMemo(() => days.find((d) => d > date && openDays.has(d)) ?? null, [days, date, openDays]);
	const grid = useClubGrid(courts, availability.ranges, date, tz);

	const setDate = useCallback((d: string) => {
		setDateState(d);
		setStart(null);
		setOpenCourt(null);
	}, []);
	const changeSport = useCallback((s: SportKey) => {
		setSport(s);
		setOpenCourt(null);
	}, []);

	// Keep the URL shareable without a server round trip.
	useEffect(() => {
		const q = new URLSearchParams();
		q.set('club', club.slug);
		q.set('sport', sport);
		q.set('date', date);
		q.set('length', String(minutes));
		if (start !== null && localDayOf(start, tz) === date) q.set('time', at(start, tz, 'HH:mm'));
		if (view !== 'map') q.set('view', view);
		window.history.replaceState(window.history.state, '', `/book?${q.toString()}`);
	}, [club.slug, sport, date, minutes, start, view, tz]);

	const choose = useCallback(
		(sel: CourtSelection) => {
			setSelection(sel);
			window.scrollTo({ top: 0, behavior: 'auto' });
		},
		[],
	);
	const bookFromMap = useCallback(
		(court: Court, s: number) => choose({ court, slot: toSlot(court, s, minutes), units: unitsFor(court, minutes), locationId: club.id }),
		[choose, minutes, club.id],
	);
	const bookFromGrid = useCallback(
		(court: Court, option: DurationOption) => choose({ court, slot: option.slot, units: option.units, locationId: club.id }),
		[choose, club.id],
	);
	const back = useCallback(() => {
		setSelection(null);
		void availability.refresh();
	}, [availability]);

	if (selection) return <CourtCheckout selection={selection} club={club} currency={currency} onBack={back} />;

	const sportInfo = sportOf(sport);

	return (
		<div className="min-h-screen bg-[var(--color-bg)]">
			<ClubHero cat={cat} club={club} courts={clubCourts} currency={currency} onChange={onChangeClub} onLocate={onLocate} canLocate={canLocate} locating={locating} />

			<div className="relative z-10 mx-auto -mt-6 max-w-[1600px] px-3 pb-24 sm:px-6 lg:px-10">
				<div className="space-y-4 rounded-[28px] border border-[var(--color-line)] bg-[var(--color-surface)]/90 p-3 backdrop-blur sm:p-5">
					<DayStrip days={days} date={date} today={today} open={openDays} known={known} onChange={setDate} />
					<BookToolbar sports={club.sports} sport={sport} onSport={changeSport} minutes={minutes} onMinutes={setMinutes} view={view} onView={setView} />
				</div>

				<div className="mt-5">
					{availability.error ? (
						<div className="rounded-[28px] border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface)] py-14 text-center">
							<p className="text-sm text-[var(--color-ink-muted)]">Couldn’t load the courts. Please try again in a moment.</p>
						</div>
					) : view === 'map' ? (
						<HallMap
							tz={tz}
							sport={{ key: sport, label: sportInfo.label }}
							courts={courts}
							rows={rows}
							complete={availability.complete}
							pendingIds={pendingIds}
							date={date}
							today={today}
							minutes={minutes}
							start={start !== null && localDayOf(start, tz) === date ? start : null}
							onStart={setStart}
							openCourt={openCourt}
							onOpenCourt={setOpenCourt}
							onBook={bookFromMap}
							nextDay={nextDay}
							onDate={setDate}
							onMinutes={setMinutes}
							currency={currency}
						/>
					) : (
						<CourtGrid
							courts={courts}
							columns={grid.columns}
							slotsLoading={availability.loading || pendingIds.size > 0}
							error={false}
							date={date}
							timezone={tz}
							isFree={grid.isFree}
							durationOptions={grid.durationOptions}
							isCourtPending={(id) => pendingIds.has(id)}
							currency={currency}
							onSelect={bookFromGrid}
						/>
					)}
				</div>

				<div className="mt-10 grid gap-4 md:grid-cols-2">
					<Link
						href={`/training?club=${club.slug}&sport=${sport}`}
						className="group flex items-center justify-between gap-4 rounded-[28px] border border-[var(--color-line)] bg-[var(--color-surface)] px-6 py-6 transition-colors hover:border-[var(--color-primary)]"
					>
						<span>
							<span className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]">Train at {club.name}</span>
							<span className="heading-display mt-1 block text-xl text-[var(--color-ink)]">{sportInfo.label} lessons &amp; group classes</span>
						</span>
						<Arrow />
					</Link>
					<Link
						href={`/coaches?club=${club.slug}`}
						className="group flex items-center justify-between gap-4 rounded-[28px] border border-[var(--color-line)] bg-[var(--color-surface)] px-6 py-6 transition-colors hover:border-[var(--color-primary)]"
					>
						<span>
							<span className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]">The bench</span>
							<span className="heading-display mt-1 block text-xl text-[var(--color-ink)]">Coaches at {club.name}</span>
						</span>
						<Arrow />
					</Link>
				</div>
			</div>
		</div>
	);
}

function localDayOf(min: number, tz: string): string {
	return at(min, tz, 'YYYY-MM-DD');
}

function Arrow() {
	return (
		<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-line-strong)] text-[var(--color-ink)] transition-colors group-hover:border-[var(--color-primary)] group-hover:bg-[var(--color-primary)] group-hover:text-white">
			<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
				<path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
			</svg>
		</span>
	);
}
