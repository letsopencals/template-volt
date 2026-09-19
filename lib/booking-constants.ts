// Training flow (staff-led, with coach selection + group capacity) — the ported
// clinic multi-step flow.
export const BOOKING_STEPS = ['when', 'who', 'extras', 'questions', 'details', 'payment'] as const;
export type BookingStep = (typeof BOOKING_STEPS)[number];

export const STEP_LABELS: Record<BookingStep, string> = {
	when: 'When',
	who: 'Coach',
	extras: 'Extras',
	questions: 'Details',
	details: 'Your details',
	payment: 'Payment',
};

// Court-rental flow (Self-rule product, no staff). Court + time + duration are
// chosen on the grid before this flow starts, so it opens on "extras".
export const COURT_STEPS = ['court', 'extras', 'questions', 'details', 'payment'] as const;
export type CourtStep = (typeof COURT_STEPS)[number];

export const COURT_STEP_LABELS: Record<CourtStep, string> = {
	court: 'Court',
	extras: 'Extras',
	questions: 'Details',
	details: 'Your details',
	payment: 'Payment',
};
