# UI Audit Baseline — Dashboard + Tenants

<!-- QA baseline 2026-05-20: Dashboard + Tenants -->

Authoritative references for Property Management UI consistency audits.

## List screens (Tenants pattern)

```
app-page
  app-page-header [breadcrumbs] [showBack] (backClick)
  .loading-wrap > mat-spinner (when loading)
  app-empty-state (when no data and no active filters)
  section.app-card.directory-table-card
    .estate-table-toolbar.directory-toolbar
      .directory-toolbar-top
        .estate-search-inline
        app-filter-bar
        button.clear-filters-btn (filter_alt_off)
        app-table-export-toolbar (optional)
    .app-table-wrap > table.app-data-table
    app-table-pager [length] [pageSize]=6 [pageIndex] (pageIndexChange)
```

## Dashboard screens (Dashboard pattern)

```
app-page.dashboard-page
  app-page-header [eyebrow] [title] [subtitle]
    select.estate-property-select (property scope, optional)
  .loading-center > mat-spinner
  section.estate-stat-grid
    article.estate-stat-card.{navy|teal|gold|danger|purple}
  embedded tables: app-card + app-data-table (no pager for widget slices)
  inline .card-empty for widget empty slots (not app-empty-state)
```

## Shared tokens

- `property-frontend/src/styles/estate-os-tokens.scss`
- `property-frontend/src/styles.scss`
- `property-frontend/src/styles/admin.filters.scss`

## Status badges

Use `span.status-badge` with `[attr.data-status]` (e.g. `ACTIVE`, `PENDING`, `COMPLETED`).

## Pagination

- Default page size: **6** (match Tenants).
- Component: `app-table-pager` — not `mat-paginator` on admin list screens.
- Show total via pager parent or `PROPERTY_LIST.PAGE_RANGE`-style i18n when server-paged.

## Reference files

| Role | Path |
|------|------|
| Dashboard | `property-frontend/src/app/features/dashboard/dashboard/dashboard.component.html` |
| Tenants | `property-frontend/src/app/features/tenants/tenant-list/tenant-management.component.html` |
