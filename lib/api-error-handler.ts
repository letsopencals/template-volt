import { OpencalsApiError } from '@opencals/storefront-sdk';
import { NextResponse } from 'next/server';

/** A string field of the API's error body, e.g. `orderId` (CART_ALREADY_CHECKED_OUT) or `paymentStatus` (402). */
function bodyField(err: OpencalsApiError, key: string): string | undefined {
	const value = err.body?.[key];
	return typeof value === 'string' ? value : undefined;
}

export function handleApiError(err: unknown, fallbackMessage = 'Internal server error') {
	if (err instanceof OpencalsApiError) {
		const orderId = bodyField(err, 'orderId');
		const paymentStatus = bodyField(err, 'paymentStatus');
		return NextResponse.json(
			{
				error: err.message,
				...(err.code && { code: err.code }),
				...(orderId && { orderId }),
				...(paymentStatus && { paymentStatus }),
				...(Object.keys(err.toFieldErrors()).length > 0 && { errors: err.toFieldErrors() }),
			},
			{ status: err.status },
		);
	}

	console.error(fallbackMessage, err);
	return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
