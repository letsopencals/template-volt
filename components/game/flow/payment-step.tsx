'use client';

import { memo, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { clsx } from 'clsx';
import type { CheckoutStartResponse, CustomerProviderCatalogItem } from '@opencals/storefront-sdk';
import { formatPrice } from '@/lib/format';
import { StripePayment } from '@/components/booking/stripe-payment';
import { BTN, Label } from '@/components/game/bits';

type ProviderName = CustomerProviderCatalogItem['name'];

export interface PaymentStepProps {
	providers: CustomerProviderCatalogItem[];
	provider: string | null;
	paymentData: CheckoutStartResponse | null;
	submitting: boolean;
	isExpired: boolean;
	total: number;
	currency: string | undefined;
	/** "Thursday 15 October" */
	dateLabel: string | null;
	club: string;
	onSelectProvider: (provider: CustomerProviderCatalogItem) => void;
	onConfirmOffline: () => void;
	onStripeSuccess: (paymentIntentId: string) => void;
	onStripeError: (message: string) => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;
const PANEL = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.4, ease: EASE } };

/** Club words for the store's payment methods; anything else uses the store's own copy. */
const COPY: Partial<Record<ProviderName, { title: string; note: string }>> = {
	cash: { title: 'Pay at the club', note: 'Card or cash at reception' },
	bank_transfer: { title: 'Bank transfer', note: 'We email the details' },
	stripe: { title: 'Card online', note: 'Pay now, secured by Stripe' },
	no_payment_required: { title: 'Nothing to pay', note: 'This one is free' },
};

const isOffline = (p: CustomerProviderCatalogItem | undefined) => p?.checkoutMode === 'manual' || p?.checkoutMode === 'none';

/** The last step. A single method is picked for you; offline methods get a short "what happens next". */
export function PaymentStep(p: PaymentStepProps) {
	const selected = p.providers.find((x) => x.name === p.provider);
	const autoPicked = useRef(false);

	useEffect(() => {
		if (autoPicked.current || p.provider || p.providers.length !== 1) return;
		autoPicked.current = true;
		p.onSelectProvider(p.providers[0]!);
	}, [p]);

	const showStripe = selected?.checkoutMode === 'internal' && p.paymentData?.clientSecret && (p.paymentData.provider as string) !== 'no_payment_required';

	if (p.providers.length === 0) {
		return <p className="text-sm text-[var(--color-ink-muted)]">Online payment isn’t available right now. Call the club’s reception to book.</p>;
	}

	return (
		<div className="space-y-5">
			{p.providers.length > 1 ? (
				<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Payment method">
					{p.providers.map((x) => (
						<MethodTile key={x.name} provider={x} selected={x.name === p.provider} disabled={p.submitting || p.isExpired} onSelect={p.onSelectProvider} />
					))}
				</div>
			) : null}

			<AnimatePresence mode="wait">
				{selected && isOffline(selected) ? (
					<motion.div key={selected.name} {...PANEL}>
						<OfflineSheet {...p} method={selected} />
					</motion.div>
				) : showStripe ? (
					<motion.div key="stripe" {...PANEL} className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-bg)] p-5">
						<StripePayment
							clientSecret={p.paymentData!.clientSecret!}
							publishableKey={p.paymentData!.publishableKey}
							stripeAccountId={p.paymentData!.stripeAccountId}
							onSuccess={p.onStripeSuccess}
							onError={p.onStripeError}
							disabled={p.isExpired}
						/>
					</motion.div>
				) : selected && p.submitting ? (
					<motion.p key="starting" {...PANEL} className="text-sm text-[var(--color-ink-muted)]">
						Getting payment ready…
					</motion.p>
				) : null}
			</AnimatePresence>
		</div>
	);
}

