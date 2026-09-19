/**
 * Site configuration — edit this file to customize all branding and copy.
 *
 * Every club name, tagline, contact detail, and homepage line is sourced from
 * here so you can rebrand the entire template in one place. The bookable data
 * (courts, trainings, coaches, prices, availability) comes from the Opencals
 * store — this file is copy + presentation only.
 */

export const siteConfig = {
	name: 'VOLT Padel & Squash Club',
	tagline: 'Book a Court in Seconds',
	description:
		'VOLT Padel & Squash Club — 11 panoramic padel courts and 6 championship squash courts in Madrid, plus coaching for every level. Book your court or a lesson online in seconds.',
	url: 'https://example.com',

	/** Logo rendered as: {text}{accent} */
	logo: { text: 'VOLT', accent: '///' },

	/** Collection slugs in the seeded store (drive the court grid + training catalog). */
	collections: {
		padelCourts: 'padel-courts',
		squashCourts: 'squash-courts',
		padelTraining: 'padel-training',
		squashTraining: 'squash-training',
	},

	/** The two sports — power the sport toggle on the grid and the home sport cards. */
	sports: [
		{
			key: 'padel' as const,
			label: 'Padel',
			courtsCollection: 'padel-courts',
			trainingCollection: 'padel-training',
			courtCount: 11,
			tagline: 'Glass-walled panoramic courts',
			blurb: 'Eleven panoramic padel courts with pro glass walls and LED lighting. Grab three friends and play.',
			priceHint: 'from €15 / 30 min',
			image: 'sports/padel.jpg',
			accent: '#FF4A1C',
		},
		{
			key: 'squash' as const,
			label: 'Squash',
			courtsCollection: 'squash-courts',
			trainingCollection: 'squash-training',
			courtCount: 6,
			tagline: 'Championship glass-back courts',
			blurb: 'Six climate-controlled championship squash courts with sprung floors and glass-back viewing.',
			priceHint: 'from €12 / 30 min',
			image: 'sports/squash.jpg',
			accent: '#5B93A8',
		},
	],

	/** Hero section on the homepage */
	hero: {
		eyebrow: 'Madrid · Padel & Squash',
		heading: ['OWN', 'THE'],
		headingAccent: 'COURT',
		body: 'Seventeen pro courts. Real coaching for every level. Book online in seconds — no phone calls, no third-party apps, no queue.',
		primaryCta: { label: 'Book a Court', href: '/book' },
		secondaryCta: { label: 'Train with a Coach', href: '/training' },
		availabilityChip: { label: 'Next free court', value: 'Today · 18:30' },
		backgroundText: 'VOLT',
		/** Big stat overlaid on the hero */
		stats: [
			{ value: '17', label: 'Pro courts' },
			{ value: '16h', label: 'Open daily' },
			{ value: '4', label: 'Coaches' },
		],
	},

	/** "Two ways to play" band — the two booking modes. */
	modes: {
		eyebrow: 'Two ways to play',
		heading: 'Court rentals &\ncoaching, one club.',
		body: 'Book a court by the half-hour and just play, or level up with a certified coach — individually or in a small group.',
		cards: [
			{
				key: 'courts',
				kicker: '01 / RENT',
				title: 'Book a Court',
				body: 'Pick a sport, a court and a time on a single grid. Rent by the half-hour, up to two hours. Rackets and balls available on the spot.',
				cta: { label: 'Open the court grid', href: '/book' },
			},
			{
				key: 'training',
				kicker: '02 / TRAIN',
				title: 'Train with a Coach',
				body: 'Individual lessons and small-group classes across every level, for padel and squash. Learn from coaches who play at the top of the game.',
				cta: { label: 'Browse training', href: '/training' },
			},
		],
	},

	/** Training levels strip — mirrors the seeded training variants. */
	trainingLevels: {
		eyebrow: 'Every level welcome',
		heading: 'From first serve\nto match point.',
		body: 'Whether you have never held a racket or you are chasing tournament points, there is a session for you.',
		levels: [
			{ code: '00', name: 'Starter', blurb: 'Never played? Learn the basics in a relaxed intro session.' },
			{ code: '01', name: 'Beginner', blurb: 'Build reliable technique and rally with confidence.' },
			{ code: '02', name: 'Intermediate', blurb: 'Sharpen tactics, positioning and shot selection.' },
			{ code: '03', name: 'Advanced', blurb: 'High-intensity drills and match play with our top coaches.' },
		],
	},

	/** Stats band on the homepage */
	statsBand: {
		stats: [
			{ value: '17', label: 'Courts' },
			{ value: '4', label: 'Coaches' },
			{ value: '2', label: 'Sports' },
			{ value: '07–23', label: 'Open daily' },
		],
	},

	/** Coaches teaser + the /coaches page. Names match the seeded staff. */
	coachesSection: {
		eyebrow: 'The Bench',
		heading: 'Coaches who\nplay to win.',
		body: 'Four certified coaches, one obsession: making your game better. Some coach both sports — book any of them from the training flow.',
	},

	coaches: [
		{
			slug: 'marta-ibanez',
			name: 'Marta Ibáñez',
			role: 'Head Coach · Padel & Squash',
			sports: ['Padel', 'Squash'],
			bio: 'Former national padel circuit player. Marta builds relentless, tactical players and coaches both sports at every level.',
			image: 'coaches/marta-ibanez.jpg',
			stats: { experience: '12 yrs', level: 'Pro circuit' },
		},
		{
			slug: 'diego-ferrer',
			name: 'Diego Ferrer',
			role: 'Coach · Padel & Squash',
			sports: ['Padel', 'Squash'],
			bio: 'Technical specialist with a gift for beginners. Diego turns first-timers into confident players fast.',
			image: 'coaches/diego-ferrer.jpg',
			stats: { experience: '8 yrs', level: 'Certified' },
		},
		{
			slug: 'lena-novak',
			name: 'Lena Novak',
			role: 'Padel Coach',
			sports: ['Padel'],
			bio: 'Padel-only coach focused on group dynamics, footwork and the mental game. High-energy sessions, real results.',
			image: 'coaches/lena-novak.jpg',
			stats: { experience: '6 yrs', level: 'Certified' },
		},
		{
			slug: 'sam-whitfield',
			name: 'Sam Whitfield',
			role: 'Squash Coach',
			sports: ['Squash'],
			bio: 'Ex-collegiate squash captain. Sam drills precision, court coverage and killer straight-drive length.',
			image: 'coaches/sam-whitfield.jpg',
			stats: { experience: '9 yrs', level: 'Ex-collegiate' },
		},
	],

	/** Process strip — how booking a court works */
	process: {
		eyebrow: 'How it works',
		heading: 'Court booked in',
		headingAccent: 'four taps.',
		body: 'From choosing a sport to stepping on court — the whole thing takes under a minute, all online.',
		steps: [
			{ number: '01', title: 'Pick your sport', body: 'Padel or squash — flip the toggle on the booking grid.' },
			{ number: '02', title: 'Choose a court & time', body: 'See every court and every open slot on one grid.' },
			{ number: '03', title: 'Set your duration', body: '30, 60, 90 minutes or a full two hours — you decide.' },
			{ number: '04', title: 'Play', body: 'Add rackets or balls, pay, and just turn up ready to go.' },
		],
	},

	/** Gallery / editorial frames (homepage) */
	gallery: {
		eyebrow: 'Inside VOLT',
		heading: 'The Club',
		body: 'Glass-walled courts, a proper pro shop, and a rooftop lounge to cool down after match point.',
		frames: [
			{ image: 'gallery/look-1.jpg', caption: 'Panoramic Padel · Court 3', size: 'tall' as const },
			{ image: 'gallery/look-2.jpg', caption: 'Squash · Championship Court', size: 'square' as const },
			{ image: 'gallery/look-3.jpg', caption: 'Night Play · LED lighting', size: 'wide' as const },
			{ image: 'gallery/look-4.jpg', caption: 'The Pro Shop', size: 'square' as const },
			{ image: 'gallery/look-5.jpg', caption: 'Rooftop Lounge', size: 'tall' as const },
			{ image: 'gallery/look-6.jpg', caption: 'Match Point', size: 'wide' as const },
		],
	},

	/** Booking banner near the foot of the homepage */
	bookingBanner: {
		heading: ['READY TO'],
		headingAccent: 'PLAY?',
		body: 'Book a court now — open every day, 7am to 11pm.',
		cta: { label: 'Book a Court', href: '/book' },
	},

	/** About page */
	about: {
		heroEyebrow: 'About VOLT',
		heroHeading: ['BUILT FOR', 'PEOPLE WHO'],
		heroHeadingAccent: 'LOVE THE GAME',
		heroBody:
			'A modern padel and squash club in the heart of Madrid — pro courts, real coaching, and booking that actually works.',
		storyParagraphs: [
			'VOLT opened with one goal: make it effortless to play the sports we love. No hunting for a court on a clunky third-party app, no phone tag with the front desk — just seventeen pro courts and a booking grid that shows you exactly what is free, right now.',
			'Eleven panoramic padel courts and six championship squash courts sit under one roof, open sixteen hours a day. Whatever your level, whenever you are free, there is a court and a coach waiting.',
			'Our four certified coaches run everything from first-timer intros to advanced match play, for both sports. Because a great club is not just walls and floors — it is the people who help you get better.',
		],
		bottomCta: 'YOUR COURT IS WAITING',
		bottomCtaBody: 'Book a court or a lesson and find out why Madrid plays at VOLT.',
	},

	/** Footer */
	footer: {
		description:
			'Padel & squash in Madrid. Seventeen pro courts, four coaches, and booking that takes seconds. Open every day, 7am–11pm.',
		socials: ['Instagram', 'TikTok', 'Strava'],
		playLinks: [
			{ label: 'Book Padel', href: '/book?sport=padel' },
			{ label: 'Book Squash', href: '/book?sport=squash' },
			{ label: 'Padel Training', href: '/training?sport=padel' },
			{ label: 'Squash Training', href: '/training?sport=squash' },
			{ label: 'Our Coaches', href: '/coaches' },
		],
		companyLinks: [
			{ label: 'About', href: '/about' },
			{ label: 'Coaches', href: '/coaches' },
			{ label: 'Contact', href: '/contact' },
			{ label: 'Book a Court', href: '/book' },
		],
	},

	/** Contact page */
	contact: {
		address: 'Calle del Saque 12\nMadrid, 28045',
		phone: '+34 910 555 042',
		email: 'play@voltpadel.club',
		hours: 'Mon — Sun: 7:00 — 23:00',
	},

	/** Testimonials (homepage) */
	testimonials: [
		{
			quote:
				'Booked a padel court from my phone in about twenty seconds. The grid shows every court at once — no more guessing what is free. This is how it should work.',
			author: 'Alex Moreno',
			role: 'Padel · twice a week',
		},
		{
			quote:
				'The squash courts are genuinely championship quality, and Sam’s coaching took my length game to another level. Best club in the city.',
			author: 'Yuki Tanaka',
			role: 'Squash · Advanced group',
		},
		{
			quote:
				'Started as a total beginner in Diego’s intro class and I am hooked. Friendly, high-energy, and you actually improve fast.',
			author: 'Inés Castro',
			role: 'Padel · Starter session',
		},
	],

	/** Homepage FAQ accordion */
	faqs: [
		{
			q: 'How do I book a court?',
			a: 'Open the booking grid, pick padel or squash, choose a court and a time, and set your duration — 30 minutes up to two hours. The whole thing takes under a minute, no phone call needed.',
		},
		{
			q: 'How long can I book a court for?',
			a: 'Courts book by the half-hour, from 30 minutes up to a full two hours. Pick the duration that suits your session — the grid only shows slots with enough consecutive free time.',
		},
		{
			q: 'Can I rent rackets and balls?',
			a: 'Yes. Add premium padel or squash rackets, a fresh set of match balls, towel service, or premium floodlighting as extras when you book — no need to bring your own gear.',
		},
		{
			q: 'Do I need to be a member?',
			a: 'No membership required. Anyone can book a court or a lesson online and just turn up. Regulars are welcome to create an account to rebook and manage sessions faster.',
		},
		{
			q: 'What if I am a complete beginner?',
			a: 'Perfect — book a Starter session with one of our coaches. It is a relaxed intro that covers the basics of the game, with all equipment provided.',
		},
		{
			q: 'Can I cancel or reschedule?',
			a: 'Yes. Manage any court booking or lesson from your account up to 24 hours before your session — no fees, no fuss.',
		},
	],
};
