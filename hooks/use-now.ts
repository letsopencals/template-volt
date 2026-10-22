'use client';

import { useEffect, useState } from 'react';

/** Current time in ms, re-read every `everyMs`. Null on the server render so markup never mismatches. */
export function useNow(everyMs = 60_000): number | null {
	const [now, setNow] = useState<number | null>(null);
	useEffect(() => {
		setNow(Date.now());
		const id = setInterval(() => setNow(Date.now()), everyMs);
		return () => clearInterval(id);
	}, [everyMs]);
	return now;
}
