import type { Metadata } from 'next';
export const metadata: Metadata = {
	title: 'About',
	description: 'The story behind VOLT Padel & Squash Club — pro courts, real coaching, and booking that just works.',
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
	return children;
}
