import '@/lib/opencals';
import { cache } from 'react';
import {
	StoreService,
	ProductService,
	ProductCollectionService,
	type StorePublicSettings,
	type ProductListItemResponse,
	type ProductCollectionResponse,
} from '@opencals/storefront-sdk';

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
