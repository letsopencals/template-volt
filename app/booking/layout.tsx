import type { Metadata } from 'next';
export const metadata: Metadata = {
	title: 'Book Training',
	description: 'Choose a coach, pick a time, and confirm. Done in under a minute.',
};

export default function BookingLayout({ children }: { children: React.ReactNode }) {
	return children;
}
