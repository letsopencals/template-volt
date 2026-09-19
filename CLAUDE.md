# Template conventions

This is a Next.js 15 (App Router) / React 19 storefront template built on
`@opencals/storefront-sdk`. These conventions keep the template fast and
maintainable. They apply to every template in `templates/` — this file is meant
to be copied across them (only the template name / branding differs).

## Data fetching

**RSC-first.** Read data on the server and pass it down. Do NOT fetch cacheable
data in a `useEffect` on the client.

- Server reads go through `lib/server-data.ts` — `React.cache()`-wrapped helpers
  (`getStoreSettings`, `getProducts`, `getProduct`) that call the SDK directly.
  `React.cache` dedupes calls within a request. Never import `lib/server-data.ts`
  from a `'use client'` file.
- `app/layout.tsx` is an async Server Component: it fetches store settings once
  and seeds `<Providers initialSettings={...}>`. `SettingsProvider` takes the
  value as a prop — it does not fetch.
- Read-only pages (e.g. `app/services/page.tsx`) are async Server Components that
  fetch with `lib/server-data.ts` and hand the result to a small `'use client'`
  child as `initialProducts` / `initialProduct`.

**Client reads use SWR, seeded with server data.** For data that genuinely needs
to live on the client (filtering, availability, add-ons, cart), use `useSWR`
against the template's own `/api/*` routes, with `fallbackData` set to the
server-rendered value so there's no loading flash on first paint.

- Shared fetcher: `lib/fetcher.ts`.
- Build the SWR key from its inputs and pass `null` when not ready (e.g. no date
  picked yet) so nothing fetches prematurely. Multiple SWR hooks run in parallel
  — never chain fetches through sequential `useEffect`s.
- `revalidateOnFocus: false` unless you specifically want refocus revalidation.

The `/api/*` routes stay: they are the client/SWR data source and call the SDK
server-side via the `@/lib/opencals` side-effect import.

## Components & files

**Pages compose; components implement.** A `page.tsx` should be: data fetching
(RSC) + layout/composition + wiring. Presentational blocks and interactive
widgets live in `components/`.

- Guideline: any `page.tsx` over ~150 lines, or one that defines a section /
  widget component, gets decomposed into `components/`.
- Group `components/` by route/domain: `components/booking/`, `components/account/`,
  `components/services/`, `components/home/`; shared primitives in `components/ui/`.
  Co-locate a route's private components under a matching subfolder
  (e.g. `components/account/appointment-detail/`).

**Never define a component inside another component** — it remounts on every
parent render. Define at module scope (or a separate file). Module-scope sibling
helpers below a page are fine.

**Use the shared UI primitives — don't hand-style buttons/inputs inline.**
- `components/ui/button.tsx` — `<Button variant size fullWidth>`. Variants:
  `primary` (teal CTA), `outline`, `ghost`. Sizes `sm|md|lg`. All buttons are
  pills (`rounded-full`) — this is the canonical shape; don't reintroduce square
  or ad-hoc-radius buttons. Clarity has a single accent (teal / `--color-primary`),
  so there is no separate `accent` variant. Pass only layout classes (`mt-*`,
  `flex-1`, `gap-*`) via `className`; color/padding/rounding/tracking come from the
  variant/size.
- `components/ui/input.tsx` — `<Input>` / `<Textarea>` for text fields.
- Leave genuinely-different controls inline: selection/toggle chips with an
  active/selected state (staff/time/day/variant/location/department pickers, step
  indicator/progress, pagination), destructive buttons (no destructive variant),
  `<select>`, checkboxes/radios, icon-only controls, and navigation rendered as
  `next/link` `<Link>` (Button renders a `<button>` and has no anchor mode).

**Hooks are single-concern.** Split multi-purpose hooks so each has one
responsibility and independent dependencies (see `hooks/use-checkout-questions.ts`,
`hooks/use-payment-providers.ts`, `hooks/use-cart-expiry.ts`, split out of the
booking flow / cart context). A large hook may remain as a thin orchestrator that
composes the smaller ones (`hooks/use-booking-flow.ts`).

## Re-render hygiene

- **Memoize context provider values** with `useMemo` — an inline `value={{...}}`
  object makes every consumer re-render on each provider render. All contexts here
  (`settings`, `location`, `timezone`, `cart`) follow this.
- Hoist static objects (framer-motion `initial`/`animate`/`transition`, default
  non-primitive props) to module-level `const`s instead of recreating them inline.
- `React.memo` leaf components that take stable props and render often
  (e.g. `components/booking/step-indicator.tsx`).
- Prefer a ternary (`cond ? <x/> : null`) over `cond && <x/>` for conditional
  rendering, to avoid accidentally rendering `0`/`''`.

## Bundle

- Load heavy / below-the-fold components with `next/dynamic`. Stripe is loaded
  this way in `components/booking/booking-view.tsx` (`PaymentStep`, `ssr: false`)
  so it isn't in the initial bundle.
- Import directly from module paths; avoid barrel/index re-export files that pull
  in more than you use.

## VOLT — two booking surfaces (padel & squash club)

This template ships **two distinct booking flows** over one store, because the club
sells two different kinds of thing:

**1. Court rentals — the court grid (`/book`).** Each court is its own product with
no staff and `maxAttendees: 1` (the Opencals *Self* conflict rule → each court is an
independent resource; booking any duration on a court blocks only that court). Courts
also have `allowCustomDuration` (30-min base, up to 2h), so a booking is a positive
multiple of the base and the backend prices it `ceil(bookedMs/baseMs) × price`.
- Data: `app/api/courts/[collection]/grid/route.ts` fans out one
  `getCurrentAvailabilities` call **per court** (parallel) for the selected date and
  returns base slots keyed by court. `hooks/use-court-grid.ts` composes them into a
  time axis + computes duration options from *consecutive* free base slots.
- UI: `components/booking/court-grid.tsx` (rows = courts, cols = time) →
  `duration-popover.tsx` → `hooks/use-court-booking.ts` runs a no-staff flow
  (extras → questions → details → payment). Orchestrated by
  `components/booking/court-booking-view.tsx` (sport toggle + `day-stepper.tsx`).
  There is **no `staffMemberId`** anywhere in this flow — the court product is the
  resource.

**2. Coached training — the classic flow (`/training` → `/booking/[slug]`).** Training
products are assigned to real coach staff (*Staff* conflict rule) and may have group
capacity (`maxAttendees > 1`). This reuses the shared multi-step flow verbatim:
`components/booking/booking-view.tsx` + `hooks/use-booking-flow.ts` (when → coach →
extras → questions → details → payment), with `staff-selector.tsx` repurposed as the
coach selector and `time-slots.tsx` surfacing "X spots left" from the slot's
`attendees`/`maxAttendees`.

When touching booking code, know which surface a file belongs to: `court-*` /
`use-court-*` / `day-stepper` / `duration-popover` are court-only; `booking-view` /
`use-booking-flow` / `staff-selector` are training-only; `addons-selector`,
`questions-form`, `details-step`, `payment-step` are **shared** by both.

## Verifying changes

- `npm run build` must pass. In the route summary, read-only pages should be `○`
  (static) or `ƒ` (dynamic) Server Components — not shipped as pure client pages.
- Smoke test: the court grid (`/book`) paints per-court availability and a cell click
  opens the duration popover → books that court; the training catalog (`/training`)
  filters by sport/format and the flow (`/booking/[slug]`) books a coached session
  with a chosen coach and shows group spots-left.
