# Estate OS — Angular Integration Guide

## Files to replace in `property-frontend/src/`

Copy each file from `estate-os-package/src/` to the **same path** in your project:

```
src/index.html
src/styles.scss
src/app/layout/main-layout/main-layout.component.scss
src/app/layout/sidebar/sidebar.component.scss
src/app/layout/topbar/topbar.component.scss
src/app/features/auth/login/login.component.scss
src/app/features/dashboard/dashboard.component.scss
src/app/shared/components/page-header/page-header.component.ts
```

## Steps

1. **Backup** — commit your current state (`git add . && git commit -m "before estate-os"`)
2. **Copy files** — overwrite each file at the path above
3. **No new dependencies needed** — pure CSS/HTML changes
4. **Start** — `npm start` and hard-refresh (Ctrl+Shift+R)

## What stays the same
- All TypeScript logic (services, guards, routes)
- All templates (.html files) — class names are preserved
- All translations (ar.json / en.json)
- Material Angular imports

## Theme tokens you can tweak later
Edit these in `styles.scss`:
- `--ink-900` → main dark color
- `--amber-500` → brand accent
- `--font-display` → headline serif (currently Instrument Serif)
- `--font-body` → UI sans (currently Inter)
- `--sidebar-width` → sidebar expanded width
- `--radius-lg` → card corner radius

## If something looks off
- Clear browser cache + hard-refresh
- Check browser console for missing fonts (Google Fonts must be reachable)
- Verify `index.html` includes the new font link

## RTL / Arabic
Works automatically — the `[dir='rtl']` selectors flip layouts and borders.
