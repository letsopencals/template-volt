import type { Metadata } from 'next';
import { BookView, type BookParams } from '@/components/book/book-view';
import { clubBySlug, courtsAt } from '@/lib/club';
import { getCatalogue } from '@/lib/server-data';
import { getClubAvailability } from '@/lib/availability-server';

export const metadata: Metadata = {
	title: 'Book a Court',
	description: 'Pick your club and see every court live: book a padel or squash court in seconds on the hall map or the grid.',
};

function one(v: string | string[] | undefined): string | undefined {
	return Array.isArray(v) ? v[0] : v;
}

/**
 * Club-first court booking. The catalogue (clubs + courts) is read on the server and cached; when the link names a
 * club, its availability is read here too, so the hall paints on first load. A remembered club (localStorage) is
 * resolved in the browser and fetched through /api/clubs/[id]/availability.
 */
export default async function BookPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
	const [cat, sp] = await Promise.all([getCatalogue(), searchParams]);
	const params: BookParams = {
		club: one(sp.club),
		sport: one(sp.sport),
		date: one(sp.date),
		length: one(sp.length),
		time: one(sp.time),
		view: one(sp.view),
	};
	const linked = clubBySlug(cat, params.club);
	const initialAvailability = linked
		? { clubId: linked.id, data: await getClubAvailability(courtsAt(cat, linked.id), linked.tz).catch(() => ({ ranges: {}, failed: [] })) }
		: null;

	return <BookView cat={cat} params={params} initialAvailability={initialAvailability} />;
}
