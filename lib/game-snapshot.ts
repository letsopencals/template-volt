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
	/** Paid at the club rather than online */
	payAtVenue: boolean;
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

export function patchSnapshot(patch: Partial<GameSnapshot> & { ref?: string }) {
	const s = readSnapshot();
	if (!s) return;
	const { ref, ...rest } = patch;
	saveSnapshot({ ...s, ...rest, game: ref ? { ...s.game, ref } : s.game });
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
