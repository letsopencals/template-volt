import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

type ButtonVariant = 'primary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
	fullWidth?: boolean;
}

// Every button is a pill (rounded-full) — the canonical shape for this template.
const BASE =
	'inline-flex items-center justify-center gap-2 rounded-full font-semibold uppercase tracking-[0.2em] transition-all disabled:cursor-not-allowed disabled:opacity-50';

const VARIANTS: Record<ButtonVariant, string> = {
	// Teal — the single accent, general-purpose primary CTA.
	primary: 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-bright)]',
	outline:
		'border border-[var(--color-line-strong)] text-[var(--color-ink)] hover:border-[var(--color-primary)]/40',
	ghost: 'text-[var(--color-ink)] hover:text-[var(--color-primary)]',
};

const SIZES: Record<ButtonSize, string> = {
	sm: 'px-5 py-2 text-xs',
	md: 'px-6 py-3 text-xs',
	lg: 'px-8 py-4 text-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
	{ variant = 'primary', size = 'md', fullWidth, className, type = 'button', ...props },
	ref,
) {
	return (
		<button
			ref={ref}
			type={type}
			className={clsx(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
			{...props}
		/>
	);
});
