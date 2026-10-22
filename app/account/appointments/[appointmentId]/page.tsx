import type { Metadata } from 'next';
import { getCatalogue, getStoreSettings } from '@/lib/server-data';
import { GameDetail } from '@/components/game/account/game-detail';

export const metadata: Metadata = { title: 'Your booking', robots: { index: false, follow: false } };

export default async function GamePage({ params }: { params: Promise<{ appointmentId: string }> }) {
	const [{ appointmentId }, cat, settings] = await Promise.all([params, getCatalogue(), getStoreSettings()]);
	return <GameDetail appointmentId={appointmentId} cat={cat} tz={settings?.settings?.timezone ?? cat.clubs[0]?.tz ?? 'UTC'} />;
}
