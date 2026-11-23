# Space Training — Style Guide

A learn-first lesson for elementary students, shown before the Classification
game. The brief: minimum astronomy, maximum clarity, over a real photo of
Subaru's home on Mauna Kea.

## Art direction

The background is the Mauna Kea night photo (`assets/training-bg.jpg`): domes on
a dark ridge under the Milky Way. The photo stays fixed and ambient; the sky is
dark enough that content reads over it.

Only the end-of-lesson **test** sits on a liquid-glass plate (translucent,
blurred, square, with a specular top edge). Everything else — headings, photos,
captions, the "Remember" note, the finish — floats directly on the sky with no
plate behind it. The whole surface is monochrome.

### Guardrails (explicit)
- No purple→blue gradients; no decorative gradient accents.
- No rounded corners anywhere — `border-radius: 0` throughout.
- No outlines. Nothing carries a border; a plate is set apart only by its glass
  fill and soft shadow. The "Remember" note, the finish block, the chapter
  numbers and the optical/infrared labels have no plate at all — they float as
  text directly on the photo.
- **Colour never signals importance.** Text is one neutral ramp (white →
  grey). Emphasis comes from **size, weight, letter-spacing, position and
  alignment**, never hue. No coloured labels, tags, or keylines.
- No Inter, no emoji-as-icon, no hype copy. Plain short sentences, and no "—"
  or connective hyphens in prose (hyphens survive only inside proper names like
  *Suprime-Cam* or IDs like *Sh 2-209*).
- No three-up equal icon grid. Objects are a photo gallery that reflows; tools
  are full-width rows.

## Typography

Two families, strong contrast between them:

| Role | Family | Notes |
|------|--------|-------|
| Display / headings | **Fraunces** (opt. serif) | warm, characterful; 500 weight |
| Body / UI / labels | **Hanken Grotesk** | humanist sans, friendly for young readers; NOT Inter |

Fallbacks: `Fraunces → Georgia, serif`; `Hanken Grotesk → system-ui, sans-serif`.

### Scale (mobile → desktop, fluid)
- H1 hero: `clamp(34px, 8.5vw, 58px)` / line-height 1.04
- H2 chapter: `clamp(25px, 5vw, 36px)`
- H3 card: 20–25px
- Lead / body: 16–17px / line-height 1.6
- Eyebrow + label: 11–12px, uppercase, letter-spacing .12–.18em, weight 700

Hierarchy recipe (no colour): a heavy wide-tracked uppercase eyebrow sits above
a large serif heading; supporting text drops to the grey tone and regular
weight; key words inside a sentence are set **bold**.

## Colour tokens

A single neutral text ramp plus the glass recipe — no chromatic accents.

```
text
--star #f3f6fa   primary text
--mist #aeb8c6   secondary text
--dim  #7b8694   captions / meta
page   #06090e   base behind the photo

liquid glass (plates, buttons, chips, number badge)
--glass-sheen  135° white highlight gradient (.14 → .03 → .08)
--glass-tint   rgba(10,14,20,.44)        translucent dark body
--glass-edge   rgba(255,255,255,.18)     1px border
--glass-blur   blur(22px) saturate(180%) backdrop filter
--glass-light  inset top highlight + drop shadow (specular float)
```

## Spacing

4px base unit. Allowed steps: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64.
- Plate padding: 16–20px mobile → 18–20px desktop.
- Gap between cards: 16px mobile → 18–20px desktop.
- Section rhythm: 48px top padding mobile → 72px desktop.
- Page gutter: 20px mobile → 28px; content max-width 1040px.

## Layout (mobile-first)

Base styles target a phone; `min-width` queries add columns.
- **≤639px**: one column. Light cards stack; objects one per row; each tool is a
  vertical stack (instrument photo → text → example).
- **≥640px**: objects 2-up; tools become a row (photo | text), example full-width.
- **≥960px**: light cards 2-up side by side; objects 3–4 up by auto-fill; tool
  rows gain a third column for the example image.

Touch targets ≥44px; generous line spacing on small screens.

## End-of-lesson check

Each of the three lessons closes with one multiple-choice question on its own
glass plate ("Quick check"). After an answer: options lock, the correct one
gains a brighter fill, heavier weight and a "Correct" tag; a wrong pick dims and
is tagged "Your pick"; a feedback line states the answer. Right vs wrong is
shown by weight, fill and text only — never colour.

## Motion

- One orchestrated entrance: the hero fades/rises once on load (~600ms).
- Interaction feedback only elsewhere: a plate lifts 2px and its border
  brightens on hover; buttons lift and brighten on hover/focus.
- `prefers-reduced-motion: reduce` → transitions/transforms removed, hero shown
  immediately.
- Visible keyboard focus ring (white) on every link and button.
