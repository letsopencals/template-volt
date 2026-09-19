'use client';

import { useCallback, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import type { CurrentAvailabilitySlot } from '@opencals/storefront-sdk';
import type { CourtGridCourt } from '@/app/api/courts/[collection]/route';
import type { CourtSlotsResponse } from '@/app/api/courts/[collection]/slots/route';
import { fetcher } from '@/lib/fetcher';

export interface DurationOption {
	units: number;
	minutes: number;
	price: number;
	/** Synthesized bookable slot spanning `units` consecutive base slots. */
	slot: CurrentAvailabilitySlot;
}

export interface GridColumn {
	/** Local "HH:MM" for the venue day — stable per day, used as the cell key. */
	key: string;
	label: string;
	isHour: boolean;
	/** Minutes since midnight in the display timezone (for the now cursor + auto-scroll). */
	minutes: number;
}

interface UseCourtGridResult {
	courts: CourtGridCourt[];
	columns: GridColumn[];
	courtsLoading: boolean;
	slotsLoading: boolean;
	error: boolean;
	slotAt: (courtId: string, columnKey: string) => CurrentAvailabilitySlot | null;
	durationOptions: (court: CourtGridCourt, columnKey: string) => DurationOption[];
	/** True while a court's slots are still being (re)fetched after a rate-limit — its
	 *  row should show as pending rather than fully unavailable. */
	isCourtPending: (courtId: string) => boolean;
}

const STEP_MIN = 30;
// Fallback axis (club hours) used until slots arrive, so the grid has a shape to
// render immediately. Once slots load, the axis expands to cover them.
const DEFAULT_OPEN_MIN = 7 * 60;
const DEFAULT_CLOSE_MIN = 23 * 60;

const pad = (n: number): string => String(n).padStart(2, '0');

/** Local minutes-since-midnight of a UTC slot start, in the display timezone. */
const localMinutes = (fromDate: string, fromTime: string, timezone: string): number => {
	const utc = new Date(`${fromDate}T${fromTime}Z`);
	const parts = new Intl.DateTimeFormat('en-GB', {
		timeZone: timezone,
		hour12: false,
		hour: '2-digit',
		minute: '2-digit',
	}).formatToParts(utc);
	const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
	let hh = parseInt(get('hour'), 10);
	if (hh === 24) hh = 0;
	return hh * 60 + parseInt(get('minute'), 10);
};

const labelFor = (minutes: number): string => `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;

/** Current calendar day + minutes-since-midnight in the given timezone. */
export const nowInTimezone = (timezone: string): { dateStr: string; minutes: number } => {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: timezone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	}).formatToParts(new Date());
	const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
	let hh = parseInt(get('hour'), 10);
	if (hh === 24) hh = 0;
	return { dateStr: `${get('year')}-${get('month')}-${get('day')}`, minutes: hh * 60 + parseInt(get('minute'), 10) };
};

export function useCourtGrid(
	collectionSlug: string,
	date: string | null,
	timezone: string,
): UseCourtGridResult {
	// Courts: date-independent. Fetched once per collection and kept on screen
	// (keepPreviousData) so switching sport/day never blanks the rows.
	const courtsKey = collectionSlug ? `/api/courts/${collectionSlug}` : null;
	const { data: courtsData, isLoading: courtsLoading } = useSWR<{ courts: CourtGridCourt[] }>(
		courtsKey,
		fetcher,
		{ revalidateOnFocus: false, keepPreviousData: true },
	);
	const courts = useMemo(() => courtsData?.courts ?? [], [courtsData]);

	// Slots: per-date. Only this reloads when the day changes; keepPreviousData keeps
	// the previous day's cells visible during the fetch (no full-grid flash).
	const courtIds = courts.map((c) => c.id).join(',');
	const slotsKey =
		collectionSlug && date && courtIds
			? `/api/courts/${collectionSlug}/slots?date=${date}&timezone=${encodeURIComponent(timezone)}&courtIds=${courtIds}`
			: null;
	const {
		data: slotsData,
		isLoading: slotsLoading,
		isValidating: slotsValidating,
		error,
		mutate: revalidateSlots,
	} = useSWR<CourtSlotsResponse>(slotsKey, fetcher, {
		revalidateOnFocus: false,
		keepPreviousData: true,
	});
	const slotsByCourt = useMemo(() => slotsData?.slotsByCourt ?? {}, [slotsData]);
	const failed = useMemo(() => slotsData?.failed ?? [], [slotsData]);
	const failedSet = useMemo(() => new Set(failed), [failed]);

	// If some courts were rate-limited server-side, retry ONLY those (via `only=`) after
	// a delay — never re-fan-out all courts, which could re-trip the limit. The result
	// is merged into the SWR cache without triggering a full revalidation.
	useEffect(() => {
		if (!slotsKey || failed.length === 0 || slotsValidating) return;
		const failedParam = failed.join(',');
		const id = setTimeout(async () => {
			try {
				const retryUrl = `${slotsKey}&only=${failedParam}`;
				const fresh = (await fetcher(retryUrl)) as CourtSlotsResponse;
				await revalidateSlots(
					(prev) => {
						if (!prev) return fresh;
						return {
							slotsByCourt: { ...prev.slotsByCourt, ...fresh.slotsByCourt },
							failed: fresh.failed,
						};
					},
					{ revalidate: false },
				);
			} catch {
				// Leave `failed` as-is; the effect re-runs and retries again.
			}
		}, 1500);
		return () => clearTimeout(id);
	}, [slotsKey, failed, slotsValidating, revalidateSlots]);

	// Per-court: base slots indexed by their local "HH:MM" label + a sorted array
	// (by UTC start) for contiguity walks when composing durations.
	const perCourt = useMemo(() => {
		const map = new Map<string, { byLabel: Map<string, CurrentAvailabilitySlot>; sorted: CurrentAvailabilitySlot[] }>();
		for (const [courtId, slots] of Object.entries(slotsByCourt)) {
			const sorted = [...slots].sort((a, b) => a.fromTime.localeCompare(b.fromTime));
			const byLabel = new Map<string, CurrentAvailabilitySlot>();
			for (const s of sorted) byLabel.set(labelFor(localMinutes(s.fromDate, s.fromTime, timezone)), s);
			map.set(courtId, { byLabel, sorted });
		}
		return map;
	}, [slotsByCourt, timezone]);

	// Axis: the operating window in the display timezone. Derived from the actual
	// slot range (so it adapts to any tz offset) and padded to whole hours; falls
	// back to the default club window before slots load.
	const columns = useMemo<GridColumn[]>(() => {
		let min = Infinity;
		let max = -Infinity;
		for (const [, slots] of Object.entries(slotsByCourt)) {
			for (const s of slots) {
				const m = localMinutes(s.fromDate, s.fromTime, timezone);
				if (m < min) min = m;
				if (m > max) max = m;
			}
		}
		let openMin = DEFAULT_OPEN_MIN;
		let closeMin = DEFAULT_CLOSE_MIN;
		if (min !== Infinity) {
			openMin = Math.min(DEFAULT_OPEN_MIN, Math.floor(min / 60) * 60);
			// +STEP so the last slot's own cell is included; +another step for its end.
			closeMin = Math.max(DEFAULT_CLOSE_MIN, max + STEP_MIN);
		}
		const cols: GridColumn[] = [];
		for (let m = openMin; m < closeMin; m += STEP_MIN) {
			cols.push({ key: labelFor(m), label: labelFor(m), isHour: m % 60 === 0, minutes: m });
		}
		return cols;
	}, [slotsByCourt, timezone]);

	const slotAt = useCallback(
		(courtId: string, columnKey: string): CurrentAvailabilitySlot | null =>
			perCourt.get(courtId)?.byLabel.get(columnKey) ?? null,
		[perCourt],
	);

	const durationOptions = useCallback(
		(court: CourtGridCourt, columnKey: string): DurationOption[] => {
			const entry = perCourt.get(court.id);
			if (!entry) return [];
			const start = entry.byLabel.get(columnKey);
			if (!start) return [];
			const startIdx = entry.sorted.indexOf(start);
			if (startIdx < 0) return [];

			const maxUnits =
				court.maxDuration > 0 ? Math.max(1, Math.floor(court.maxDuration / court.duration)) : 1;

			const options: DurationOption[] = [];
			for (let u = 1; u <= maxUnits; u++) {
				const first = entry.sorted[startIdx];
				const last = entry.sorted[startIdx + u - 1];
				if (!first || !last) break;
				if (u > 1) {
					const prev = entry.sorted[startIdx + u - 2];
					if (!prev || prev.toTime !== last.fromTime || prev.toDate !== last.fromDate) break;
				}
				options.push({
					units: u,
					minutes: (court.duration * u) / 60,
					price: court.price * u,
					slot: {
						productId: court.id,
						fromDate: first.fromDate,
						fromTime: first.fromTime,
						toDate: last.toDate,
						toTime: last.toTime,
						staffMemberIds: null,
						locationIds: first.locationIds ?? null,
						attendees: 0,
						maxAttendees: 1,
					},
				});
			}
			return options;
		},
		[perCourt],
	);

	const isCourtPending = useCallback(
		(courtId: string) => failedSet.has(courtId),
		[failedSet],
	);

	return {
		courts,
		columns,
		courtsLoading: !!courtsKey && courtsLoading && courts.length === 0,
		// Keep the subtle "loading" hint visible while pending courts are retried.
		slotsLoading: (!!slotsKey && slotsLoading) || failed.length > 0,
		error: !!error,
		slotAt,
		durationOptions,
		isCourtPending,
	};
}
