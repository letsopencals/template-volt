'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProductListItemResponse } from '@opencals/storefront-sdk';
import type { Catalogue } from '@/lib/club';
import { GameFlow } from '@/components/game/game-flow';

const STORAGE_KEY = '@opencals/location';

/**
 * A training booking (`/booking/[slug]`): the game flow for one training product. The club comes from `?club=`,
 * else the club this browser remembers, else the first club that runs it; it's read after mount (localStorage),
 * so the flow starts from the right club without a flash.
 */
export function TrainingFlow({ cat, group, variantId, clubId }: { cat: Catalogue; group: ProductListItemResponse; variantId: string | null; clubId: string | null }) {
	const router = useRouter();
	const [club, setClub] = useState<string | null | undefined>(clubId ?? undefined);

	useEffect(() => {
		if (clubId) return;
		let saved: string | null = null;
		try {
			saved = window.localStorage.getItem(STORAGE_KEY);
		} catch {
			/* storage blocked */
		}
		setClub(saved);
	}, [clubId]);

	if (club === undefined) return <div className="min-h-screen bg-[var(--color-bg)]" />;
	return (
		<GameFlow
			cat={cat}
			pick={{ kind: 'training', group, variantId, clubId: club }}
			backLabel="Back to training"
			onBack={() => router.push('/training')}
		/>
	);
}
