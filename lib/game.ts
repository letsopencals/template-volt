/**
 * A booked appointment, read as a game at a VOLT club: a court (which one, doubles or singles, the crew) or a
 * training (level, coach, places), which club, when, the kit, and what can still be changed. Pure functions,
 * safe on the server and the client; everything comes from the appointment the Storefront API returns, matched
 * against the catalogue (clubs + courts).
 */
import moment from 'moment-timezone';
import { formatLabel, formatLength, playersOn, sportOf, type Catalogue, type Club, type CourtFormat } from '@/lib/club';
import { siteConfig } from '@/lib/site-config';

/** The appointment fields every SDK appointment shape (list, detail, order line) shares. */
export interface AppointmentLike {
	id: string;
	name: string;
	status: string;
	from: string;
	to: string;
	productId?: string;
	locationId?: string | null;
	staffMemberId?: string | null;
	numberOfAttendees: number;
	customAttributes?: { [key: string]: string } | null;
	guests?: { id?: string; email: string }[] | null;
	product: {
		id?: string;
		slug: string;
		title: string;
		variantTitle?: string | null;
		cancelGap?: number;
		rescheduleGap?: number;
		allowCustomerCancel?: boolean;
		allowCustomerReschedule?: boolean;
		allowCustomDuration?: boolean;
	};
	location: {
		id?: string;
		slug?: string;
		title: string | null;
		address: string | null;
		displayAddress?: string | null;
		city: string | null;
		latitude: number | null;
		longitude: number | null;
	} | null;
	staffMember?: { firstName?: string | null; lastName?: string | null } | null;
}

export type GameKind = 'court' | 'training';

export interface GameExtra {
	title: string;
	quantity: number;
}

export interface Game {
	id: string;
	/** Booking reference, e.g. "1042" */
	ref: string;
	status: string;
	from: string;
	to: string;
	minutes: number;
	/** Custom-duration product: rescheduling asks for slots of the booked length */
	custom: boolean;
	kind: GameKind;
	/** Sport key (padel, squash…) */
	sport: string;
	/** "Court 3", "Padel Group Class" */
	title: string;
	/** "Doubles · 1h 30m", "Intermediate · 1h" */
	detail: string;
	courtNumber: number | null;
	format: CourtFormat | null;
	clubId: string | null;
	clubSlug: string | null;
	clubTitle: string;
	clubImage: string | null;
	address: string;
	hours: string | null;
	phone: string | null;
	lat: number | null;
	lng: number | null;
	/** Places booked (trainings) */
	seats: number;
	/** The booker's crew by first name (courts), from customAttributes.crew */
	crew: string[];
	/** Emails invited as guests */
	invited: string[];
	coach: string | null;
	extras: GameExtra[];
	/** False when the source (an appointment list) doesn't carry add-ons */
	extrasKnown: boolean;
	productId: string;
	locationId: string | null;
	staffMemberId: string | null;
	cancelGap: number;
	rescheduleGap: number;
	allowCancel: boolean;
	allowReschedule: boolean;
}

