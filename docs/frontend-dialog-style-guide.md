# Frontend Dialog Style Guide

Use this guide whenever a prompt says: "make the dialog like the tenant dialog", "same dialog concept", or "نفس كونسبت الديالوج".

For full-screen/page/dashboard/list styling, also follow `docs/frontend-screen-design-guide.md`.

Primary references:
- `property-frontend/src/app/features/tenants/tenant-dialog/tenant-dialog.component.ts`
- `property-frontend/src/app/features/officer/company-staff/add-officer-dialog.component.ts`

## Required Structure

Use Angular Material dialog primitives:

```html
<h2 mat-dialog-title class="dialog-title">
  <mat-icon class="dialog-title-icon">groups</mat-icon>
  Dialog Title
</h2>

<mat-dialog-content class="entity-dialog-body">
  <form [formGroup]="form" class="entity-dialog-form">
    <section class="form-section full">
      <!-- identity/media fields first when the entity has profile/civil files -->
    </section>

    <!-- material outline fields in a two-column grid -->
  </form>
</mat-dialog-content>

<div mat-dialog-actions align="end" class="dialog-actions-row">
  <button mat-stroked-button type="button">Cancel</button>
  <button mat-flat-button class="navy-btn" type="button">
    <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
    <span *ngIf="!saving">Save</span>
  </button>
</div>
```

## Layout Rules

- Dialog open config should normally be `width: '720px'`, `maxWidth: '95vw'`, `panelClass: 'app-dialog-panel'`.
- Body gets small top padding: `.entity-dialog-body { padding-top: 4px; }`.
- Form uses a two-column grid:
  - `display: grid`
  - `grid-template-columns: 1fr 1fr`
  - `gap: 10px`
  - `padding-top: 4px`
- Add `.full { grid-column: 1 / -1; }` for full-width fields/sections.
- Collapse to one column under `640px`.
- Use `mat-form-field appearance="outline" subscriptSizing="dynamic"` for text/select/date inputs.
- Use `app-identity-media-fields` first for profile photo + civil ID photo when relevant.

## Visual Rules

- Title is `mat-dialog-title` with a leading Material icon using `.dialog-title-icon`.
- Section separators use `.section-divider` with horizontal lines before/after and uppercase muted label.
- Action row is sticky-feeling visually: border top, `var(--surface-2)` background, right aligned buttons.
- Primary save button uses `.navy-btn`:

```css
.navy-btn { background: var(--navy-800) !important; color: white !important; }
```

- Avoid custom plain `<input>` fields in these dialogs unless there is a strong reason. Prefer Angular Material controls.
- Avoid card-heavy nested panels. Use one clean form grid, sections, and compact notes.

## Common CSS Snippet

```css
.entity-dialog-body { padding-top: 4px; }
.entity-dialog-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding-top: 4px;
}
.full { grid-column: 1 / -1; }
.form-section {
  padding-bottom: 12px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--line, rgba(0,0,0,.08));
}
.section-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 6px 0 2px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: .04em;
}
.section-divider::before,
.section-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--line);
}
.dialog-actions-row {
  padding: 16px 24px;
  border-top: 1px solid var(--line);
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  background: var(--surface-2);
}
.navy-btn { background: var(--navy-800) !important; color: white !important; }
@media (max-width: 640px) {
  .entity-dialog-form { grid-template-columns: 1fr; }
}
```

## Behavior Rules

- Use Reactive Forms for non-trivial create/edit dialogs.
- One component can serve create and edit when fields are the same.
- Save button shows `mat-spinner` while saving.
- On invalid submit, call `form.markAllAsTouched()` and show a concise snack message.
- For file/photo fields, bind URLs through `app-identity-media-fields` instead of hand-rolling upload controls.
