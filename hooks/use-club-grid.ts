'use client';

import { useCallback, useMemo } from 'react';
import type { CurrentAvailabilitySlot } from '@opencals/storefront-sdk';
import {
	dayStart,
	dayWindow,
	freeRun,
	maxMinutes,
	baseMinutes,
	nowMin,
	priceFor,
	STEP_MIN,
	toSlot,
	type ClubRanges,
	type Court,
} from '@/lib/club';

export interface DurationOption {
	units: number;
	minutes: number;
	price: number;
	/** The bookable slot spanning `units` base units from the cell */
	slot: CurrentAvailabilitySlot;
}

export interface GridColumn {
	/** Local "HH:mm" for the club day: stable per day, used as the cell key */
	key: string;
	label: string;
	isHour: boolean;
	/** Minutes since local midnight (for the now cursor and auto-scroll) */
	minutes: number;
	/** UTC epoch minute of the cell start */
	start: number;
}

const pad = (n: number): string => String(n).padStart(2, '0');
const labelFor = (m: number): string => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;

/**
 * The courts × half-hours grid for one club day, computed locally from the club's free ranges (no fetching). A cell
 * is free when the court's range covers its half hour and it hasn't started yet; the durations it offers are the
 * base-unit multiples that fit before the range ends, up to the court's maximum.
 */
export function useClubGrid(courts: Court[], ranges: ClubRanges, date: string, tz: string) {
	const columns = useMemo<GridColumn[]>(() => {
		const { open, close } = dayWindow(courts, ranges, date, tz);
		const ds = dayStart(date, tz);
		const out: GridColumn[] = [];
		for (let m = open; m < close; m += STEP_MIN) out.push({ key: labelFor(m), label: labelFor(m), isHour: m % 60 === 0, minutes: m, start: ds + m });
		return out;
	}, [courts, ranges, date, tz]);

	const startByKey = useMemo(() => new Map(columns.map((c) => [c.key, c.start])), [columns]);
	const courtById = useMemo(() => new Map(courts.map((c) => [c.id, c])), [courts]);

	const runAt = useCallback(
		(courtId: string, key: string): number => {
			const start = startByKey.get(key);
			const court = courtById.get(courtId);
			if (start === undefined || !court || start < nowMin()) return 0;
			const run = freeRun(ranges[courtId], start);
			return run >= baseMinutes(court) ? run : 0;
		},
		[startByKey, courtById, ranges],
	);

	const isFree = useCallback((courtId: string, key: string): boolean => runAt(courtId, key) > 0, [runAt]);

	const durationOptions = useCallback(
		(court: Court, key: string): DurationOption[] => {
			const start = startByKey.get(key);
			const run = runAt(court.id, key);
			if (start === undefined || !run) return [];
			const base = baseMinutes(court);
			const limit = Math.min(run, maxMinutes(court));
			const out: DurationOption[] = [];
			for (let units = 1; units * base <= limit; units++) {
				const minutes = units * base;
				out.push({ units, minutes, price: priceFor(court, minutes), slot: toSlot(court, start, minutes) });
			}
			return out;
		},
		[startByKey, runAt],
	);

	return { columns, isFree, durationOptions };
}
