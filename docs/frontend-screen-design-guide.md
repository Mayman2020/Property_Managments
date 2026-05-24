# Frontend Screen Design Guide

Use this guide whenever a prompt says: "same screen concept", "same contracts screen design", "نفس تصميم الشاشات", or "اعمل الشاشة بنفس ستايل السيستم".

Primary references:
- Contracts dashboard: `property-frontend/src/app/features/contracts/contracts-dashboard/contracts-dashboard.component.html`
- Contracts dashboard styles: `property-frontend/src/app/features/contracts/contracts-dashboard/contracts-dashboard.component.scss`
- Contracts list: `property-frontend/src/app/features/contracts/contract-list/contract-list.component.html`
- Contracts list styles: `property-frontend/src/app/features/contracts/contract-list/contract-list.component.scss`
- Dialog guide: `docs/frontend-dialog-style-guide.md`

## Page Skeleton

Every operational screen should start with:

```html
<div class="app-page feature-page">
  <app-page-header
    [eyebrow]="..."
    [title]="..."
    [subtitle]="..."
    [breadcrumbs]="[...]"
    [showBack]="true">
    <button mat-flat-button>
      <mat-icon>add</mat-icon>
      Primary action
    </button>
  </app-page-header>

  <!-- loading / empty / content -->
</div>
```

Rules:
- Use `app-page` as the outer wrapper.
- Use `app-page-header` for title, subtitle, breadcrumbs, and primary actions.
- Put the main create/add action inside the header slot.
- Use Material icons inside action buttons. Do not use text-only icon substitutes.
- Keep pages operational and data-first. Avoid landing-page hero layouts inside admin/work portals.

## Dashboard Pattern

Use the contracts dashboard as the main reference.

Dashboard layout:
- Header with one primary action.
- Loading spinner centered when data is loading.
- KPI grid at the top.
- Quick actions row underneath.
- Alert/attention sections after KPIs, such as expiring contracts or pending approvals.

KPI cards:

```html
<div class="kpi-grid">
  <article class="kpi-card kpi-clickable" routerLink="...">
    <div class="kpi-icon-wrap">
      <mat-icon>description</mat-icon>
    </div>
    <div class="kpi-body">
      <div class="kpi-value">12</div>
      <div class="kpi-label">Active Contracts</div>
    </div>
  </article>
</div>
```

Rules:
- KPI cards must have a clear icon, number, and label.
- Clickable cards use `routerLink` and `matTooltip` when the target is not obvious.
- Use domain icons:
  - Contracts: `description`, `edit_note`, `event_upcoming`
  - Maintenance: `engineering`, `construction`, `pending_actions`
  - Finance: `payments`, `receipt_long`, `paid`
  - Properties/units: `apartment`, `home_work`
  - People: `person`, `groups`, `badge`
  - Alerts: `schedule`, `warning`, `notifications`

## List/Table Pattern

Use the contracts list as the main reference.

List layout:
- Optional mini stats row above the table.
- One `app-card table-card` around toolbar + table + pager.
- Toolbar uses search, selects, clear-filter icon button, and filter chips.
- Table uses `app-table-wrap` and `app-data-table`.
- Row action should be icon-first: view arrow, edit icon, delete icon, toggle icon.

```html
<section class="app-card table-card">
  <div class="estate-table-toolbar">
    <label class="estate-search-inline">
      <span class="material-icons">search</span>
      <input placeholder="Search...">
    </label>
  </div>

  <div class="app-table-wrap">
    <table class="app-data-table">
      ...
    </table>
  </div>

  <app-table-pager ...></app-table-pager>
</section>
```

Rules:
- Search goes first in the toolbar.
- Filters sit next to search or below in a tray if there are many.
- Clear filters uses an icon button with `filter_alt_off`.
- Use `table-arrow` for view/details navigation, with RTL-aware arrow icons.
- Empty table row should say `COMMON.NO_DATA`; full empty state should use `app-empty-state`.

## Buttons And Icons

