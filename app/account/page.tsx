import type { Metadata } from 'next';
import { getCatalogue, getStoreSettings } from '@/lib/server-data';
import { GamesView } from '@/components/game/account/games-view';

export const metadata: Metadata = { title: 'My games', robots: { index: false, follow: false } };

export default async function AccountPage() {
	const [cat, settings] = await Promise.all([getCatalogue(), getStoreSettings()]);
	return <GamesView cat={cat} tz={settings?.settings?.timezone ?? cat.clubs[0]?.tz ?? 'UTC'} />;
}
