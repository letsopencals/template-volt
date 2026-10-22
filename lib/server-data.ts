import '@/lib/opencals';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import {
	StoreService,
	ProductService,
	ProductCollectionService,
	LocationService,
	StaffMemberService,
	type StorePublicSettings,
	type ProductListItemResponse,
	type ProductCollectionResponse,
	type StaffMemberListItemResponse,
} from '@opencals/storefront-sdk';
import { buildCatalogue, type Catalogue } from '@/lib/club';

/**
 * Server-only data readers. Each is wrapped in React.cache() so repeated calls
 * within a single request are deduped. RSCs call these directly instead of
 * going through the template's own /api/* routes. Never import this module from
 * a 'use client' file — the /api/* routes remain the client/SWR data source.
 */

export const getStoreSettings = cache(async (): Promise<StorePublicSettings | null> => {
	try {
		const { data } = await StoreService.getStorePublicSettings();
		return data ?? null;
	} catch {
		return null;
	}
});

export const getProducts = cache(
	async (locationId?: string): Promise<ProductListItemResponse[]> => {
		try {
			const { data } = await ProductService.list({ query: { take: 50, locationId } });
			return data?.data ?? [];
		} catch {
			return [];
		}
	},
);

/**
 * The booking flow needs each variant's `staffMembers` (with their `locations`)
 * and `locations` — that richer shape lives on the list response
 * (`ProductListItemResponse`), not the leaner `getBySlug` detail. So we fetch
 * the catalog and return the group that owns the requested slug (either the
 * group's own slug or one of its variant slugs). Mirrors
 * `app/api/products/[slug]/route.ts`.
 */
/**
 * A single product collection with its products, by slug. Used by the training
 * catalog to server-render the padel/squash coaching collections. Returns null
 * if the collection can't be loaded. Mirrors `app/api/collections/[slug]`.
 */
export const getCollection = cache(
	async (slug: string): Promise<ProductCollectionResponse | null> => {
		try {
			const { data } = await ProductCollectionService.getBySlug({ path: { slug } });
			return data ?? null;
		} catch {
			return null;
		}
	},
);

export const getProduct = cache(
	async (slug: string): Promise<ProductListItemResponse | null> => {
		try {
			const { data } = await ProductService.list({ query: { take: 100 } });
			const items = data?.data ?? [];
			const match = items.find(
				(item) => item.slug === slug || item.variants?.some((variant) => variant.slug === slug),
			);
			return match ?? null;
		} catch {
			return null;
		}
	},
);

/** Every product group, all pages (the court catalogue spans every club). */
async function listAllProducts(): Promise<ProductListItemResponse[]> {
	const out: ProductListItemResponse[] = [];
	for (let page = 1; page <= 10; page++) {
		const { data } = await ProductService.list({ query: { take: 100, page }, throwOnError: true });
		out.push(...(data?.data ?? []));
		if (!data?.meta?.hasNextPage) break;
	}
	return out;
}

/**
 * The club network: locations + courts, shaped for the booking UI. Cached across requests for five minutes (courts
 * and clubs change rarely; availability is cached separately and much shorter). On an API error nothing is cached
 * and an empty catalogue renders, so a hiccup never sticks.
 */
const loadCatalogue = unstable_cache(
	async (): Promise<Catalogue> => {
		const [products, locations, settings] = await Promise.all([
			listAllProducts(),
			LocationService.list({ query: { take: 100 }, throwOnError: true }).then((r) => r.data?.data ?? []),
			StoreService.getStorePublicSettings().then((r) => r.data ?? null),
		]);
		return buildCatalogue(products, locations, settings?.settings?.timezone ?? 'UTC');
	},
	['volt-catalogue-v1'],
	{ revalidate: 300, tags: ['catalogue'] },
);

export const getCatalogue = cache(async (): Promise<Catalogue> => {
	try {
		return await loadCatalogue();
	} catch {
		return { clubs: [], courts: [] };
	}
});

/** Coaches (staff) with the clubs they work at. */
export const getStaff = cache(async (): Promise<StaffMemberListItemResponse[]> => {
	try {
		const { data } = await StaffMemberService.list({ query: { take: 100 } });
		return data?.data ?? [];
	} catch {
		return [];
	}
});

/**
 * Which clubs each product variant is offered at (variant id → location ids), for filtering training by club.
 * Only this small map is cached (five minutes), never the full product list.
 */
const loadVariantClubs = unstable_cache(
	async (): Promise<Record<string, string[]>> => {
		const out: Record<string, string[]> = {};
		for (const g of await listAllProducts()) for (const v of g.variants ?? []) out[v.id] = (v.locations ?? []).map((l) => l.id);
		return out;
	},
	['volt-variant-clubs-v1'],
	{ revalidate: 300, tags: ['catalogue'] },
);

export const getVariantClubs = cache(async (): Promise<Record<string, string[]>> => {
	try {
		return await loadVariantClubs();
	} catch {
		return {};
	}
});
