import type { PaymentInstructions, PaymentProviderName } from '@opencals/storefront-sdk';
import type { Game } from '@/lib/game';

/**
 * The game the player just built, kept in sessionStorage so /thank-you can show the full match ticket even to a
 * guest (reading the order needs a session, and checking out with an existing customer's email doesn't sign them
 * in). Written when the court is held, patched with the order at checkout, read once on the confirmation.
 */
export interface GameSnapshot {
	at: number;
	orderId: string | null;
	game: Game;
	/** The booker's first name, for the ticket's first spot */
	me: string | null;
	email: string | null;
	total: number;
	currency: string;
	/** The payment method used at checkout (stripe, cash, bank_transfer, stripe_invoice…) */
	provider: PaymentProviderName | null;
	/** How to pay, for manual methods; only submit returns it, so the thank-you page reads it from here */
	paymentInstructions: PaymentInstructions | null;
}

const KEY = 'volt:last-game';
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

export function saveSnapshot(s: GameSnapshot) {
	try {
		sessionStorage.setItem(KEY, JSON.stringify(s));
	} catch {
		// Storage blocked: the confirmation falls back to the order or the sealed ticket.
	}
}

export function patchSnapshot(patch: Partial<GameSnapshot> & { ref?: string; status?: Game['status']; pendingReason?: Game['pendingReason'] }) {
	const s = readSnapshot();
	if (!s) return;
	const { ref, status, pendingReason, ...rest } = patch;
	const game = {
		...s.game,
		...(ref ? { ref } : {}),
		...(status ? { status } : {}),
		...(pendingReason !== undefined ? { pendingReason } : {}),
	};
	saveSnapshot({ ...s, ...rest, game });
}

export function readSnapshot(): GameSnapshot | null {
	try {
		const raw = sessionStorage.getItem(KEY);
		if (!raw) return null;
		const s = JSON.parse(raw) as GameSnapshot;
		return Date.now() - s.at < MAX_AGE_MS ? s : null;
	} catch {
		return null;
	}
}
