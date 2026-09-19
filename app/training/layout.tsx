import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Training & Coaching',
	description:
		'Individual lessons and small-group classes for padel and squash — every level, real coaches. Book online in seconds.',
};

export default function TrainingLayout({ children }: { children: React.ReactNode }) {
	return children;
}
