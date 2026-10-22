'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocation } from '@/contexts/location-context';
import { clubBySlug, km, type Catalogue } from '@/lib/club';

const STORAGE_KEY = '@opencals/location';

export type HomeClubSource = 'link' | 'saved' | 'nearest' | 'chosen' | null;

/**
 * "Your club". /book always starts from one club, never from all of them. In order: `?club=` from the link, the club
 * remembered in this browser (the same `@opencals/location` the location context and the training flow use), or the
 * nearest club once "Near me" is tapped. `club` stays null until one of those lands; the page then shows the chooser.
 * `ready` turns true after the remembered club has been read, so the chooser never flashes for returning players.
 */
export function useHomeClub(cat: Catalogue, linked: string | null | undefined) {
	const { setSelectedLocationId } = useLocation();
	const fromLink = clubBySlug(cat, linked)?.id ?? null;
	const [club, setClubState] = useState<string | null>(fromLink);
	const [source, setSource] = useState<HomeClubSource>(fromLink ? 'link' : null);
	const [ready, setReady] = useState(!!fromLink);
	const [locating, setLocating] = useState(false);
	const [distances, setDistances] = useState<Record<string, number> | null>(null);

	useEffect(() => {
		if (fromLink) {
			setSelectedLocationId(fromLink);
			return;
		}
		try {
			const saved = window.localStorage.getItem(STORAGE_KEY);
			const match = saved ? clubBySlug(cat, saved) : null;
			if (match && match.courtCount > 0) {
				setClubState(match.id);
				setSource('saved');
			}
		} catch {
			/* storage blocked: ask */
		}
		setReady(true);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
	}, []);

	const setClub = useCallback(
		(id: string | null, how: HomeClubSource = 'chosen') => {
			setClubState(id);
			setSource(id ? how : null);
			if (id) setSelectedLocationId(id);
		},
		[setSelectedLocationId],
	);

	const canLocate = cat.clubs.some((c) => c.lat != null && c.lng != null);

	/** Ask the browser where we are and pick the nearest club (distances kept for the chooser). */
	const locate = useCallback(
		(onError?: (msg: string) => void) => {
			if (typeof navigator === 'undefined' || !navigator.geolocation) {
				onError?.('Location isn’t available in this browser.');
				return;
			}
			setLocating(true);
			navigator.geolocation.getCurrentPosition(
				(p) => {
					setLocating(false);
					const here = { lat: p.coords.latitude, lng: p.coords.longitude };
					const d: Record<string, number> = {};
					for (const c of cat.clubs) if (c.lat != null && c.lng != null && c.courtCount > 0) d[c.id] = km(here, { lat: c.lat, lng: c.lng });
					setDistances(d);
					const nearest = Object.entries(d).sort((a, b) => a[1] - b[1])[0]?.[0];
					if (nearest) setClub(nearest, 'nearest');
				},
				() => {
					setLocating(false);
					onError?.('We couldn’t get your location. Pick a club from the list.');
				},
				{ timeout: 8000, maximumAge: 10 * 60_000 },
			);
		},
		[cat, setClub],
	);

	return { club, source, ready, setClub, locate, locating, canLocate, distances };
}
