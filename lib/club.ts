import moment from 'moment-timezone';
import type { CurrentAvailabilitySlot, Location, ProductListItemResponse } from '@opencals/storefront-sdk';
import { siteConfig } from '@/lib/site-config';

/**
 * The club network as the booking UI sees it, plus all the availability maths.
 *
 * Store conventions (see README "Multi-club model"):
 * - A **club** is a physical store location.
 * - A **court** is one product variant in a court collection (`siteConfig.sports[].courtsCollection`), assigned to
 *   exactly one club, with `allowCustomDuration` on a 30-minute base. Each court is its own resource, so booking it
 *   blocks only that court.
 * - The court's format comes from its variant title: `Court 7 · Singles` is a singles court (narrow tile, 2 players),
 *   anything else is doubles.
 *
 * Everything here is pure and client-safe: the server builds the catalogue (`buildCatalogue`), and the browser
 * derives the hall map, the grid, the pulse and "free from 21:00" from a club's merged availability ranges.
 */

export type SportKey = string;
export type CourtFormat = 'doubles' | 'singles';

export interface Club {
	id: string;
	slug: string;
	/** Store location title ("VOLT Madrid") */
	title: string;
	/** Short name for chips and headings: the city, else the title */
	name: string;
	city: string | null;
	address: string | null;
	lat: number | null;
	lng: number | null;
	/** IANA timezone of the club's courts (their schedule), else the store's */
	tz: string;
	image: string;
	tagline: string | null;
	hours: string | null;
	phone: string | null;
	courtCount: number;
	/** Sport keys with at least one court here, in siteConfig order */
	sports: SportKey[];
}

export interface Court {
	/** The bookable variant id */
	id: string;
	slug: string;
	title: string;
	variantTitle: string;
	number: number;
	format: CourtFormat;
	sport: SportKey;
	clubId: string;
	/** Price per base unit */
	price: number;
	/** Base unit in seconds (30 min) */
	duration: number;
	/** Longest booking in seconds */
	maxDuration: number;
	color: string;
}

export interface Catalogue {
	clubs: Club[];
	courts: Court[];
}

/** A free span: [start, length] in UTC epoch minutes. */
export type Packed = [number, number];
export type ClubRanges = Record<string, Packed[]>;

export interface ClubAvailability {
	ranges: ClubRanges;
	/** Courts that couldn't be read this time (rate-limited); the client asks again shortly */
	failed: string[];
}

/** The location fields the catalogue reads (list and detail responses both carry them). */
export type LocationLike = Pick<
	Location,
	'id' | 'slug' | 'title' | 'city' | 'type' | 'displayAddress' | 'address' | 'addressLine1' | 'latitude' | 'longitude'
>;

export const STEP_MIN = 30;
export const GAME_LENGTHS = [60, 90, 120];
export const DEFAULT_LENGTH = 90;
export const WINDOW_DAYS = 14;

// ── Catalogue ────────────────────────────────────────────────────────────

const fold = (s: string | null | undefined): string =>
	(s ?? '')
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.trim();

function trailingNumber(s: string): number {
	const m = s.match(/(\d+)/);
	return m?.[1] ? parseInt(m[1], 10) : 0;
}

export function courtFormat(variantTitle: string): CourtFormat {
	return /singles?/i.test(variantTitle) ? 'singles' : 'doubles';
}

export function sportOf(key: SportKey) {
	return siteConfig.sports.find((s) => s.key === key) ?? siteConfig.sports[0]!;
}

/** Presentation for a club from siteConfig.clubs, matched by location slug or city. */
function presentationFor(loc: LocationLike, index: number) {
	const keys = [fold(loc.slug), fold(loc.city), fold(loc.title)];
	const match = siteConfig.clubs.presentation.find((p) => p.match.some((m) => keys.some((k) => k.includes(fold(m)))));
	const images = siteConfig.clubs.fallbackImages;
	return {
		image: match?.image ?? images[index % images.length]!,
		tagline: match?.tagline ?? null,
		hours: match?.hours ?? null,
		phone: match?.phone ?? null,
	};
}

