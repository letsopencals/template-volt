'use client';

import { useState } from 'react';

/** Shares the game with the crew: the native share sheet where there is one, else copies the text. */
export function ShareInvite({ text, label = 'Send to your crew', className }: { text: string; label?: string; className?: string }) {
	const [copied, setCopied] = useState(false);
	async function share() {
		try {
			if (navigator.share) {
				await navigator.share({ text });
				return;
			}
			await navigator.clipboard.writeText(text);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 2400);
		} catch {
			/* dismissed */
		}
	}
	return (
		<button type="button" onClick={share} className={className}>
			{copied ? 'Copied to clipboard' : label}
		</button>
	);
}
