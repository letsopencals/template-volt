import { getProduct } from '@/lib/server-data';
import { BookingView } from '@/components/booking/booking-view';

// Server Component: fetch the product on the server and seed the client booking
// flow so it renders immediately (no loading flash). The booking flow keeps
// revalidating via SWR against /api/products/[slug].
export default async function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const initialProduct = await getProduct(slug);

	return <BookingView slug={slug} initialProduct={initialProduct} />;
}
