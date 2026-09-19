'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { siteConfig } from '@/lib/site-config';
import { resolveLink, type ResolveLinkResult } from '@/app/auth/actions/resolve-link';

const ERROR_COPY: Record<NonNullable<ResolveLinkResult['errorCode']>, { title: string; message: string }> = {
	TOKEN_EXPIRED: { title: 'Link Expired', message: 'This link has expired. Please request a new one.' },
	TOKEN_USED: { title: 'Link Already Used', message: 'This link has already been used.' },
	TOKEN_INVALID: { title: 'Invalid Link', message: 'This link is invalid or could not be found.' },
};

/**
 * The backend emits `/account/appointments/{id}/view(?action=...)`, but this
 * template's detail route is `/account/appointments/{id}`. Strip the trailing
 * `/view` segment while preserving any query string (e.g. `?action=cancel`).
 */
function normalizeRedirect(path: string): string {
	return path.replace(/^(\/account\/appointments\/[^/]+)\/view/, '$1');
}

export default function LinkPage() {
	const router = useRouter();
	const params = useParams<{ token: string }>();
	const token = params?.token;

	const [status, setStatus] = useState<'resolving' | 'error'>('resolving');
	const [errorCode, setErrorCode] = useState<NonNullable<ResolveLinkResult['errorCode']>>('TOKEN_INVALID');
	const ranRef = useRef(false);

	useEffect(() => {
		if (!token || ranRef.current) return;
		ranRef.current = true;

		(async () => {
			const result = await resolveLink(token);
			if (result.success && result.redirectPath) {
				router.replace(normalizeRedirect(result.redirectPath));
				router.refresh();
			} else {
				setErrorCode(result.errorCode ?? 'TOKEN_INVALID');
				setStatus('error');
			}
		})();
	}, [token, router]);

	return (
		<section className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-6 pt-20 pb-20">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="w-full max-w-[440px] text-center"
			>
				<Link href="/" className="font-display text-2xl font-bold tracking-tight text-[var(--color-ink)]">
					{siteConfig.logo.text}
					<span className="text-[var(--color-primary)]">{siteConfig.logo.accent}</span>
				</Link>

				{status === 'resolving' && (
					<div className="mt-8">
						<div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
						<p className="mt-4 text-sm text-[var(--color-ink-muted)]">Signing you in...</p>
					</div>
				)}

				{status === 'error' && (
					<div className="mt-8">
						<div className="mx-auto flex h-16 w-16 items-center justify-center bg-red-500/15">
							<svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</div>
						<h1 className="mt-6 font-display text-3xl font-semibold text-[var(--color-ink)]">
							{ERROR_COPY[errorCode].title}
						</h1>
						<p className="mt-2 text-sm text-[var(--color-ink-muted)]">{ERROR_COPY[errorCode].message}</p>
						<Link
							href="/auth/sign-in"
							className="mt-6 inline-block bg-[var(--color-primary)] px-8 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition-all hover:bg-[var(--color-primary-bright)]"
						>
							Sign In
						</Link>
					</div>
				)}
			</motion.div>
		</section>
	);
}
