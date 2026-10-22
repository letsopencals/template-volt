import Image from 'next/image';
import Link from 'next/link';
import { siteConfig } from '@/lib/site-config';
import { sportOf, type Club } from '@/lib/club';

/**
 * "Our clubs": one photo card per club (store locations), linking straight to that club's hall on /book.
 * Server component; the clubs come from the cached catalogue.
 */
export function ClubsSection({ clubs }: { clubs: Club[] }) {
	const open = clubs.filter((c) => c.courtCount > 0);
	if (!open.length) return null;
	const { clubs: copy } = siteConfig;

	return (
		<section className="relative bg-[var(--color-bg)] py-20 lg:py-28">
			<div className="mx-auto max-w-[1600px] px-6 lg:px-10">
				<div className="flex flex-wrap items-end justify-between gap-6">
					<div className="max-w-2xl">
						<span className="chip">
							<span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
							{copy.eyebrow}
						</span>
						<h2 className="heading-display mt-5 whitespace-pre-line text-4xl text-[var(--color-ink)] lg:text-5xl">{copy.heading}</h2>
						<p className="mt-4 text-[var(--color-ink-muted)]">{copy.body}</p>
					</div>
					<Link href="/book" className="text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-bright)]">
						Find your club →
					</Link>
				</div>

				<div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					{open.map((club, i) => (
						<Link
							key={club.id}
							href={`/book?club=${club.slug}`}
							className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-[28px] border border-[var(--color-line)] transition-colors hover:border-[var(--color-primary)]"
						>
							<Image
								src={`/images/${club.image}`}
								alt={club.title}
								fill
								sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
								className="object-cover transition-transform duration-700 group-hover:scale-[1.05]"
							/>
							<span className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
							<span className="absolute left-5 top-5 font-mono text-[0.7rem] font-bold text-white/70">{String(i + 1).padStart(2, '0')}</span>
							<span className="relative block p-6">
								<span className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.22em] text-[var(--color-primary)]">
									{club.courtCount} courts · {club.sports.map((s) => sportOf(s).label).join(' + ')}
								</span>
								<span className="heading-display mt-1 block text-3xl text-white">{club.name}</span>
								{club.address ? <span className="mt-1 block text-sm text-white/65">{club.address}</span> : null}
								{club.hours ? <span className="mt-3 block text-xs text-white/50">{club.hours}</span> : null}
							</span>
						</Link>
					))}
				</div>
			</div>
		</section>
	);
}
