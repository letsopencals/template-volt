'use client';

import type { Game } from '@/lib/game';
import { GameSheet } from '@/components/game/account/game-detail';

/** GameSheet with no-op actions, for /preview. */
export function PreviewGameSheet({ game, tz }: { game: Game; tz: string }) {
	return <GameSheet game={game} tz={tz} payment="€45.00 to pay at the club" onCancel={() => {}} onReschedule={() => {}} onInvited={() => {}} />;
}
