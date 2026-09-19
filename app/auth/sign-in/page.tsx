'use client';

import { Suspense, useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { z } from 'zod';
import { siteConfig } from '@/lib/site-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const emailSchema = z.string().min(1, 'Email is required').email('Please enter a valid email');

type Step = 'email' | 'choose' | 'code' | 'password';

const labelClass = 'mb-2 block text-xs font-medium text-[var(--color-ink-muted)]';

export default function SignInPage() {
	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
				</div>
			}
		>
			<SignInContent />
		</Suspense>
	);
}

function SignInContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const callbackUrl = searchParams.get('callbackUrl') ?? '/account';

	const [step, setStep] = useState<Step>('email');
	const [email, setEmail] = useState('');
	const [code, setCode] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [cooldown, setCooldown] = useState(0);

	// Resend cooldown timer
	useEffect(() => {
		if (cooldown <= 0) return;
		const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
		return () => clearTimeout(id);
	}, [cooldown]);

	const goToChoose = () => {
		setError(null);
		const parsed = emailSchema.safeParse(email);
		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message ?? 'Please enter a valid email');
			return;
		}
		setStep('choose');
	};

	const sendCode = async () => {
		setError(null);
		setLoading(true);
		try {
			await fetch('/api/auth/request-login-code', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email }),
			});
			setCooldown(60);
			setCode('');
			setStep('code');
		} catch {
			setError('Something went wrong. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const verifyCode = async () => {
		setError(null);
		if (code.trim().length < 6) {
			setError('Enter the 6-digit code from your email.');
			return;
		}
		setLoading(true);
		try {
			const result = await signIn('login-code', { email, code: code.trim(), redirect: false });
			if (result?.error) {
				setError('That code is invalid or expired. Please try again.');
			} else {
				router.push(callbackUrl);
				router.refresh();
			}
		} catch {
			setError('Something went wrong. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const signInWithPassword = async () => {
		setError(null);
		if (password.length < 6) {
			setError('Password must be at least 6 characters.');
			return;
		}
		setLoading(true);
		try {
			const result = await signIn('credentials', { email, password, redirect: false });
			if (result?.error) {
				setError('Invalid email or password.');
			} else {
				router.push(callbackUrl);
				router.refresh();
			}
		} catch {
			setError('Something went wrong. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const useDifferentEmail = () => {
		setError(null);
		setCode('');
		setPassword('');
		setStep('email');
	};

	return (
		<section className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-6 pt-20 pb-20">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="w-full max-w-[440px]"
			>
				<div className="text-center">
					<Link href="/" className="font-display text-2xl font-bold tracking-tight text-[var(--color-ink)]">
						{siteConfig.logo.text}
						<span className="text-[var(--color-primary)]">{siteConfig.logo.accent}</span>
					</Link>
					<h1 className="mt-6 font-display text-3xl font-semibold text-[var(--color-ink)]">Welcome Back</h1>
					<p className="mt-2 text-sm text-[var(--color-ink-muted)]">
						{step === 'code'
							? 'Enter the code we emailed you'
							: 'Sign in to manage your appointments'}
					</p>
				</div>

				{error && (
					<div className="mt-6 border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
						{error}
					</div>
				)}

				{/* Step 1: email */}
				{step === 'email' && (
					<form
						onSubmit={(e) => {
							e.preventDefault();
							goToChoose();
						}}
						className="mt-8 space-y-4"
					>
						<div>
							<label className={labelClass}>Email</label>
							<Input
								type="email"
								autoFocus
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="your@email.com"
							/>
						</div>
						<Button type="submit" variant="primary" size="lg" fullWidth>
							Continue
						</Button>
					</form>
				)}

				{/* Step 2: choose method */}
				{step === 'choose' && (
					<div className="mt-8 space-y-4">
						<p className="text-center text-sm text-[var(--color-ink-muted)]">
							How would you like to sign in as{' '}
							<span className="font-medium text-[var(--color-ink)]">{email}</span>?
						</p>
						<Button type="button" variant="primary" size="lg" fullWidth onClick={sendCode} disabled={loading}>
							{loading ? 'Sending...' : 'Email me a login code'}
						</Button>
						<Button
							type="button"
							variant="outline"
							size="lg"
							fullWidth
							onClick={() => {
								setError(null);
								setStep('password');
							}}
							disabled={loading}
						>
							Use my password
						</Button>
						<button
							type="button"
							onClick={useDifferentEmail}
							className="w-full text-center text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-primary)]"
						>
							Use a different email
						</button>
					</div>
				)}

				{/* Step 3a: code entry */}
				{step === 'code' && (
					<form
						onSubmit={(e) => {
							e.preventDefault();
							verifyCode();
						}}
						className="mt-8 space-y-4"
					>
						<p className="text-center text-sm text-[var(--color-ink-muted)]">
							We sent a 6-digit code to{' '}
							<span className="font-medium text-[var(--color-ink)]">{email}</span>.
						</p>
						<Input
							type="text"
							inputMode="numeric"
							autoComplete="one-time-code"
							autoFocus
							maxLength={6}
							value={code}
							onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
							placeholder="000000"
							className="text-center text-lg tracking-[0.5em]"
						/>
						<Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
							{loading ? 'Verifying...' : 'Sign In'}
						</Button>
						<button
							type="button"
							onClick={sendCode}
							disabled={cooldown > 0 || loading}
							className="w-full text-center text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-primary)] disabled:opacity-50"
						>
							{cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
						</button>
						<button
							type="button"
							onClick={useDifferentEmail}
							className="w-full text-center text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-primary)]"
						>
							Use a different email
						</button>
					</form>
				)}

				{/* Step 3b: password */}
				{step === 'password' && (
					<form
						onSubmit={(e) => {
							e.preventDefault();
							signInWithPassword();
						}}
						className="mt-8 space-y-4"
					>
						<div>
							<label className={labelClass}>Password</label>
							<Input
								type="password"
								autoFocus
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="Enter your password"
							/>
						</div>
						<div className="flex justify-end">
							<Link
								href="/auth/forgot-password"
								className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-primary)]"
							>
								Forgot password?
							</Link>
						</div>
						<Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
							{loading ? 'Signing in...' : 'Sign In'}
						</Button>
						<button
							type="button"
							onClick={() => {
								setError(null);
								setPassword('');
								setStep('choose');
							}}
							className="w-full text-center text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-primary)]"
						>
							Back
						</button>
					</form>
				)}

				<p className="mt-8 text-center text-sm text-[var(--color-ink-muted)]">
					Don&apos;t have an account?{' '}
					<Link href="/auth/sign-up" className="font-medium text-[var(--color-ink)] hover:text-[var(--color-primary)]">
						Sign up
					</Link>
				</p>
			</motion.div>
		</section>
	);
}
