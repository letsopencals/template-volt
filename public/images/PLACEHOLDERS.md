# Image placeholders

Drop your own images here to replace the on-screen gradient / initials placeholders.
All paths are relative to `public/images/`. Filenames are referenced from
`lib/site-config.ts` and the home components — keep the names (or update
`site-config.ts` to match your files). Every image has a graceful fallback, so the
site builds and renders cleanly even with none of these present.

## Homepage

| Path | Where it shows | Suggested size |
|------|----------------|----------------|
| `hero/hero-full.jpg` | Full-bleed hero background / video poster | 1200 × 1600 (3:4) or larger |
| `../videos/hero.mp4` | Optional looping hero background video (5–10s, muted, H.264, **faststart**). The homepage auto-detects it (`app/page.tsx`) and upgrades the hero to video; if absent it uses `hero-full.jpg`. | 720p, ≤ ~6 MB |
| `hero/hero-portrait.jpg` | Legacy hero shot (kept for reference) | 1200 × 1600 (3:4) |
| `sports/padel.jpg`, `sports/squash.jpg` | Sport cards on the homepage | 1200 × 1500 (4:5) |
| `gallery/look-1.jpg` … `look-6.jpg` | "Inside VOLT" gallery frames | 1000 × 1400 |
| `about/club.jpg` | Full-width photo band on the About page | 1600 × 900 (16:9) |

## Coaches (/coaches page + homepage teaser)

Filenames match the `coaches[].image` slugs in `lib/site-config.ts`:

- `coaches/marta-ibanez.jpg`
- `coaches/diego-ferrer.jpg`
- `coaches/lena-novak.jpg`
- `coaches/sam-whitfield.jpg`

Portraits look best at **900 × 1200 (3:4), face centered near the top**. Missing
portraits fall back to the coach's initials.

> Court, training and coach photos shown inside the live booking flow come from your
> Opencals store (seeded by the **Padel & Squash / VOLT** preset), not from this folder.
