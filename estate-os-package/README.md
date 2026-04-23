# Estate OS — Angular Style Pack

This folder mirrors `property-frontend/src/` paths. **Drag-drop overwrite** these files
onto the matching paths in your Angular project.

## What changed
- **styles.scss** — new tokens (Estate OS palette, spacing, radii, shadows, motion)
- **index.html** — swapped fonts (Instrument Serif + Inter + Geist Mono)
- **layout/sidebar** — dark glass rail with amber accent pill
- **layout/topbar** — minimal, airy top bar
- **layout/main-layout** — background and shell refinements
- **auth/login** — editorial split-hero with ambient glow
- **features/dashboard** — new KPI cards, sections, status strip
- **shared/components/page-header** — typography-forward header
- **shared/components/stat-card** — refined card
- **shared/components/status-badge / empty-state** — unchanged behavior, new look via tokens

## After pasting
1. `npm install` (no new deps needed — pure CSS/HTML)
2. `npm start`
3. Hard-refresh the browser to clear cached CSS

## Rollback
Everything is isolated to `.scss` and template files. Keep a `git diff` before pasting.
