import '@/lib/opencals';
import { ProductService } from '@opencals/storefront-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error-handler';

export async function GET(request: NextRequest) {
	const { searchParams } = request.nextUrl;
	const productId = searchParams.get('productId');
	const date = searchParams.get('date');
	const timezone = searchParams.get('timezone') ?? undefined;
	const staffMemberId = searchParams.get('staffMemberId') ?? undefined;
	const locationId = searchParams.get('locationId') ?? undefined;
	// Used by rescheduling: `duration` (seconds, custom-duration products only) keeps the booked
	// length, and `excludeAppointmentId` stops the appointment's own slot from blocking itself.
	const duration = searchParams.get('duration') ?? undefined;
	const excludeAppointmentId = searchParams.get('excludeAppointmentId') ?? undefined;

	if (!productId || !date) {
		return NextResponse.json({ error: 'productId and date are required' }, { status: 400 });
	}

	try {
		const { data } = await ProductService.getCurrentAvailabilities({
			path: { productId },
			query: { date, timezone, staffMemberId, locationId, duration, excludeAppointmentId },
			throwOnError: true,
		});
		return NextResponse.json(data ?? []);
	} catch (err) {
		return handleApiError(err);
	}
}
