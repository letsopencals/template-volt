import type { Metadata } from 'next';
import { getCatalogue, getStoreSettings } from '@/lib/server-data';
import { ConfirmationView } from '@/components/game/confirmation/confirmation-view';

export const metadata: Metadata = { title: 'Booked', robots: { index: false, follow: false } };

export default async function ThankYouPage({ searchParams }: { searchParams: Promise<{ orderId?: string }> }) {
	const [{ orderId }, cat, settings] = await Promise.all([searchParams, getCatalogue(), getStoreSettings()]);
	return <ConfirmationView orderId={orderId || null} cat={cat} tz={settings?.settings?.timezone ?? cat.clubs[0]?.tz ?? 'UTC'} />;
}
