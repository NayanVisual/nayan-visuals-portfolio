# Nayan Visuals — Video Editor Portfolio

Static single-page portfolio site. No build tooling, no package.json, no framework.

## Structure

- `index.html` — single-page portfolio (hero, services, portfolio grid, about, contact, footer)
- `data/portfolio.json` — video entries fetched at runtime via `fetch()`; edit directly to add/remove/change
- `js/script.js` — portfolio load/filter/render, lightbox, WhatsApp contact, scroll animations, nav
- `css/style.css` — all styles (responsive, lightbox, animations, dark theme)

## Key facts

- **No build step, test runner, linter, or package manager.** Open `index.html` in a browser.
- Portfolio data lives in `data/portfolio.json`. Changes take effect after commit + push (GitHub Pages deploys from `main`).
- Video entries use YouTube embed URLs (`videoUrl`). Thumbnails auto-extracted via `getYoutubeId()` → `img.youtube.com/vi/{id}/hqdefault.jpg`.
- Categories (4): `gameplay`, `video`, `color-grading`, `motion-graphics`. The filter buttons display as "Gaming Edit", "Cinematic Video", "Color Grading", "Social Media" — the `data-filter` attribute maps to the category value.
- Contact form opens `https://wa.me/919678057024?text=...` with name/email/subject/message — no backend.
- Scroll animations: `IntersectionObserver` toggles `.visible` on `.hidden` elements (staggered delay).
- Lightbox embeds YouTube iframe; clears `src` on close to stop playback.
- Fonts: Google Poppins + Font Awesome 6.5.1 via CDN.
- Profile photo: `profile.jpg` in root (circular in About section).

## Deployment

- **Two remotes** — push `main` to both after every change:
  - `origin` → Amannotop/nayan-visuals-portfolio
  - `nayanvisual` → NayanVisual/nayan-visuals-portfolio
- GitHub Pages serves `main` branch root. `.nojekyll` disables Jekyll processing.
- If NayanVisual Pages errors (new account), delete & recreate Pages via GitHub API.
