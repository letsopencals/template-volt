import '@/lib/opencals';
import { OpencalsApiError, ProductService } from '@opencals/storefront-sdk';
import type { CurrentAvailabilitySlot } from '@opencals/storefront-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error-handler';

/**
 * Per-date availability for a set of courts. A court is its own resource (Self
 * conflict rule), so each court needs its own `getCurrentAvailabilities` call. With
 * ~11 courts per sport, naively fanning out on every day-switch overruns the
 * storefront rate limit. We keep it under budget with three layers:
 *
 *  1. A short-lived server-side cache (per court+date+timezone). Re-renders, sport
 *     toggling, and revisiting a day are served from cache — zero backend calls.
 *  2. Bounded concurrency + 429/5xx retry with backoff for the calls we do make.
 *  3. Reporting which courts still failed so the client retries only those (they
 *     render as "loading", not "unavailable").
 */
export interface CourtSlotsResponse {
	slotsByCourt: Record<string, CurrentAvailabilitySlot[]>;
	/** Court ids that couldn't be loaded (rate-limited / errored) — client should retry. */
	failed: string[];
}

const CONCURRENCY = 3;
// Cumulative backoff (~0.4+0.8+1.6+3.2+6.4 ≈ 12s) must outlast the backend's 10s
// rate-limit window so a rate-limited court reliably recovers on retry.
const MAX_RETRIES = 5;
const CACHE_TTL_MS = 60_000;

// Module-scope cache survives across requests in the same server process. Successful
// per-court results only — failures are never cached, so they get retried.
interface CacheEntry {
	slots: CurrentAvailabilitySlot[];
	at: number;
}
const cache = new Map<string, CacheEntry>();
const cacheKey = (id: string, date: string, tz: string | undefined) => `${id}|${date}|${tz ?? ''}`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchCourt(
	id: string,
	date: string,
	timezone: string | undefined,
): Promise<{ id: string; slots: CurrentAvailabilitySlot[]; failed: boolean }> {
	const key = cacheKey(id, date, timezone);
	const cached = cache.get(key);
	if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
		return { id, slots: cached.slots, failed: false };
	}

	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		try {
			// throwOnError is REQUIRED here: the SDK's default swallows failures into
			// `{ data: undefined, error }`, so without it a 429 would look like a
			// successful empty result and the retry/backoff below would never run.
			const { data } = await ProductService.getCurrentAvailabilities({
				path: { productId: id },
				query: { date, timezone },
				throwOnError: true,
			});
			const slots = Array.isArray(data) ? data : [];
			cache.set(key, { slots, at: Date.now() });
			return { id, slots, failed: false };
		} catch (err) {
			const status = err instanceof OpencalsApiError ? err.status : 0;
			const retriable = status === 429 || status === 503 || status === 0;
			if (!retriable || attempt === MAX_RETRIES) {
				// Serve stale cache rather than a false "unavailable" if we have any.
				if (cached) return { id, slots: cached.slots, failed: false };
				return { id, slots: [], failed: retriable };
			}
			// Exponential backoff with jitter: ~400, 800, 1600, 3200ms.
			await sleep(400 * 2 ** attempt + Math.floor(Math.random() * 250));
		}
	}
	if (cached) return { id, slots: cached.slots, failed: false };
	return { id, slots: [], failed: true };
}

/** Run tasks with a fixed concurrency ceiling to avoid bursting the rate limit. */
async function pool<T>(items: string[], worker: (id: string) => Promise<T>): Promise<T[]> {
	const results: T[] = new Array(items.length);
	let cursor = 0;
	const runners = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
		while (cursor < items.length) {
			const i = cursor++;
			results[i] = await worker(items[i] as string);
		}
	});
	await Promise.all(runners);
	return results;
}

export async function GET(request: NextRequest, _ctx: { params: Promise<{ collection: string }> }) {
	const { searchParams } = request.nextUrl;
	const date = searchParams.get('date');
	const timezone = searchParams.get('timezone') ?? undefined;
	const allIds = (searchParams.get('courtIds') ?? '').split(',').filter(Boolean);
	// `only` lets the client retry just the courts that previously failed, instead of
	// re-fanning-out all of them (which could re-trip the rate limit). Cached courts
	// are returned regardless so the response stays complete.
	const onlyIds = (searchParams.get('only') ?? '').split(',').filter(Boolean);
	const ids = onlyIds.length > 0 ? onlyIds.filter((id) => allIds.includes(id)) : allIds;

	if (!date) {
		return NextResponse.json({ error: 'date query parameter is required' }, { status: 400 });
	}
	if (allIds.length === 0) {
		return NextResponse.json({ slotsByCourt: {}, failed: [] } satisfies CourtSlotsResponse);
	}

	try {
		const results = await pool(ids, (id) => fetchCourt(id, date, timezone));

		const slotsByCourt: Record<string, CurrentAvailabilitySlot[]> = {};
		const failed: string[] = [];
		for (const r of results) {
			slotsByCourt[r.id] = r.slots;
			if (r.failed) failed.push(r.id);
		}

		// For a targeted retry (`only`), fill the rest of the grid from cache so the
		// response still describes every court the client is showing.
		if (onlyIds.length > 0) {
			for (const id of allIds) {
				if (id in slotsByCourt) continue;
				const cached = cache.get(cacheKey(id, date, timezone));
				slotsByCourt[id] = cached?.slots ?? [];
				if (!cached) failed.push(id);
			}
		}

		return NextResponse.json({ slotsByCourt, failed } satisfies CourtSlotsResponse);
	} catch (err) {
		return handleApiError(err);
	}
}
