# Nayan Visuals — Video Editor Portfolio

Static single-page portfolio. **No build tooling, no package.json at root, no framework.** Open `index.html` in a browser.

## Structure

- `index.html` — hero, services, portfolio grid, about, contact, footer
- `data/portfolio.json` — video entries fetched at runtime via `fetch()`; edit directly
- `js/script.js` — load/filter/render, lightbox, WhatsApp contact, scroll animations, nav
- `css/style.css` — responsive, lightbox, animations, dark theme
- `admin/` — Electron desktop app (see below)
- `profile.jpg` — circular photo in About section

## Portfolio Data

- **4 categories**: `gameplay` (→ "Gaming Edit"), `video` (→ "Cinematic Video"), `color-grading` (→ "Color Grading"), `motion-graphics` (→ "Social Media")
- YouTube URLs use embed format. Thumbnails: `img.youtube.com/vi/{id}/hqdefault.jpg`
- The `getYoutubeId()` regex handles all formats: `embed/`, `watch?v=`, `shorts/`, `live/`, `youtu.be/`
- Contact form opens `https://wa.me/919678057024?text=...` — no backend
- Lightbox embeds YouTube iframe; clears `src` on close to stop playback
- Fonts: Google Poppins + Font Awesome 6.5.1 via CDN

## Admin App (`admin/`)

Electron app for CRUD on `data/portfolio.json` + auto-push to GitHub.

- Run: `cd admin && npm install && npm start`
- Auto-pushes to the `nayanvisual` remote on every save/delete/reorder
- Native menus: Cmd/Ctrl+N (new), Cmd/Ctrl+S (save), Cmd/Ctrl+Enter (push), Escape (cancel)
- Drag-to-reorder, search, thumbnail preview
- Build for Windows: `cd admin && npm run build:win` (outputs to `admin/dist/`)
- `admin/start.bat` (Windows) and `admin/start.command` (macOS) for double-click launch
- Smoke tests: `node admin/smoke-test.js` (tests data layer, git integration, YouTube parsing, etc.)

## Deployment

- **Two remotes** — both must be pushed manually after every change:
  - `origin` → Amannotop/nayan-visuals-portfolio
  - `nayanvisual` → NayanVisual/nayan-visuals-portfolio
- **Admin app auto-pushes only to `nayanvisual`**. To sync `origin`, push manually.
- GitHub Pages serves `main` branch root. `.nojekyll` disables Jekyll processing.
- If NayanVisual Pages errors (new account), delete & recreate Pages via GitHub API.

## .gitignore

Ignores `.DS_Store`, `node_modules/`, `admin/dist/`.
