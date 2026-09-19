import '@/lib/opencals';
import { StaffMemberService } from '@opencals/storefront-sdk';
import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error-handler';

export async function GET() {
	try {
		const { data } = await StaffMemberService.list({ query: { take: 100 } });
		return NextResponse.json(data?.data ?? []);
	} catch (err) {
		return handleApiError(err);
	}
}
