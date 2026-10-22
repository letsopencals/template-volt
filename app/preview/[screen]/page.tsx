import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { previewAppointments, previewCatalogue, PREVIEW_TZ } from '@/lib/preview-fixtures';
import { toGame } from '@/lib/game';
import { Confirmation, ConfirmationLoading, ConfirmationSignedOut } from '@/components/game/confirmation/confirmation';
import { MatchTicket } from '@/components/game/confirmation/match-ticket';
import { GamesBoard } from '@/components/game/account/games-board';
import { PreviewGameSheet } from '@/components/game/account/preview-game-sheet';

export const metadata: Metadata = { title: 'Preview', robots: { index: false, follow: false } };

const SCREENS = ['confirmation', 'confirmation-singles', 'confirmation-squash', 'confirmation-training', 'signed-out', 'loading', 'account', 'empty', 'game', 'past', 'canceled', 'tickets'];

/**
 * Design review of the post-booking and account screens with fixture games, no store or session needed.
 * Available in development, or in production when VOLT_PREVIEW=1.
 */
export default async function PreviewPage({ params }: { params: Promise<{ screen: string }> }) {
	if (process.env.NODE_ENV === 'production' && process.env.VOLT_PREVIEW !== '1') notFound();
	const { screen } = await params;
	const cat = previewCatalogue();
	const tz = PREVIEW_TZ;
	const appts = previewAppointments();
	const game = (id: string) => toGame(appts.find((a) => a.id === id)!, cat, [{ title: 'Padel Racket Rental', quantity: 2 }]);
	const receipt = { line: '€45.00 to pay at the club', ref: '1042', email: 'sam@example.com' };
	const page = (child: React.ReactNode) => <div className="mx-auto max-w-[1400px] px-4 pb-24 pt-32 sm:px-6 lg:px-10">{child}</div>;

	switch (screen) {
		case 'index':
			return page(
				<div className="space-y-6">
					<h1 className="heading-display text-4xl text-[var(--color-ink)]">Preview</h1>
					<div className="flex flex-wrap gap-2">
						{SCREENS.map((s) => (
							<Link key={s} href={`/preview/${s}`} className="rounded-full border border-[var(--color-line-strong)] px-4 py-2 text-sm text-[var(--color-ink)] hover:border-[var(--color-primary)]">
								{s}
							</Link>
						))}
					</div>
				</div>,
			);
		case 'confirmation':
			return <Confirmation games={[game('g-next')]} me="Sam" receipt={receipt} tz={tz} />;
		case 'confirmation-singles':
			return <Confirmation games={[game('g-singles')]} me="Sam" receipt={receipt} tz={tz} />;
		case 'confirmation-squash':
			return <Confirmation games={[game('g-squash')]} me="Sam" receipt={receipt} tz={tz} />;
		case 'confirmation-training':
			return <Confirmation games={[game('g-training')]} me="Sam" receipt={{ ...receipt, line: 'Paid €44.00' }} tz={tz} signedIn={false} />;
		case 'signed-out':
			return <ConfirmationSignedOut orderId="preview" signedIn={false} />;
		case 'loading':
			return <ConfirmationLoading />;
		case 'account':
			return page(<GamesBoard appointments={appts as never} cat={cat} tz={tz} />);
		case 'empty':
			return page(<GamesBoard appointments={[]} cat={cat} tz={tz} />);
		case 'game':
			return page(<PreviewGameSheet game={game('g-next')} tz={tz} />);
		case 'past':
			return page(<PreviewGameSheet game={game('g-past-1')} tz={tz} />);
		case 'canceled':
			return page(<PreviewGameSheet game={game('g-canceled')} tz={tz} />);
		case 'tickets':
			return page(
				<div className="space-y-6">
					{['g-next', 'g-singles', 'g-squash', 'g-training'].map((id) => (
						<MatchTicket key={id} game={game(id)} tz={tz} me="Sam" />
					))}
				</div>,
			);
		default:
			notFound();
	}
}
