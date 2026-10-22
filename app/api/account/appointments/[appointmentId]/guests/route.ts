import '@/lib/opencals';
import { AppointmentService } from '@opencals/storefront-sdk';
import { requireAuth } from '@/lib/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error-handler';

/** Invite a player to a booked game by email (they get the booking emails). Owner-only, enforced by the API. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ appointmentId: string }> }) {
	const { appointmentId } = await params;
	const auth = await requireAuth();
	if (auth.error) return auth.error;

	try {
		const { email } = (await request.json()) as { email?: string };
		if (!email || !/.+@.+\..+/.test(email)) return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
		const { data } = await AppointmentService.addGuest({
			path: { appointmentId },
			body: { email: email.trim(), notify: true },
			headers: auth.headers,
			throwOnError: true,
		});
		return NextResponse.json(data ?? { ok: true });
	} catch (err) {
		return handleApiError(err);
	}
}