export function buildCatalogue(
	groups: ProductListItemResponse[],
	locations: LocationLike[],
	storeTz: string,
): Catalogue {
	const sportByCollection = new Map<string, SportKey>(siteConfig.sports.map((s) => [s.courtsCollection, s.key]));
	const courts: Court[] = [];
	const tzByClub = new Map<string, string>();

	for (const group of groups) {
		for (const v of group.variants ?? []) {
			if (v.status && v.status !== 'active') continue;
			const sport = v.collections?.map((c) => sportByCollection.get(c.slug)).find(Boolean);
			const clubId = v.locations?.[0]?.id;
			if (!sport || !clubId) continue;
			if (v.schedule?.timezone && !tzByClub.has(clubId)) tzByClub.set(clubId, v.schedule.timezone);
			courts.push({
				id: v.id,
				slug: v.slug,
				title: v.title,
				variantTitle: v.variantTitle,
				number: trailingNumber(v.variantTitle) || courts.length + 1,
				format: courtFormat(v.variantTitle),
				sport,
				clubId,
				price: v.price,
				duration: v.duration || STEP_MIN * 60,
				maxDuration: v.allowCustomDuration ? Math.max(v.maxDuration || 0, v.duration) : v.duration,
				color: v.color,
			});
		}
	}

	const sportOrder: string[] = siteConfig.sports.map((s) => s.key);
	courts.sort(
		(a, b) => sportOrder.indexOf(a.sport) - sportOrder.indexOf(b.sport) || a.number - b.number || a.format.localeCompare(b.format),
	);

	const physical = locations.filter((l) => l.type === 'physical');
	const clubs: Club[] = physical
		.map((loc, i) => {
			const own = courts.filter((c) => c.clubId === loc.id);
			const p = presentationFor(loc, i);
			return {
				id: loc.id,
				slug: loc.slug,
				title: loc.title ?? loc.city ?? loc.slug,
				name: loc.city ?? loc.title ?? loc.slug,
				city: loc.city,
				address: loc.displayAddress ?? loc.address ?? ([loc.addressLine1, loc.city].filter(Boolean).join(', ') || null),
				lat: loc.latitude,
				lng: loc.longitude,
				tz: tzByClub.get(loc.id) ?? storeTz,
				courtCount: own.length,
				sports: sportOrder.filter((k) => own.some((c) => c.sport === k)),
				...p,
			};
		})
		// Clubs with courts first; a location without courts (an office, a coming-soon venue) stays listed last.
		.sort((a, b) => Number(b.courtCount > 0) - Number(a.courtCount > 0));

	return { clubs, courts };
}

export function clubBySlug(cat: Catalogue, slug: string | null | undefined): Club | null {
	if (!slug) return null;
	return cat.clubs.find((c) => c.slug === slug || c.id === slug) ?? null;
}

export function courtsAt(cat: Catalogue, clubId: string, sport?: SportKey): Court[] {
	return cat.courts.filter((c) => c.clubId === clubId && (!sport || c.sport === sport));
}

// ── Geometry ─────────────────────────────────────────────────────────────

export function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
	const R = 6371;
	const dLat = ((b.lat - a.lat) * Math.PI) / 180;
	const dLng = ((b.lng - a.lng) * Math.PI) / 180;
	const s =
		Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(s));
}

// ── Time ─────────────────────────────────────────────────────────────────

export function todayIn(tz: string): string {
	return moment().tz(tz).format('YYYY-MM-DD');
}

export function nextDays(from: string, n: number): string[] {
	const start = moment(from, 'YYYY-MM-DD');
	return Array.from({ length: n }, (_, i) => start.clone().add(i, 'day').format('YYYY-MM-DD'));
}

/** UTC epoch minute of local midnight on `date` in `tz`. */
export function dayStart(date: string, tz: string): number {
	return moment.tz(date, 'YYYY-MM-DD', tz).valueOf() / 60000;
}

/** Format a UTC epoch minute in the club's timezone. */
export function at(min: number, tz: string, format: string): string {
	return moment.utc(min * 60000).tz(tz).format(format);
}

export function localDay(min: number, tz: string): string {
	return at(min, tz, 'YYYY-MM-DD');
}

export function nowMin(): number {
	return Math.floor(Date.now() / 60000);
}

const SLOT_FORMATS = ['YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm'];

/** Merged availability (UTC date + time strings) → packed spans. */
export function pack(s: Pick<CurrentAvailabilitySlot, 'fromDate' | 'fromTime' | 'toDate' | 'toTime'>): Packed {
	const from = moment.utc(`${s.fromDate} ${s.fromTime}`, SLOT_FORMATS).valueOf() / 60000;
	const to = moment.utc(`${s.toDate} ${s.toTime}`, SLOT_FORMATS).valueOf() / 60000;
	const start = Math.ceil(from);
	return [start, Math.max(0, Math.floor(to) - start)];
}

/** The appointment slot for a game on a court, in the API's UTC date/time shape. */
export function toSlot(court: Court, startMin: number, minutes: number): CurrentAvailabilitySlot {
	const from = moment.utc(startMin * 60000);
	const to = moment.utc((startMin + minutes) * 60000);
	return {
		productId: court.id,
		fromDate: from.format('YYYY-MM-DD'),
		fromTime: from.format('HH:mm:ss'),
		toDate: to.format('YYYY-MM-DD'),
		toTime: to.format('HH:mm:ss'),
		staffMemberIds: null,
		locationIds: [court.clubId],
		attendees: 0,
		maxAttendees: 1,
	};
}

// ── Prices ───────────────────────────────────────────────────────────────

export function baseMinutes(court: Court): number {
	return Math.max(1, Math.round(court.duration / 60));
}

export function maxMinutes(court: Court): number {
	return Math.max(baseMinutes(court), Math.round(court.maxDuration / 60));
}

/** Units of the base duration a game takes (the API prices custom durations as ceil(length / base) × price). */
export function unitsFor(court: Court, minutes: number): number {
	return Math.max(1, Math.ceil(minutes / baseMinutes(court)));
}

