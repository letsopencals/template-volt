'use client';

import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** Viewport rect of the element the popover hangs off (captured at click time). */
export interface AnchorRect {
	left: number;
	top: number;
	bottom: number;
	width: number;
}

interface Position {
	left: number;
	top: number;
}

const VIEWPORT_MARGIN = 12; // px — keep this far from the viewport edges
const ANCHOR_GAP = 6; // px — space between the anchor and the popover

/** Below the anchor if it fits, else above; if neither fits, the roomier side, clamped. */
function computePosition(anchor: AnchorRect, w: number, h: number): Position {
	const vw = document.documentElement.clientWidth;
	const vh = window.innerHeight;

	const centered = anchor.left + anchor.width / 2 - w / 2;
	const left = Math.max(VIEWPORT_MARGIN, Math.min(centered, vw - w - VIEWPORT_MARGIN));

	const below = anchor.bottom + ANCHOR_GAP;
	const above = anchor.top - ANCHOR_GAP - h;
	const fitsBelow = below + h <= vh - VIEWPORT_MARGIN;
	const fitsAbove = above >= VIEWPORT_MARGIN;
	let top: number;
	if (fitsBelow) top = below;
	else if (fitsAbove) top = above;
	else {
		const roomBelow = vh - anchor.bottom;
		const roomAbove = anchor.top;
		top = roomBelow >= roomAbove ? below : above;
		top = Math.max(VIEWPORT_MARGIN, Math.min(top, vh - h - VIEWPORT_MARGIN));
	}
	return { left, top };
}

/**
 * Renders `children` in a portal on document.body with `position: fixed`, so it is
 * never clipped by a scrolling/overflow ancestor. Horizontally centred on the anchor
 * and clamped into the viewport; flips above the anchor when there's no room below.
 * Hidden for the first layout pass until it has been measured.
 */
export const AnchoredPopover = forwardRef<HTMLDivElement, { anchor: AnchorRect; children: React.ReactNode }>(
	function AnchoredPopover({ anchor, children }, ref) {
		const elRef = useRef<HTMLDivElement>(null);
		useImperativeHandle(ref, () => elRef.current as HTMLDivElement);
		const [pos, setPos] = useState<Position | null>(null);

		// Measure before paint, and again whenever the content resizes (e.g. options
		// refresh); only commit when the position actually moves.
		useLayoutEffect(() => {
			const el = elRef.current;
			if (!el) return;
			const place = () => {
				const next = computePosition(anchor, el.offsetWidth, el.offsetHeight);
				setPos((prev) => (prev && prev.left === next.left && prev.top === next.top ? prev : next));
			};
			place();
			const ro = new ResizeObserver(place);
			ro.observe(el);
			return () => ro.disconnect();
		}, [anchor]);

		return createPortal(
			<div
				ref={elRef}
				className="fixed z-[60]"
				style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? 'visible' : 'hidden' }}
			>
				{children}
			</div>,
			document.body,
		);
	},
);
