import { getCollection } from '@/lib/server-data';
import { siteConfig } from '@/lib/site-config';
import { TrainingCatalog, type TrainingSportGroup } from '@/components/training/training-catalog';

// Server Component: fetch both training collections (padel + squash) on the
// server and hand them to the client catalog as initial data, so the grid
// paints immediately. The catalog does client-side filtering only — no fetching.
export default async function TrainingPage({
	searchParams,
}: {
	searchParams: Promise<{ sport?: string }>;
}) {
	const { sport } = await searchParams;
	const initialSport: 'padel' | 'squash' | 'all' =
		sport === 'padel' || sport === 'squash' ? sport : 'all';

	const [padel, squash] = await Promise.all([
		getCollection(siteConfig.collections.padelTraining),
		getCollection(siteConfig.collections.squashTraining),
	]);

	const groups: TrainingSportGroup[] = [
		{ sport: 'padel', label: 'Padel', collection: padel },
		{ sport: 'squash', label: 'Squash', collection: squash },
	];

	return <TrainingCatalog groups={groups} initialSport={initialSport} />;
}
