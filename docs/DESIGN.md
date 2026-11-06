# Acag design language

Extracted from the 12 screenshots in `/design-reference/` and from computed styles on the reference site (https://parley.framer.ai/). Values below were read from the live page unless marked "observed".

The reference supplies visual language only. Its logo, name, copy, illustrations and page composition are not reused.

## Atmosphere

Calm, warm, editorial. Flat paper-coloured surfaces, generous space and a single orange accent, broken up by large painterly image panels. No gradients, glows or glass effects. Warmth comes from the palette, not from decoration.

## Type

| Role | Family | Size / line height | Weight |
|---|---|---|---|
| Display | DM Sans | 52/55px (42/44 tablet, 32/34 mobile) | 500 |
| Emphasis | DM Sans italic | Same as its heading | 400 |
| Heading | DM Sans | 24/26px | 500 |
| Subheading | DM Sans | 18–20/22px | 500 |
| Body | Geist | 16/19px | 400 |
| Small | Geist | 14/17px | 400–500 |
| Caption | Geist | 12/14px | 400 |
| Eyebrow | Geist | 14/14px, orange | 600 |

DM Sans and Geist are both free on Google Fonts, so no substitution is needed. The reference's signature heading move is a second line in muted grey italic. Letter spacing is normal throughout.

## Colour

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#F7F7F4` | Page background |
| `--surface` | `#EEEDE6` | Panels, cards, FAQ rows, footer |
| `--surface-raised` | `#FFFFFF` | Active cards, chat bubbles, inputs |
| `--surface-sunken` | `#EBE8E4` | Hovers, shadow tint |
| `--border` | `#E4E0DD` | Dividers, oversized numerals |
| `--ink` | `#251F19` | Primary text, dark buttons |
| `--ink-2` | `#68615A` | Secondary text |
| `--ink-3` | `#7A7168` | Muted text, italic emphasis (darkened from the reference's `#948B81` to reach 4.5:1 on `--bg`) |
| `--accent` | `#F48D16` | Accent, bullets, chevron tile, eyebrows |
| `--accent-soft` | `#F48D16` at 25–60% | Scatter squares |

Status colours aren't in the reference, so these are ours, tuned to the warm palette: success `#3F7D4E`, warning `#B7791F`, danger `#B5482F`.

## Shape and depth

- Radius scale: 4px (tiles, bullets), 8px (chips, small controls), 12px (cards, buttons, inputs), 24px (feature panels, image panels).
- Dark button shadow-free. Flat surfaces are the default.
- Raised card: `0 12px 16px #EBE8E4`.
- Floating element: `0 2px 4px rgb(0 0 0 / .14), 0 8px 20px rgb(0 0 0 / .1)`.
- Dashed dividers in the footer (observed).

## Layout

- Content width about 1200px with 40px page gutters, 16px on mobile (observed).
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Section headers pair a left heading with a right-aligned paragraph, or sit centred (observed).

## Components

- **Primary button:** dark `--ink` pill-rectangle, 12px radius, Geist 14/500 white label, with an orange 4px-radius tile holding a thin chevron on the left. About 40px high. Hover nudges the chevron right.
- **Secondary button:** `--surface` fill, `--ink` label, same shape, no tile.
- **Input:** white, 1px `--border`, 12px radius, 44px high, `--ink-3` placeholder, `--ink` border on focus.
- **Card:** `--surface` with no border, or white and raised when active.
- **Chip:** 8px radius; selected is white on `--surface`.
- **Nav:** text links separated by small square dots. App sidebar is `--surface` with a soft-filled active row, line icons and small uppercase group labels (observed).
- **Bullets:** small orange squares.
- **Icons:** thin line icons, Lucide at 1.5 stroke.

## Motif

Scattered squares in orange tints, used sparingly as texture. Acag uses its own arrangements, generated from a seed, and never traces the reference's.

## Imagery

Painterly landscapes in warm oranges, reds and creams fill the 24px hero panels. Acag needs its own artwork for these. Until it exists, panels fall back to flat `--surface`, so nothing from the reference ships.
