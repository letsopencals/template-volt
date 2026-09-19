import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CourtBookingView } from '@/components/booking/court-booking-view';

export const metadata: Metadata = {
	title: 'Book a Court',
	description: 'Book a padel or squash court in seconds — pick a court, a time and a duration on one grid.',
};

// The court grid reads sport from ?sport= and manages date/selection on the
// client, so it lives under Suspense (useSearchParams).
export default function BookPage() {
	return (
		<Suspense fallback={<div className="min-h-screen bg-[var(--color-bg)]" />}>
			<CourtBookingView />
		</Suspense>
	);
}
