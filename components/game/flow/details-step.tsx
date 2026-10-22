'use client';

import Link from 'next/link';
import type { GameBooking } from '@/hooks/use-game-booking';
import { Input, Textarea } from '@/components/ui/input';
import { BTN, ErrorNote, Field, Label } from '@/components/game/bits';

/** Who's booking, plus the store's checkout questions. Continuing holds the court (or place). */
export function DetailsStep({ b, signedIn }: { b: GameBooking; signedIn: boolean }) {
	const ordered = [...b.questions].sort((x, y) => (x.order ?? 0) - (y.order ?? 0));
	const fe = b.checkout.fieldErrors;
	const set = (id: string, v: string) => b.setAnswers((prev) => ({ ...prev, [id]: v }));

	return (
		<form
			className="space-y-7"
			onSubmit={(e) => {
				e.preventDefault();
				if (b.detailsValid && !b.reserving) void b.reserve();
			}}
		>
			<div className="grid gap-4 sm:grid-cols-2">
				<Field label="Email" required error={fe.email?.[0]} wide>
					<Input type="email" required autoComplete="email" value={b.email} onChange={(e) => b.setEmail(e.target.value)} readOnly={signedIn} placeholder="you@example.com" />
				</Field>
				<Field label="First name" error={fe.firstName?.[0]}>
					<Input autoComplete="given-name" value={b.firstName} onChange={(e) => b.setFirstName(e.target.value)} />
				</Field>
				<Field label="Last name" error={fe.lastName?.[0]}>
					<Input autoComplete="family-name" value={b.lastName} onChange={(e) => b.setLastName(e.target.value)} />
				</Field>
				<p className="text-sm leading-relaxed text-[var(--color-ink-muted)] sm:col-span-2">
					{signedIn ? (
						'You’re signed in, so the booking goes straight to your account.'
					) : (
						<>
							We’ll email your confirmation here, and your account keeps every game at every club. Played with us before?{' '}
							<Link href="/auth/sign-in?callbackUrl=/book" className="font-semibold text-[var(--color-primary)] underline underline-offset-4">
								Sign in
							</Link>
						</>
					)}
				</p>
			</div>

			{ordered.length > 0 ? (
				<div className="space-y-5">
					<Label className="text-[var(--color-ink-dim)]">Before you play</Label>
					{ordered.map((q) => {
						const t = q.translations?.[0];
						const value = b.answers[q.id] ?? '';
						return (
							<Field key={q.id} label={t?.title ?? q.internalName} required={q.required} hint={t?.description ?? undefined} wide>
								{q.type === 'dropdown' && t?.options ? (
									<select
										value={value}
										required={q.required}
										onChange={(e) => set(q.id, e.target.value)}
										className="h-12 w-full rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-bg)] px-4 text-sm text-[var(--color-ink)]"
									>
										<option value="">Choose…</option>
										{t.options.map((o) => (
											<option key={o} value={o}>
												{o}
											</option>
										))}
									</select>
								) : q.type === 'multi-line-text-field' ? (
									<Textarea rows={3} required={q.required} value={value} onChange={(e) => set(q.id, e.target.value)} />
								) : q.type === 'checkbox' ? (
									<span className="flex items-center gap-2.5 text-sm text-[var(--color-ink)]">
										<input type="checkbox" checked={value === 'true'} onChange={(e) => set(q.id, e.target.checked ? 'true' : 'false')} className="h-4 w-4 accent-[var(--color-primary)]" />
										Yes
									</span>
								) : (
									<Input required={q.required} value={value} onChange={(e) => set(q.id, e.target.value)} />
								)}
							</Field>
						);
					})}
				</div>
			) : null}

			{b.checkout.error ? <ErrorNote>{b.checkout.error}</ErrorNote> : null}

			<button type="submit" className={BTN} disabled={b.reserving || !b.detailsValid}>
				{b.reserving ? (b.kind === 'court' ? 'Holding your court…' : 'Holding your place…') : b.kind === 'court' ? 'Hold the court' : 'Hold my place'}
			</button>
		</form>
	);
}
