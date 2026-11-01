import type { Game, PendingReason } from '@/lib/game';

/** How to pay a manual-payment order, as checkout submit returns it (SDK 0.3.20 `PaymentInstructions`). */
export interface PaymentInstructions {
	/** bank_transfer, cash or stripe_invoice */
	provider: string;
	/** Stripe invoice: the hosted page where the invoice is paid (null while it's being issued) */
	hostedInvoiceUrl?: string | null;
	/** Pay by this time (ISO 8601), or the booking is cancelled; null when there's no deadline */
	dueAt?: string | null;
	bankDetails?: { accountName?: string | null; bankName?: string | null; iban?: string | null; swift?: string | null } | null;
}

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
	provider: string | null;
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

export function patchSnapshot(patch: Partial<GameSnapshot> & { ref?: string; status?: string; pendingReason?: PendingReason | null }) {
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
