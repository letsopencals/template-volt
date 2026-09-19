import '@/lib/opencals';
import { ProductCollectionService } from '@opencals/storefront-sdk';
import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error-handler';

/**
 * The courts in a sport's collection — date-independent, so it's fetched once and
 * kept on screen while per-date availability reloads separately (see ./slots).
 * A "court" is its own bookable product: `p.id` is the court, `p.productId` is the
 * shared product-group id (courts are variants of one group) and is NOT bookable.
 */
export interface CourtGridCourt {
	id: string;
	slug: string;
	title: string;
	variantTitle: string;
	price: number;
	duration: number;
	maxDuration: number;
	color: string;
	imageUrl: string | null;
}

const trailingNumber = (s: string): number => {
	const m = s.match(/(\d+)\s*$/);
	return m?.[1] ? parseInt(m[1], 10) : 0;
};

export async function GET(_request: Request, { params }: { params: Promise<{ collection: string }> }) {
	const { collection } = await params;
	try {
		const { data: coll } = await ProductCollectionService.getBySlug({
			path: { slug: collection },
			throwOnError: true,
		});

		const courts: CourtGridCourt[] = (coll?.products ?? [])
			.map((p) => ({
				id: p.id,
				slug: p.slug,
				title: p.title,
				variantTitle: p.variantTitle,
				price: p.price,
				duration: p.duration,
				maxDuration: p.maxDuration,
				color: p.color,
				imageUrl: null,
			}))
			// Collection order isn't guaranteed; sort courts naturally (1, 2, … 11).
			.sort((a, b) => trailingNumber(a.variantTitle) - trailingNumber(b.variantTitle));

		return NextResponse.json({ courts });
	} catch (err) {
		return handleApiError(err);
	}
}
