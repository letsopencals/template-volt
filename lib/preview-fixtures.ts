import moment from 'moment-timezone';
import { buildCatalogue, type Catalogue } from '@/lib/club';
import type { AppointmentLike } from '@/lib/game';

/**
 * Fixture clubs, courts and bookings for /preview (design review of the confirmation and account screens without a
 * live store or a session). The catalogue mirrors the seeded VOLT network; bookings sit around "now".
 */
const TZ = 'Europe/Madrid';
const CLUBS = [
	{ id: 'loc-madrid', slug: 'volt-madrid', title: 'VOLT Madrid', city: 'Madrid', lat: 40.3964, lng: -3.6953, address: 'Calle del Saque 12, Madrid', courts: [5, 1, 2] },
	{ id: 'loc-barcelona', slug: 'volt-barcelona', title: 'VOLT Barcelona', city: 'Barcelona', lat: 41.4021, lng: 2.1979, address: 'Carrer de Pallars 184, Barcelona', courts: [6, 2, 0] },
	{ id: 'loc-valencia', slug: 'volt-valencia', title: 'VOLT Valencia', city: 'Valencia', lat: 39.4627, lng: -0.3471, address: 'Avinguda del Port 221, Valencia', courts: [4, 0, 2] },
	{ id: 'loc-malaga', slug: 'volt-malaga', title: 'VOLT Málaga', city: 'Málaga', lat: 36.7088, lng: -4.4339, address: 'Calle Héroe de Sostoa 96, Málaga', courts: [4, 1, 0] },
];

export function previewCatalogue(): Catalogue {
	const groups = CLUBS.flatMap((c) => {
		const [doubles, singles, squash] = c.courts as [number, number, number];
		const v = (sport: string, n: number, isSingles: boolean, price: number) => ({
			id: `${c.id}-${sport}-${n}`,
			slug: `${sport}-court-${c.slug.replace('volt-', '')}-${n}`,
			title: sport === 'padel' ? 'Padel Court' : 'Squash Court',
			variantTitle: isSingles ? `Court ${n} · Singles` : `Court ${n}`,
			price,
			duration: 1800,
			allowCustomDuration: true,
			maxDuration: 7200,
			color: 'orange',
			status: 'active',
			locations: [{ id: c.id }],
			collections: [{ slug: `${sport}-courts` }],
			schedule: { timezone: TZ },
		});
		return [
			{ variants: [...Array.from({ length: doubles }, (_, i) => v('padel', i + 1, false, 15)), ...Array.from({ length: singles }, (_, i) => v('padel', doubles + i + 1, true, 10))] },
			{ variants: Array.from({ length: squash }, (_, i) => v('squash', i + 1, false, 12)) },
		];
	});
	const locations = CLUBS.map((c) => ({ id: c.id, slug: c.slug, title: c.title, city: c.city, type: 'physical' as const, displayAddress: c.address, address: c.address, addressLine1: null, latitude: c.lat, longitude: c.lng }));
	return buildCatalogue(groups as never, locations, TZ);
}

export const PREVIEW_TZ = TZ;

function at(daysFromNow: number, time: string): moment.Moment {
	const [h, m] = time.split(':').map(Number) as [number, number];
	return moment().tz(TZ).add(daysFromNow, 'days').hours(h).minutes(m).seconds(0).milliseconds(0);
}

function appt(o: {
	id: string;
	ref: string;
	club: (typeof CLUBS)[number];
	productId: string;
	title: string;
	variantTitle?: string;
	start: moment.Moment;
	minutes: number;
	status?: string;
	crew?: string;
	guests?: string[];
	seats?: number;
	coach?: string;
}): AppointmentLike {
	return {
		id: o.id,
		name: o.ref,
		status: o.status ?? 'scheduled',
		from: o.start.toISOString(),
		to: o.start.clone().add(o.minutes, 'minutes').toISOString(),
		productId: o.productId,
		locationId: o.club.id,
		staffMemberId: o.coach ? 'coach' : null,
		numberOfAttendees: o.seats ?? 1,
		customAttributes: o.crew ? { crew: o.crew } : null,
		guests: (o.guests ?? []).map((email) => ({ email })),
		product: { slug: o.productId, title: o.title, variantTitle: o.variantTitle ?? null, cancelGap: 86400, rescheduleGap: 86400, allowCustomDuration: !o.coach },
		location: { id: o.club.id, slug: o.club.slug, title: o.club.title, address: o.club.address, city: o.club.city, latitude: o.club.lat, longitude: o.club.lng },
		staffMember: o.coach ? { firstName: o.coach.split(' ')[0], lastName: o.coach.split(' ')[1] } : null,
	};
}

const [MAD, BCN, VLC] = CLUBS as [(typeof CLUBS)[number], (typeof CLUBS)[number], (typeof CLUBS)[number]];

/** The booker's games: next court, a singles court, a squash court, a training, played and cancelled games. */
export function previewAppointments(): AppointmentLike[] {
	return [
		appt({ id: 'g-next', ref: '1042', club: MAD, productId: 'loc-madrid-padel-3', title: 'Padel Court', variantTitle: 'Court 3', start: at(2, '19:30'), minutes: 90, crew: 'Alex, Nora, Liam', guests: ['alex@example.com'] }),
		appt({ id: 'g-singles', ref: '1047', club: BCN, productId: 'loc-barcelona-padel-7', title: 'Padel Court', variantTitle: 'Court 7 · Singles', start: at(5, '08:00'), minutes: 60, crew: 'Marco' }),
		appt({ id: 'g-squash', ref: '1051', club: VLC, productId: 'loc-valencia-squash-1', title: 'Squash Court', variantTitle: 'Court 1', start: at(8, '18:00'), minutes: 60 }),
		appt({ id: 'g-training', ref: '1053', club: MAD, productId: 'padel-group-intermediate', title: 'Padel Group Class', variantTitle: 'Intermediate', start: at(3, '10:00'), minutes: 60, seats: 2, coach: 'Marta Ibáñez' }),
		appt({ id: 'g-past-1', ref: '1011', club: MAD, productId: 'loc-madrid-padel-2', title: 'Padel Court', variantTitle: 'Court 2', start: at(-5, '20:00'), minutes: 90, status: 'completed', crew: 'Alex, Nora, Sofía' }),
		appt({ id: 'g-past-2', ref: '1004', club: BCN, productId: 'loc-barcelona-padel-1', title: 'Padel Court', variantTitle: 'Court 1', start: at(-12, '19:00'), minutes: 60, status: 'completed', crew: 'Marco' }),
		appt({ id: 'g-canceled', ref: '1008', club: MAD, productId: 'loc-madrid-padel-5', title: 'Padel Court', variantTitle: 'Court 5', start: at(-8, '21:00'), minutes: 60, status: 'canceled' }),
	];
}
