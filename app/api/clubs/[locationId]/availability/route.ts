import { NextResponse } from 'next/server';
import { clubBySlug, courtsAt } from '@/lib/club';
import { getCatalogue } from '@/lib/server-data';
import { getClubAvailability } from '@/lib/availability-server';
import { handleApiError } from '@/lib/api-error-handler';

/**
 * Free ranges for every court of one club over the next 14 days, in one response:
 * `{ ranges: { [courtId]: [startMin, lengthMin][] }, failed: courtId[] }` (UTC epoch minutes).
 * Per-court results are cached on the server for 60 s (see lib/availability-server.ts).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ locationId: string }> }) {
	const { locationId } = await params;
	try {
		const cat = await getCatalogue();
		const club = clubBySlug(cat, locationId);
		if (!club) return NextResponse.json({ error: 'Club not found' }, { status: 404 });
		const result = await getClubAvailability(courtsAt(cat, club.id), club.tz);
		return NextResponse.json(result, {
			headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' },
		});
	} catch (err) {
		return handleApiError(err);
	}
}
