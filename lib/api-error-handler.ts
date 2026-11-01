import { OpencalsApiError, type CheckoutErrorResponse } from '@opencals/storefront-sdk';
import { NextResponse } from 'next/server';

/**
 * The extra fields a checkout error carries: `orderId` (CART_ALREADY_CHECKED_OUT) and `paymentStatus`
 * (PAYMENT_NOT_AUTHORIZED). Other errors share the body without them, so every field is optional.
 */
function checkoutErrorBody(err: OpencalsApiError): Partial<CheckoutErrorResponse> {
	const body = (err.body ?? {}) as Partial<CheckoutErrorResponse>;
	return {
		...(typeof body.orderId === 'string' && { orderId: body.orderId }),
		...(typeof body.paymentStatus === 'string' && { paymentStatus: body.paymentStatus }),
	};
}

export function handleApiError(err: unknown, fallbackMessage = 'Internal server error') {
	if (err instanceof OpencalsApiError) {
		const { orderId, paymentStatus } = checkoutErrorBody(err);
		return NextResponse.json(
			{
				error: err.message,
				...(err.code && { code: err.code }),
				...(orderId && { orderId }),
				...(paymentStatus && { paymentStatus }),
				...(Object.keys(err.toFieldErrors()).length > 0 && { errors: err.toFieldErrors() }),
				// The API's own field errors, full dotted paths (`customer.email`), for placing under each field (`lib/field-errors.ts`).
				...(err.errors?.length ? { fieldErrors: err.errors } : {}),
			},
			{ status: err.status },
		);
	}

	console.error(fallbackMessage, err);
	return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
