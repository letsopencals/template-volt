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

/** "€24.00 to pay at the club", "€24.00 to pay by bank transfer"… per payment method; neutral when unknown. */
export function dueLine(amount: number, currency: string | undefined, provider: string | null | undefined): string {
	const sum = formatPrice(amount, currency);
	switch (provider) {
		case 'cash':
			return `${sum} to pay at the club`;
		case 'bank_transfer':
			return `${sum} to pay by bank transfer`;
		case 'stripe_invoice':
			return `${sum} to pay by invoice`;
		default:
			return `${sum} to pay`;
	}
}

/** The payment method on an order: the provider of its first transaction, if there is one. */
export function orderProvider(order: Pick<OrderDetailResponse, 'transactions'>): string | null {
	return order.transactions?.find((t) => t.provider)?.provider ?? null;
}

export function orderReceipt(order: OrderDetailResponse, provider: string | null = orderProvider(order)): Receipt {
	const currency = order.paymentCurrencyCode;
	const paid = order.isFullyPaid || order.paymentStatus === 'paid';
	return {
		line:
			(order.paymentStatus as string) === 'voided'
				? 'Cancelled, not charged'
				: order.total <= 0
					? 'Nothing to pay'
					: paid
						? `Paid ${formatPrice(order.paidTotal || order.total, currency)}`
						: dueLine(order.dueToPay, currency, provider),
		ref: order.name,
		email: order.customer?.email ?? order.customerEmail ?? null,
	};
}
