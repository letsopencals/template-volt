'use client';

import useSWR from 'swr';
import type { AppointmentListItemResponse, CollectionMeta } from '@opencals/storefront-sdk';
import { fetcher } from '@/lib/fetcher';
import type { Catalogue } from '@/lib/club';
import { GamesBoard, GamesBoardLoading } from '@/components/game/account/games-board';

const KEY = '/api/account/appointments?take=100';

/** Loads every booking for the signed-in player and hands them to the board. */
export function GamesView({ cat, tz }: { cat: Catalogue; tz: string }) {
	const { data, error, isLoading } = useSWR<{ data: AppointmentListItemResponse[]; meta: CollectionMeta }>(KEY, fetcher, { revalidateOnFocus: false });
	if (isLoading) return <GamesBoardLoading />;
	if (error) return <p className="rounded-2xl border border-[var(--color-line)] p-6 text-sm text-[var(--color-ink-muted)]">Couldn’t load your games. Refresh the page.</p>;
	return <GamesBoard appointments={data?.data ?? []} cat={cat} tz={tz} />;
}