/** Crew names travel as one custom attribute: "Sam, Alex, Jo". */
export function crewOf(attrs: { [key: string]: string } | null | undefined): string[] {
	return (attrs?.crew ?? '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
}

function joinAddress(parts: (string | null | undefined)[]): string {
	const out: string[] = [];
	for (const p of parts) {
		const v = p?.trim();
		if (v && !out.join(', ').toLowerCase().includes(v.toLowerCase())) out.push(v);
	}
	return out.join(', ');
}

/** Trainings carry no court: the sport is the one whose label the product title names, else the first. */
export function sportFromTitle(title: string): string {
	const t = title.toLowerCase();
	return (siteConfig.sports.find((s) => t.includes(s.label.toLowerCase())) ?? siteConfig.sports[0]!).key;
}

export function clubFor(cat: Catalogue, locationId: string | null | undefined, slug?: string | null): Club | null {
	return cat.clubs.find((c) => c.id === locationId || (slug && c.slug === slug)) ?? null;
}

export function toGame(a: AppointmentLike, cat: Catalogue, extras?: GameExtra[]): Game {
	const productId = a.productId ?? a.product.id ?? '';
	const court = cat.courts.find((c) => c.id === productId) ?? null;
	const club = clubFor(cat, court?.clubId ?? a.locationId ?? a.location?.id, a.location?.slug);
	const minutes = Math.max(0, Math.round((Date.parse(a.to) - Date.parse(a.from)) / 60000));
	const loc = a.location;
	const kind: GameKind = court ? 'court' : 'training';
	const coach = a.staffMember ? [a.staffMember.firstName, a.staffMember.lastName].filter(Boolean).join(' ') || null : null;
	const variant = a.product.variantTitle && a.product.variantTitle !== a.product.title ? a.product.variantTitle : null;
	return {
		id: a.id,
		ref: a.name,
		status: a.status,
		from: a.from,
		to: a.to,
		minutes,
		custom: a.product.allowCustomDuration ?? !!court,
		kind,
		sport: court?.sport ?? sportFromTitle(a.product.title),
		title: court ? `Court ${court.number}` : a.product.title,
		detail: court
			? [sportOf(court.sport).label, formatLabel(court), formatLength(minutes)].filter(Boolean).join(' · ')
			: [variant, formatLength(minutes)].filter(Boolean).join(' · '),
		courtNumber: court?.number ?? null,
		format: court?.format ?? null,
		clubId: club?.id ?? a.locationId ?? null,
		clubSlug: club?.slug ?? loc?.slug ?? null,
		clubTitle: club?.title ?? loc?.title ?? '',
		clubImage: club?.image ?? null,
		address: club?.address || loc?.displayAddress || joinAddress([loc?.address, loc?.city]),
		hours: club?.hours ?? null,
		phone: club?.phone ?? null,
		lat: club?.lat ?? loc?.latitude ?? null,
		lng: club?.lng ?? loc?.longitude ?? null,
		seats: Math.max(1, a.numberOfAttendees || 1),
		crew: crewOf(a.customAttributes),
		invited: (a.guests ?? []).map((g) => g.email).filter(Boolean),
		coach: kind === 'training' ? coach : null,
		extras: (extras ?? []).filter((x) => x.quantity > 0),
		extrasKnown: extras !== undefined,
		productId,
		locationId: a.locationId ?? club?.id ?? null,
		staffMemberId: a.staffMemberId ?? null,
		cancelGap: a.product.cancelGap ?? 0,
		rescheduleGap: a.product.rescheduleGap ?? 0,
		allowCancel: a.product.allowCustomerCancel ?? true,
		allowReschedule: a.product.allowCustomerReschedule ?? true,
	};
}

/** Spots on court: 4 for padel doubles, 2 for singles and squash. */
export function spotsOf(g: Pick<Game, 'kind' | 'format' | 'sport'>): number {
	return g.kind !== 'court' ? 0 : playersOn({ format: g.format ?? 'doubles', sport: g.sport });
}

/** Who's playing: the booker plus their crew (courts), or the places booked. */
export function playersOnCourt(g: Pick<Game, 'kind' | 'crew' | 'seats'>): number {
	return g.kind === 'court' ? 1 + g.crew.length : g.seats;
}

export type GamePhase = 'upcoming' | 'today' | 'now' | 'past' | 'canceled';

export function gamePhase(g: Pick<Game, 'from' | 'to' | 'status'>, now: number, tz: string): GamePhase {
	if (g.status === 'canceled') return 'canceled';
	if (now >= Date.parse(g.to) || g.status === 'completed') return 'past';
	if (now >= Date.parse(g.from)) return 'now';
	return moment(now).tz(tz).isSame(moment.utc(g.from).tz(tz), 'day') ? 'today' : 'upcoming';
}

/** Can the player still move (or cancel) it? Scheduled, allowed, and outside the notice window. */
export function canChange(g: Game, kind: 'reschedule' | 'cancel', now: number): boolean {
	const allowed = kind === 'reschedule' ? g.allowReschedule : g.allowCancel;
	const gap = kind === 'reschedule' ? g.rescheduleGap : g.cancelGap;
	return allowed && g.status === 'scheduled' && Date.parse(g.from) - gap * 1000 > now;
}

/** "24 hours", "2 days", "30 minutes" for a notice window in seconds. */
export function formatGap(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	if (hours >= 48 && hours % 24 === 0 && minutes === 0) return `${hours / 24} days`;
	if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
	if (hours > 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
	return `${minutes} minutes`;
}

/** When the cancel / reschedule window closes. */
export function changeDeadline(g: Pick<Game, 'from'>, gapSeconds: number): string {
	return new Date(Date.parse(g.from) - gapSeconds * 1000).toISOString();
}

/** "in 3 days", "tomorrow", "in 2 hours" (null once it has started). */
export function untilText(iso: string, now: number, tz: string): string | null {
	const start = moment.utc(iso);
	if (start.valueOf() <= now) return null;
	const days = start.clone().tz(tz).startOf('day').diff(moment(now).tz(tz).startOf('day'), 'days');
	if (days === 0) {
		const mins = Math.round((start.valueOf() - now) / 60000);
		const h = Math.round(mins / 60);
		return mins < 60 ? `in ${mins} min` : `in ${h} ${h === 1 ? 'hour' : 'hours'}`;
	}
	if (days === 1) return 'tomorrow';
	return `in ${days} days`;
}

/** A map link from the club's coordinates, else its address. */
export function directionsUrl(g: Pick<Game, 'lat' | 'lng' | 'address' | 'clubTitle'>): string {
	if (g.lat != null && g.lng != null) return `https://www.google.com/maps/dir/?api=1&destination=${g.lat},${g.lng}`;
	return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(g.address || g.clubTitle)}`;
}

/** The game's name as a line: "Padel · Court 3" or the training title. */
export function gameName(g: Pick<Game, 'kind' | 'sport' | 'title'>): string {
	return g.kind === 'court' ? `${sportOf(g.sport).label} · ${g.title}` : g.title;
}

/** A one-event calendar file as a data URL (no endpoint needed). */
export function icsHref(g: Game): string {
	const stamp = (iso: string) => moment.utc(iso).format('YYYYMMDD[T]HHmmss[Z]');
	const esc = (s: string) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
	const body = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//VOLT//Booking//EN',
		'BEGIN:VEVENT',
		`UID:${g.id}@volt`,
		`DTSTAMP:${stamp(g.from)}`, // deterministic, so the server and client render the same link
		`DTSTART:${stamp(g.from)}`,
		`DTEND:${stamp(g.to)}`,
		`SUMMARY:${esc(`${gameName(g)} · ${g.clubTitle}`)}`,
		`LOCATION:${esc(g.address)}`,
		`DESCRIPTION:${esc(`Booking #${g.ref}. ${g.detail}.${g.crew.length ? ` Playing: ${g.crew.join(', ')}.` : ''}`)}`,
		'END:VEVENT',
		'END:VCALENDAR',
	].join('\r\n');
	return `data:text/calendar;charset=utf-8,${encodeURIComponent(body)}`;
}

/** A shareable invite for the crew (plain text for the share sheet). */
export function inviteText(g: Game, tz: string): string {
	const when = moment.utc(g.from).tz(tz).format('dddd D MMMM, HH:mm');
	return `Game on: ${gameName(g)}, ${g.clubTitle}, ${when} (${formatLength(g.minutes)}). ${g.address}.`;
}

/** The same club, weekday, start and length, the next time that weekday comes round. */
export function rebookHref(g: Game, tz: string): string {
	if (g.kind !== 'court') return g.clubSlug ? `/training?club=${g.clubSlug}&sport=${g.sport}` : '/training';
	if (!g.clubSlug) return '/book';
	const start = moment.utc(g.from).tz(tz);
	const next = moment().tz(tz).isoWeekday(start.isoWeekday());
	if (next.isSameOrBefore(moment().tz(tz), 'day')) next.add(7, 'days');
	const length = [60, 90, 120].includes(g.minutes) ? `&length=${g.minutes}` : '';
	return `/book?club=${g.clubSlug}&sport=${g.sport}&date=${next.format('YYYY-MM-DD')}${length}&time=${start.format('HH:mm')}`;
}