export function priceFor(court: Court, minutes: number): number {
	return court.price * unitsFor(court, minutes);
}

export function playersOn(court: Court): number {
	return court.format === 'singles' ? 2 : 4;
}

// ── Starts and the board ─────────────────────────────────────────────────

/** Starts on one local day where `minutes` fits inside a free span (one every 30 min, future only). */
export function startsOn(ranges: Packed[] | undefined, date: string, tz: string, minutes: number): number[] {
	const ds = dayStart(date, tz);
	const de = ds + 1440;
	const now = nowMin();
	const out: number[] = [];
	for (const [rs, len] of ranges ?? []) {
		const re = rs + len;
		if (re <= ds || rs >= de) continue;
		const first = Math.ceil(Math.max(rs, ds) / STEP_MIN) * STEP_MIN;
		for (let s = first; s + minutes <= re && s < de; s += STEP_MIN) if (s >= now) out.push(s);
	}
	return out.sort((a, b) => a - b);
}

/** Is the court free for `minutes` from `start`? */
export function freeAt(ranges: Packed[] | undefined, start: number, minutes: number): boolean {
	return (ranges ?? []).some(([rs, len]) => rs <= start && start + minutes <= rs + len);
}

/** How long (minutes) the court stays free from `start` (0 when taken). */
export function freeRun(ranges: Packed[] | undefined, start: number): number {
	for (const [rs, len] of ranges ?? []) if (rs <= start && start < rs + len) return rs + len - start;
	return 0;
}

export interface FreeCourt {
	court: Court;
	price: number;
}

/** A start where at least one court is free for the whole game; courts cheapest first, doubles before singles. */
export interface BoardRow {
	start: number;
	courts: FreeCourt[];
}

export function courtBoard(courts: Court[], ranges: ClubRanges, date: string, tz: string, minutes: number): BoardRow[] {
	const byStart = new Map<number, FreeCourt[]>();
	for (const court of courts) {
		if (minutes > maxMinutes(court)) continue;
		for (const s of startsOn(ranges[court.id], date, tz, minutes)) {
			const list = byStart.get(s) ?? [];
			list.push({ court, price: priceFor(court, minutes) });
			byStart.set(s, list);
		}
	}
	return [...byStart.entries()]
		.sort(([a], [b]) => a - b)
		.map(([start, list]) => ({
			start,
			courts: list.sort(
				(a, b) =>
					Number(a.court.format === 'singles') - Number(b.court.format === 'singles') ||
					a.price - b.price ||
					a.court.number - b.court.number,
			),
		}));
}

/** Days in the window with any court free for this length (sold-out days are struck through on the strip). */
export function courtDays(courts: Court[], ranges: ClubRanges, days: string[], tz: string, minutes: number): Set<string> {
	const out = new Set<string>();
	for (const d of days) if (courts.some((c) => minutes <= maxMinutes(c) && startsOn(ranges[c.id], d, tz, minutes).length)) out.add(d);
	return out;
}

/** The soonest start any court is free for `minutes`. */
export function nextFree(courts: Court[], ranges: ClubRanges, minutes: number): number | null {
	const now = nowMin();
	let best: number | null = null;
	for (const c of courts) {
		if (minutes > maxMinutes(c)) continue;
		for (const [rs, len] of ranges[c.id] ?? []) {
			const s = Math.max(Math.ceil(rs / STEP_MIN) * STEP_MIN, Math.ceil(now / STEP_MIN) * STEP_MIN);
			if (s + minutes <= rs + len) {
				if (best === null || s < best) best = s;
				break;
			}
		}
	}
	return best;
}

/** Local opening window (minutes from midnight) of the club on a day, from the free spans; 07:00–23:00 when unknown. */
export function dayWindow(courts: Court[], ranges: ClubRanges, date: string, tz: string): { open: number; close: number } {
	const ds = dayStart(date, tz);
	let open = Infinity;
	let close = -Infinity;
	for (const c of courts)
		for (const [rs, len] of ranges[c.id] ?? []) {
			const s = Math.max(rs, ds);
			const e = Math.min(rs + len, ds + 1440);
			if (e <= s) continue;
			open = Math.min(open, s - ds);
			close = Math.max(close, e - ds);
		}
	if (open === Infinity) return { open: 7 * 60, close: 23 * 60 };
	return {
		open: Math.min(7 * 60, Math.floor(open / 60) * 60),
		close: Math.max(23 * 60, Math.ceil(close / STEP_MIN) * STEP_MIN),
	};
}

// ── Copy ─────────────────────────────────────────────────────────────────

export function formatLength(minutes: number): string {
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	if (h && m) return `${h}h ${m}m`;
	if (h) return `${h}h`;
	return `${m} min`;
}

export function relativeDay(date: string, today: string): string {
	if (date === today) return 'Today';
	if (date === moment(today).add(1, 'day').format('YYYY-MM-DD')) return 'Tomorrow';
	return moment(date).format('ddd D MMM');
}
