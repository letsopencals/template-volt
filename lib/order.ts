import type { OrderDetailResponse } from '@opencals/storefront-sdk';
import { formatPrice } from '@/lib/format';
import type { Catalogue } from '@/lib/club';
import { toGame, type Game } from '@/lib/game';

// Server-safe: the preview page calls these on the server, the confirmation on the client.

/** Games on an order, in time order, with their kit. */
export function orderGames(order: OrderDetailResponse, cat: Catalogue): Game[] {
	return order.lineItems
		.filter((li) => li.appointment)
		.map((li) =>
			toGame(
				li.appointment as never,
				cat,
				(li.addOnLineItems ?? []).map((x) => ({ title: x.addOn?.title ?? 'Extra', quantity: x.quantity })),
			),
		)
		.sort((a, b) => Date.parse(a.from) - Date.parse(b.from));
}

/** What's paid or owed. */
export interface Receipt {
	line: string;
	ref: string | null;
	email: string | null;
}

export function orderReceipt(order: OrderDetailResponse): Receipt {
	const currency = order.paymentCurrencyCode;
	const paid = order.isFullyPaid || order.paymentStatus === 'paid';
	return {
		line:
			order.total <= 0
				? 'Nothing to pay'
				: paid
					? `Paid ${formatPrice(order.paidTotal || order.total, currency)}`
					: `${formatPrice(order.dueToPay, currency)} to pay at the club`,
		ref: order.name,
		email: order.customer?.email ?? order.customerEmail ?? null,
	};
}
