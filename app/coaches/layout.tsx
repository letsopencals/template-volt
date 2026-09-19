import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Our Coaches',
	description:
		'Meet the VOLT coaching bench — certified padel and squash coaches for every level. Book any of them from the training flow.',
};

export default function CoachesLayout({ children }: { children: React.ReactNode }) {
	return children;
}
