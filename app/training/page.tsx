import { getCatalogue, getCollection, getVariantClubs } from '@/lib/server-data';
import { clubBySlug } from '@/lib/club';
import { siteConfig } from '@/lib/site-config';
import { TrainingCatalog, type TrainingSportGroup } from '@/components/training/training-catalog';

// Server Component: fetch both training collections (padel + squash) on the
// server and hand them to the client catalog as initial data, so the grid
// paints immediately. The catalog does client-side filtering only (sport, format,
// level and club, using each variant's locations) — no fetching.
export default async function TrainingPage({
	searchParams,
}: {
	searchParams: Promise<{ sport?: string; club?: string }>;
}) {
	const { sport, club } = await searchParams;
	const initialSport: 'padel' | 'squash' | 'all' =
		sport === 'padel' || sport === 'squash' ? sport : 'all';

	const [padel, squash, cat, variantClubs] = await Promise.all([
		getCollection(siteConfig.collections.padelTraining),
		getCollection(siteConfig.collections.squashTraining),
		getCatalogue(),
		getVariantClubs(),
	]);
	const clubs = cat.clubs.filter((c) => c.courtCount > 0).map((c) => ({ id: c.id, name: c.name }));

	const groups: TrainingSportGroup[] = [
		{ sport: 'padel', label: 'Padel', collection: padel },
		{ sport: 'squash', label: 'Squash', collection: squash },
	];

	return (
		<TrainingCatalog
			groups={groups}
			initialSport={initialSport}
			clubs={clubs}
			variantClubs={variantClubs}
			initialClub={clubBySlug(cat, club)?.id ?? null}
		/>
	);
}