General button rules:
- Primary create/action: `mat-flat-button` with icon.
- Secondary/cancel: `mat-stroked-button`.
- Row actions: `mat-icon-button` with `matTooltip`.
- Destructive: icon `delete_outline`, `color="warn"` where Angular Material is already used.
- Toggle active/inactive: `toggle_on` / `toggle_off`.
- Edit: `edit`.
- View/open: `open_in_new` or arrow icon.

Avoid:
- Duplicate primary buttons on the same screen.
- Text-only action buttons when a known Material icon exists.
- Oversized marketing buttons in admin screens.

## Status Chips

Use `status-chip` for all status labels.

Recommended meanings:
- Active/success: green.
- Inactive/error/cancelled: red.
- Draft/neutral: gray.
- Pending/waiting: amber or purple depending on domain.
- Info/type labels: blue or neutral.

Examples:

```html
<span class="status-chip chip-success">Active</span>
<span class="status-chip chip-danger">Inactive</span>
<span class="status-chip chip-info">Maintenance</span>
```

For filter chips, follow contracts list:
- `estate-filter-btn`
- status-specific classes such as `fs-active`, `fs-draft`, `fs-expired`, `fs-terminated`, `fs-renewed`, `fs-suspended`
- active chip has stronger fill and ring.

## Notifications Pattern

Notifications are part of the design language, not an afterthought.

References:
- Topbar dropdown: `property-frontend/src/app/layout/topbar/topbar.component.html`
- Notification icon mapping: `property-frontend/src/app/layout/topbar/topbar.component.ts`
- Shared notification display helpers:
  - `property-frontend/src/app/core/utils/notification-display.util.ts`
  - `property-frontend/src/app/core/utils/notification-navigation.util.ts`

Rules:
- Every workflow action that needs user attention should create a notification in the backend.
- Topbar bell shows unread count and last notifications.
- Notification rows should have:
  - Type icon.
  - Short title.
  - One-line hint/body.
  - Unread visual state.
- Notification click should mark as read and navigate to the relevant inbox or target screen.
- Use type-driven icons:
  - `REQUEST` -> `construction`
  - `RENT`, `PAYMENT`, `FINANCE` -> `payments`
  - `CONTRACT` -> `description`
  - `UNIT` -> `apartment`
  - `TENANT` -> `person`
  - `OWNER` -> `account_balance`
  - fallback -> `notifications`

When adding a new workflow, also ask:
- Who should be notified?
- What is the notification type?
- What route should clicking it open?
- Does the target user see it in admin, tenant, officer, or employee inbox?

## Operational UX Rules

- Always provide loading state with `mat-spinner`.
- Always provide an empty state for zero data.
- After create/update/delete, update the list locally or reload predictably.
- Use snack messages for success/failure.
- If an action cannot complete because of related data, guide the user to the next step instead of showing a generic error.
  - Example: deleting a maintenance officer with assigned requests should prompt for reassignment.
- Do not hide important workflow states inside raw text; use status chips, banners, or alert sections.

## Prompt To Use With An AI

Use this exact style prompt:

```text
نفذ الشاشة/التعديل بنفس Design System بتاع المشروع.
اقرأ واتبع:
- docs/frontend-screen-design-guide.md
- docs/frontend-dialog-style-guide.md لو فيه دايالوج

خلي شاشة العقود هي المرجع: app-page-header، app-card/table-card، status-chip، Material icons، toolbar/search/filter chips، KPI cards لو Dashboard.
لو فيه workflow أو action يحتاج متابعة، ضيف/راجع الإشعارات: notification type، recipients، route عند الضغط، unread state.
متعملش landing/hero، دي شاشة تشغيلية عملية.
```

Short version:

```text
اعملها بنفس كونسبت شاشات العقود والدايالوجات. اتبع docs/frontend-screen-design-guide.md و docs/frontend-dialog-style-guide.md، وراجع الإشعارات لو الفلو محتاج تنبيه.
```
