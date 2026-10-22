import { CoachesView } from '@/components/coaches/coaches-view';
import { clubBySlug } from '@/lib/club';
import { getCatalogue, getStaff } from '@/lib/server-data';

// Server Component: the clubs and where each coach works come from the store; the cards' copy from siteConfig.
export default async function CoachesPage({ searchParams }: { searchParams: Promise<{ club?: string }> }) {
	const [{ club }, cat, staff] = await Promise.all([searchParams, getCatalogue(), getStaff()]);
	const clubs = cat.clubs.filter((c) => c.courtCount > 0).map((c) => ({ id: c.id, name: c.name, slug: c.slug }));
	const coachClubs: Record<string, string[]> = {};
	for (const s of staff) coachClubs[s.slug] = (s.locations ?? []).map((l) => l.id);
	return <CoachesView clubs={clubs} coachClubs={coachClubs} initialClub={clubBySlug(cat, club)?.id ?? null} />;
}
