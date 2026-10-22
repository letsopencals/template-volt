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
		'VOLT Padel & Squash — four clubs in Madrid, Barcelona, Valencia and Málaga, with panoramic padel courts, championship squash and coaching for every level. Book a court or a lesson online in seconds.',
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

	/**
	 * Sports. Each maps a court collection (and a training collection) in the store to a label and colour, so a new
	 * sport (pickleball, tennis…) is one entry here plus its collections in the dashboard. A club only shows the
	 * sports it has courts for.
	 */
	sports: [
		{
			key: 'padel' as const,
			label: 'Padel',
			courtsCollection: 'padel-courts',
			trainingCollection: 'padel-training',
			tagline: 'Glass-walled panoramic courts',
			blurb: 'Panoramic glass-walled doubles courts with LED lighting, plus singles courts for 1-on-1 games. Grab three friends and play.',
			priceHint: 'from €15 / 30 min',
			/** Players per court when it doesn't depend on the court (null: 4 on doubles, 2 on "· Singles" courts) */
			fixedPlayers: null as number | null,
			image: 'sports/padel.jpg',
			accent: '#FF4A1C',
		},
		{
			key: 'squash' as const,
			label: 'Squash',
			courtsCollection: 'squash-courts',
			trainingCollection: 'squash-training',
			tagline: 'Championship glass-back courts',
			blurb: 'Climate-controlled championship squash courts with sprung floors and glass-back viewing, in Madrid and Valencia.',
			priceHint: 'from €12 / 30 min',
			fixedPlayers: 2 as number | null,
			image: 'sports/squash.jpg',
			accent: '#5B93A8',
		},
	],

	/**
	 * Club presentation (photos, a line of copy, hours, phone). The clubs themselves are the store's locations; an
	 * entry here is matched to a location by slug, city or title (case- and accent-insensitive). Locations without
	 * an entry get a photo from `fallbackImages`.
	 */
	clubs: {
		eyebrow: 'Four clubs · One account',
		heading: 'Play wherever\nyou are.',
		body: 'Four VOLT clubs across Spain. Book any court in any club with one account. Your club is remembered, so next time you land straight on its hall.',
		presentation: [
			{ match: ['madrid'], image: 'gallery/look-1.jpg', tagline: 'The flagship. Padel and squash under one roof.', hours: 'Daily 07:00–23:00', phone: '+34 910 555 042' },
			{ match: ['barcelona'], image: 'gallery/look-3.jpg', tagline: 'Eight padel courts, two of them singles.', hours: 'Daily 08:00–23:30', phone: '+34 930 555 017' },
			{ match: ['valencia'], image: 'about/club.jpg', tagline: 'Padel and squash by the Turia gardens.', hours: 'Daily 07:00–23:00', phone: '+34 960 555 230' },
			{ match: ['malaga'], image: 'gallery/look-6.jpg', tagline: 'Padel with sea air, open late.', hours: 'Daily 08:00–23:30', phone: '+34 950 555 088' },
		],
		fallbackImages: ['gallery/look-1.jpg', 'gallery/look-3.jpg', 'about/club.jpg', 'gallery/look-6.jpg', 'gallery/look-5.jpg'],
	},

	/** Hero section on the homepage */
	hero: {
		eyebrow: 'Madrid · Barcelona · Valencia · Málaga',
		heading: ['OWN', 'THE'],
		headingAccent: 'COURT',
		body: 'Four clubs, one account. See every court in your club live, pick a time and play. No phone calls, no third-party apps, no queue.',
		primaryCta: { label: 'Book a Court', href: '/book' },
		secondaryCta: { label: 'Train with a Coach', href: '/training' },
		availabilityChip: { label: 'Live court map', value: 'See every court in your club' },
		backgroundText: 'VOLT',
		/** Big stat overlaid on the hero */
		stats: [
			{ value: '4', label: 'Clubs' },
			{ value: '27', label: 'Courts' },
			{ value: '4', label: 'Coaches' },
		],
	},

	/** "Two ways to play" band — the two booking modes. */
	modes: {
		eyebrow: 'Two ways to play',
		heading: 'Court rentals &\ncoaching, every club.',
		body: 'Book a court by the half-hour and just play, or level up with a certified coach — individually or in a small group.',
		cards: [
			{
				key: 'courts',
				kicker: '01 / RENT',
				title: 'Book a Court',
				body: 'Open your club’s hall live: every court from above, free ones lit. Pick a time, or switch to the grid. Up to two hours, rackets and balls on the spot.',
				cta: { label: 'See the courts', href: '/book' },
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
			{ value: '4', label: 'Clubs' },
			{ value: '27', label: 'Courts' },
			{ value: '4', label: 'Coaches' },
			{ value: '07–23:30', label: 'Open daily' },
		],
	},

	/** Coaches teaser + the /coaches page. Names match the seeded staff. */
	coachesSection: {
		eyebrow: 'The Bench',
		heading: 'Coaches who\nplay to win.',
		body: 'Certified coaches in every club, one obsession: making your game better. Pick your club to see who coaches there, then book them from the training flow.',
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
			{ number: '01', title: 'Pick your club', body: 'Near me, or the one you played last time. We remember it.' },
			{ number: '02', title: 'Choose a time', body: 'Drag the time bar and watch the hall light up with free courts.' },
			{ number: '03', title: 'Take a court', body: 'Book the best free court in one tap, or pick an exact court on the map or grid.' },
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
		body: 'Book a court now. Four clubs, open every day until late.',
		cta: { label: 'Book a Court', href: '/book' },
	},

	/** About page */
	about: {
		heroEyebrow: 'About VOLT',
		heroHeading: ['BUILT FOR', 'PEOPLE WHO'],
		heroHeadingAccent: 'LOVE THE GAME',
		heroBody:
			'A network of modern padel and squash clubs across Spain: pro courts, real coaching, and booking that actually works.',
		storyParagraphs: [
			'VOLT opened in Madrid with one goal: make it effortless to play the sports we love. No hunting for a court on a clunky third-party app, no phone tag with the front desk. Just pro courts and a booking page that shows you exactly what is free, right now.',
			'Today there are four clubs, in Madrid, Barcelona, Valencia and Málaga. Panoramic doubles courts, singles courts for 1-on-1 games, and championship squash in Madrid and Valencia. One account books them all.',
			'Every club has its own coaches, running everything from first-timer intros to advanced match play. Because a great club is not just walls and floors. It is the people who help you get better.',
		],
		bottomCta: 'YOUR COURT IS WAITING',
		bottomCtaBody: 'Book a court or a lesson at the club nearest you.',
	},

	/** Footer */
	footer: {
		description:
			'Padel & squash in Madrid, Barcelona, Valencia and Málaga. One account for every club, and booking that takes seconds.',
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

	/** Contact page (head office; each club's own address and phone come from the clubs list) */
	contact: {
		address: 'Calle del Saque 12\nMadrid, 28045',
		phone: '+34 910 555 042',
		email: 'play@voltpadel.club',
		hours: 'Clubs open daily from 07:00',
	},

	/** Testimonials (homepage) */
	testimonials: [
		{
			quote:
				'Booked a padel court from my phone in about twenty seconds. The hall map shows every court at once, so no more guessing what is free. This is how it should work.',
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
			a: 'Pick your club, a day and how long you want to play. The hall map lights up every free court; tap "Book" for the best one or choose a specific court. Prefer a timetable? Switch to the grid. No phone call needed.',
		},
		{
			q: 'How long can I book a court for?',
			a: 'Courts book in half-hour steps, up to two hours. Pick 60, 90 or 120 minutes on the hall map, or any length on the grid. We only show starts with enough free time on the court.',
		},
		{
			q: 'Can I rent rackets and balls?',
			a: 'Yes. Add premium padel or squash rackets, a fresh set of match balls, towel service, or premium floodlighting as extras when you book — no need to bring your own gear.',
		},
		{
			q: 'Can I play at more than one club?',
			a: 'Yes. One account works at all four clubs. We remember the club you last booked, and you can switch club at any time from the booking page.',
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
