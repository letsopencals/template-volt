import '@/lib/opencals';
import { unstable_cache } from 'next/cache';
import { OpencalsApiError, ProductService } from '@opencals/storefront-sdk';
import { nowMin, pack, WINDOW_DAYS, type ClubAvailability, type Court, type Packed } from '@/lib/club';

/**
 * A club's court availability, read once per court and cached on the server.
 *
 * A court is its own resource, so the API answers per court. Instead of one call per court *per day* from the
 * browser, the server asks each court once for its merged free ranges over the whole booking horizon (no `date`),
 * trims them to the 14-day window, and caches each court for 60 seconds. The browser gets one response per club and
 * derives the hall map, the grid, the pulse and every "free from" line locally, so switching day, length, sport or
 * view never calls the API.
 *
 * Every court is cached under two tags: `court:<id>` (dropped after a booking on that court) and `availability`
 * (dropped after a cancel or a move). A court that fails (rate limit, 5xx) is not cached and is reported in `failed`,
 * so the client asks again in a moment and only that court is re-read.
 */

const CONCURRENCY = 3;
const MAX_RETRIES = 4;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function readRanges(courtId: string, clubId: string, tz: string): Promise<Packed[]> {
	for (let attempt = 0; ; attempt++) {
		try {
			// throwOnError is required: without it the SDK resolves a 429 as an empty result.
			const { data } = await ProductService.getCurrentAvailabilitiesMerged({
				path: { productId: courtId },
				query: { locationId: clubId, timezone: tz },
				throwOnError: true,
			});
			const until = nowMin() + (WINDOW_DAYS + 1) * 1440;
			return (data ?? []).map(pack).filter(([s, len]) => len > 0 && s < until);
		} catch (err) {
			const status = err instanceof OpencalsApiError ? err.status : 0;
			const retriable = status === 429 || status === 503 || status === 0;
			if (!retriable || attempt >= MAX_RETRIES) throw err;
			await sleep(400 * 2 ** attempt + Math.floor(Math.random() * 250));
		}
	}
}

function cachedRanges(courtId: string, clubId: string, tz: string): Promise<Packed[]> {
	return unstable_cache(() => readRanges(courtId, clubId, tz), ['court-ranges-v1', courtId, clubId, tz], {
		revalidate: 60,
		tags: ['availability', `court:${courtId}`, `club:${clubId}`],
	})();
}

export async function getClubAvailability(courts: Court[], tz: string): Promise<ClubAvailability> {
	const ranges: Record<string, Packed[]> = {};
	const failed: string[] = [];
	let cursor = 0;
	const runners = Array.from({ length: Math.min(CONCURRENCY, courts.length) }, async () => {
		while (cursor < courts.length) {
			const court = courts[cursor++]!;
			try {
				ranges[court.id] = await cachedRanges(court.id, court.clubId, tz);
			} catch {
				failed.push(court.id);
			}
		}
	});
	await Promise.all(runners);
	return { ranges, failed };
}