const MethodTile = memo(function MethodTile({
	provider,
	selected,
	disabled,
	onSelect,
}: {
	provider: CustomerProviderCatalogItem;
	selected: boolean;
	disabled: boolean;
	onSelect: (p: CustomerProviderCatalogItem) => void;
}) {
	const copy = COPY[provider.name];
	return (
		<button
			type="button"
			role="radio"
			aria-checked={selected}
			disabled={disabled}
			onClick={() => onSelect(provider)}
			className={clsx(
				'flex flex-col rounded-2xl border p-5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
				selected ? 'border-[var(--color-primary)] bg-[var(--color-tint)]' : 'border-[var(--color-line-strong)] hover:border-[var(--color-primary)]/60',
			)}
		>
			<span className="flex items-center justify-between gap-3">
				<Label className="text-[var(--color-ink)]">{copy?.title ?? provider.displayName}</Label>
				{provider.mode === 'test' ? <TestBadge /> : null}
			</span>
			<span className="mt-1 text-sm text-[var(--color-ink-muted)]">{copy?.note ?? provider.description}</span>
		</button>
	);
});

function OfflineSheet({ method: provider, total, currency, dateLabel, club, submitting, isExpired, onConfirmOffline }: PaymentStepProps & { method: CustomerProviderCatalogItem }) {
	const free = provider.checkoutMode === 'none' || total <= 0;
	const bank = provider.name === 'bank_transfer';
	const day = dateLabel ?? 'on the day';
	const steps = free
		? ['Confirm and you’re in', 'Your confirmation arrives by email', `See you at ${club}: ${day}`]
		: bank
			? ['Confirm and you’re in', 'Bank details arrive by email', `Transfer before you play: ${day}`]
			: ['Confirm and you’re in', 'Your confirmation arrives by email', `Pay at ${club} reception: ${day}`];

	return (
		<div className="overflow-hidden rounded-[24px] border border-[var(--color-primary)]/40 bg-[var(--color-bg-deep)]">
			<div className="flex flex-wrap items-end justify-between gap-6 px-6 py-6 sm:px-8">
				<div>
					<p className="flex items-center gap-2">
						<Label className="text-[var(--color-primary)]">{COPY[provider.name]?.title ?? provider.displayName}</Label>
						{provider.mode === 'test' ? <TestBadge /> : null}
					</p>
					<p className="heading-display mt-2 text-2xl text-[var(--color-ink)] md:text-3xl">
						{free ? (
							<>
								Nothing to pay. <span className="text-[var(--color-primary)]">Just turn up.</span>
							</>
						) : bank ? (
							'Transfer before you play'
						) : (
							<>
								Book now, <span className="text-[var(--color-primary)]">pay at the club.</span>
							</>
						)}
					</p>
				</div>
				{free ? null : (
					<div className="sm:text-right">
						<p className="heading-display text-4xl tabular-nums text-[var(--color-ink)]">{formatPrice(total, currency)}</p>
						<p className="mt-1 text-xs text-[var(--color-ink-dim)]">{bank ? 'by transfer' : 'at reception'}</p>
					</div>
				)}
			</div>

			<ol className="grid gap-px border-y border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-3">
				{steps.map((s, i) => (
					<li key={s} className="flex gap-3 bg-[var(--color-bg-deep)] px-6 py-4 sm:flex-col sm:px-8">
						<span
							className={clsx(
								'flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold',
								i === 0 ? 'bg-[var(--color-primary)] text-black' : 'border border-[var(--color-primary)]/50 text-[var(--color-primary)]',
							)}
						>
							{i + 1}
						</span>
						<span className="text-sm text-[var(--color-ink)]">{s}</span>
					</li>
				))}
			</ol>

			<div className="flex flex-wrap items-center justify-between gap-5 px-6 py-6 sm:px-8">
				<button type="button" className={BTN} onClick={onConfirmOffline} disabled={submitting || isExpired}>
					{submitting ? 'Confirming…' : 'Confirm booking'}
				</button>
				<p className="max-w-xs text-xs text-[var(--color-ink-dim)]">
					{isExpired ? 'The hold has expired. Pick your time again.' : 'Nothing to pay now. Change or cancel from your account.'}
				</p>
			</div>
		</div>
	);
}

function TestBadge() {
	return <span className="rounded-full bg-[var(--color-primary)] px-1.5 py-0.5 font-mono text-[0.6rem] font-bold uppercase text-black">Test</span>;
}
