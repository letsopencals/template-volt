'use client';

import { useEffect } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import type { ClubAvailability } from '@/lib/club';

const EMPTY: ClubAvailability = { ranges: {}, failed: [] };

export function clubAvailabilityKey(clubId: string | null): string | null {
	return clubId ? `/api/clubs/${clubId}/availability` : null;
}

/**
 * One club's free ranges, every court, 14 days: one request per club (cached 60 s on the server). Refreshes every
 * minute while the tab is visible; courts the server couldn't read (rate limit) are asked for again after 2 s.
 */
export function useClubAvailability(clubId: string | null, fallbackData?: ClubAvailability) {
	const key = clubAvailabilityKey(clubId);
	const { data, error, isLoading, mutate } = useSWR<ClubAvailability>(key, fetcher, {
		fallbackData,
		revalidateOnFocus: false,
		revalidateOnMount: !fallbackData,
		refreshInterval: 60_000,
		keepPreviousData: false,
		dedupingInterval: 5_000,
	});
	const value = data ?? EMPTY;
	const failedCount = value.failed.length;

	useEffect(() => {
		if (!key || failedCount === 0) return;
		const id = setTimeout(() => void mutate(), 2000);
		return () => clearTimeout(id);
	}, [key, failedCount, mutate]);

	return {
		ranges: value.ranges,
		failed: value.failed,
		/** Every court has answered */
		complete: !!data && failedCount === 0,
		loading: isLoading && !data,
		error: !!error && !data,
		refresh: mutate,
	};
}
