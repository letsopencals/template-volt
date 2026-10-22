'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import type { OrderDetailResponse } from '@opencals/storefront-sdk';
import { fetcher } from '@/lib/fetcher';
import { formatPrice } from '@/lib/format';
import type { Catalogue } from '@/lib/club';
import { readSnapshot, type GameSnapshot } from '@/lib/game-snapshot';
import { orderGames, orderReceipt } from '@/lib/order';
import { Confirmation, ConfirmationLoading, ConfirmationSignedOut } from '@/components/game/confirmation/confirmation';

/**
 * Loads the order behind `/thank-you?orderId=` for the signed-in player. Guests (and existing customers who checked
 * out without signing in) can't read the order, so the ticket comes from the snapshot the flow saved in this tab;
 * with neither, a sealed ticket and a sign-in link.
 */
export function ConfirmationView({ orderId, cat, tz }: { orderId: string | null; cat: Catalogue; tz: string }) {
	const { data: session, status } = useSession();
	const { data: order, isLoading } = useSWR<OrderDetailResponse>(orderId && status === 'authenticated' ? `/api/account/orders/${orderId}` : null, fetcher, {
		revalidateOnFocus: false,
	});
	const [snap, setSnap] = useState<GameSnapshot | null | undefined>(undefined);
	useEffect(() => {
		const s = readSnapshot();
		setSnap(s && (!orderId || !s.orderId || s.orderId === orderId) ? s : null);
	}, [orderId]);

	const games = useMemo(() => (order ? orderGames(order, cat) : []), [order, cat]);
	const gameTz = games[0]?.clubId ? (cat.clubs.find((c) => c.id === games[0]!.clubId)?.tz ?? tz) : tz;

	if (status === 'loading' || isLoading || snap === undefined) return <ConfirmationLoading />;
	if (order && games.length) {
		return <Confirmation games={games} me={order.customerFirstName || order.billingFirstName || session?.customer?.firstName || null} receipt={orderReceipt(order)} tz={gameTz} />;
	}
	if (snap) {
		const receipt = {
			line: snap.total <= 0 ? 'Nothing to pay' : snap.payAtVenue ? `${formatPrice(snap.total, snap.currency)} to pay at the club` : `Paid ${formatPrice(snap.total, snap.currency)}`,
			ref: snap.game.ref || null,
			email: snap.email,
		};
		const snapTz = cat.clubs.find((c) => c.id === snap.game.clubId)?.tz ?? tz;
		return <Confirmation games={[snap.game]} me={snap.me} receipt={receipt} tz={snapTz} signedIn={status === 'authenticated'} />;
	}
	return <ConfirmationSignedOut orderId={orderId} signedIn={status === 'authenticated'} />;
}
