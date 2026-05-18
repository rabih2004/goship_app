# Imagery — sourcing & licensing

All photos used in GoShip's UI are sourced from [Unsplash](https://unsplash.com) under the [Unsplash License](https://unsplash.com/license) — free for commercial use, no attribution required (though we credit anyway in good faith).

Drop each image into `public/img/` with the **exact filename** listed below. The app references these paths by name; if a file is missing, the affected hero/empty-state renders the placeholder background only — nothing breaks.

---

## Files needed

| Filename | Recommended dimensions | Used on | Suggested Unsplash URL |
|---|---|---|---|
| `hero-shipping.jpg` | 1920 × 1080 | Marketing landing hero, sign-in/up split-screen | <https://unsplash.com/photos/yiSizDqlYTo> (container vessel at port) |
| `hero-forwarders.jpg` | 1600 × 600 | `/providers/forwarders` index hero strip | <https://unsplash.com/photos/Zfsx_4cWdFc> (port terminal stacks) |
| `hero-coworkers.jpg` | 1600 × 600 | `/providers/coworkers` index hero strip | <https://unsplash.com/photos/CrxBC8VrDqs> (truck loading at warehouse) |
| `hero-customs.jpg` | 1600 × 600 | `/providers/customs` index hero strip | <https://unsplash.com/photos/lq5gibmCfXg> (paperwork / clipboard at port) |

To download: open each URL → click **Download free** → rename → drop into `public/img/`.

---

## SVG illustrations (ship with the repo)

These are vector illustrations rendered inline by the `<EmptyState>` component — no external assets needed. They live at:

- `public/img/illustration-empty-rfq.svg` — generated; shown when an inbox/list is empty.
- `public/img/illustration-empty-bookings.svg` — generated; shown when a bookings list is empty.

---

## Brand assets

These live in `public/brand/` (separate from imagery so they're easy to swap during a white-label):

| Filename | Status | Used on |
|---|---|---|
| `logo.svg` | ✅ ships with repo (fallback) | Every header — wordmark |
| `logo-mark.svg` | ✅ ships with repo (fallback) | Compact UI, app icon source |
| `logo.png` | Optional — user-provided PNG override | Header (preferred over .svg if present) |
| `logo-mark.png` | Optional | Compact UI override |
| `logo-light.png` | Optional | Footer / dark backgrounds |

Drop a PNG with matching filename to override the SVG. The `<BrandLogo>` component picks PNG-first when both exist.

---

## Favicon

- `src/app/icon.svg` — Next 16 auto-generates favicon at every size from this single SVG. No PNG variants needed.

---

## License compliance

This repo's `LICENSE` (not yet committed) does NOT cover the Unsplash imagery — those photos are licensed individually under Unsplash's terms. Should you ever fork or commercialize this codebase, the Unsplash photos remain usable under their existing license; no extra action is needed.

For attribution best-practice (encouraged, not required):
- Credit the photographer in your About / Credits page
- Link back to the Unsplash photo URL

The original photographer is visible at each Unsplash URL above.
