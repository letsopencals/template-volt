import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Hero } from '@/components/home/hero';
import { ModesBand } from '@/components/home/modes-band';
import { SportsCards } from '@/components/home/sports-cards';
import { TrainingLevels } from '@/components/home/training-levels';
import { CoachesTeaser } from '@/components/home/coaches-teaser';
import { HowItWorks } from '@/components/home/how-it-works';
import { StatsBand } from '@/components/home/stats-band';
import { Gallery } from '@/components/home/gallery';
import { Testimonials } from '@/components/home/testimonials';
import { FaqSection } from '@/components/home/faq-section';
import { CtaBand } from '@/components/home/cta-band';
import { ClubsSection } from '@/components/home/clubs-section';
import { getCatalogue } from '@/lib/server-data';

// Upgrade the hero to a looping video automatically when public/videos/hero.mp4
// exists; otherwise the hero renders the cinematic still. Checked on the server.
const heroVideoSrc = existsSync(join(process.cwd(), 'public/videos/hero.mp4'))
	? '/videos/hero.mp4'
	: null;

export default async function HomePage() {
	const cat = await getCatalogue();
	const stats: Record<string, { courts: number; clubs: number }> = {};
	for (const c of cat.courts) {
		const s = (stats[c.sport] ??= { courts: 0, clubs: 0 });
		s.courts++;
	}
	for (const key of Object.keys(stats)) stats[key]!.clubs = cat.clubs.filter((c) => c.sports.includes(key)).length;

	return (
		<>
			<Hero videoSrc={heroVideoSrc} />
			<ClubsSection clubs={cat.clubs} />
			<ModesBand />
			<SportsCards stats={stats} />
			<TrainingLevels />
			<CoachesTeaser />
			<HowItWorks />
			<StatsBand />
			<Gallery />
			<Testimonials />
			<FaqSection />
			<CtaBand />
		</>
	);
}
