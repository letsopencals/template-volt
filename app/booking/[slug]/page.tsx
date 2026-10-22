import { notFound } from 'next/navigation';
import { getCatalogue, getProduct } from '@/lib/server-data';
import { clubBySlug } from '@/lib/club';
import { TrainingFlow } from '@/components/game/training-flow';

// Server Component: the training product (with its variants, coaches and clubs) and the club catalogue are read on
// the server; the client flow picks level, club, coach, day and time.
export default async function BookingPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ club?: string }> }) {
	const [{ slug }, { club }] = await Promise.all([params, searchParams]);
	const [group, cat] = await Promise.all([getProduct(slug), getCatalogue()]);
	if (!group) notFound();
	const variantId = group.variants?.find((v) => v.slug === slug)?.id ?? null;
	return <TrainingFlow cat={cat} group={group} variantId={variantId} clubId={clubBySlug(cat, club)?.id ?? null} />;
}
