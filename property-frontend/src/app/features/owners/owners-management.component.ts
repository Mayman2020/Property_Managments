import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { TablePagerComponent } from '../../shared/components/table-pager/table-pager.component';
import { FilterBarComponent, FilterSpec } from '../../shared/components/filter-bar/filter-bar.component';
import { ExportColumn, TableExportToolbarComponent } from '../../shared/components/table-export-toolbar/table-export-toolbar.component';
import { Owner, OwnerService, ownerDisplayName } from '../../core/services/owner.service';
import { Property, PropertyService } from '../../core/services/property.service';
import { AuthService } from '../../core/services/auth.service';
import { SnackService } from '../../core/services/snack.service';
import { DeleteConfirmService } from '../../core/services/delete-confirm.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { OwnerDialogComponent, OwnerDialogData } from './owner-dialog.component';
import { OwnerLinkUserDialogComponent, OwnerLinkUserDialogData } from './owner-link-user-dialog.component';

@Component({
  selector: 'app-owners-management',
  standalone: true,
  imports: [
    NgFor, NgIf,
    TranslateModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule,
    PageHeaderComponent, EmptyStateComponent, TablePagerComponent, FilterBarComponent, TableExportToolbarComponent
  ],
  template: `
    <div class="app-page">
      <app-page-header
        [title]="'OWNERS.TITLE' | translate"
        [subtitle]="'OWNERS.SUBTITLE' | translate"
        [breadcrumbs]="[
          { label: ('NAV.DASHBOARD' | translate), route: '/admin/dashboard' },
          { label: ('OWNERS.TITLE' | translate) }
        ]">
        <button mat-flat-button class="navy-btn" type="button" (click)="openDialog(null)">
          <mat-icon>add</mat-icon>
          {{ 'OWNERS.ADD' | translate }}
        </button>
      </app-page-header>

      <div class="loading-center" *ngIf="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <app-empty-state
        *ngIf="!loading && owners.length === 0 && !hasFiltersBar()"
        icon="person_pin"
        [title]="'OWNERS.EMPTY_TITLE' | translate"
        [message]="'OWNERS.EMPTY_MSG' | translate">
      </app-empty-state>

      <div class="app-card table-card directory-table-card" *ngIf="!loading && (owners.length > 0 || hasFiltersBar())">
        <div class="estate-table-toolbar directory-toolbar">
          <div class="directory-toolbar-top">
            <div class="directory-search">
              <mat-icon>search</mat-icon>
              <input [value]="searchTerm" (input)="onSearch($any($event.target).value)" [placeholder]="'ACTIONS.SEARCH' | translate">
            </div>
            <app-filter-bar *ngIf="pageFilters.length" [filters]="pageFilters" [filterValues]="filterValues" (filtersChange)="onFilterBarChange($event)"></app-filter-bar>
            <button mat-icon-button class="clear-filters-btn" (click)="clearFiltersFromBar()" *ngIf="hasFiltersBar()" [matTooltip]="'ACTIONS.CLEAR_FILTERS' | translate">
              <mat-icon>filter_alt_off</mat-icon>
            </button>
            <app-table-export-toolbar
              permissionKey="owners"
              [title]="'OWNERS.TITLE' | translate"
              fileName="owners"
              [columns]="exportColumns"
              [rows]="filteredOwners">
            </app-table-export-toolbar>
          </div>
        </div>
        <div class="app-table-wrap">
          <table class="app-data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{{ 'OWNERS.NAME_COL' | translate }}</th>
                <th>{{ 'OWNERS.NATIONAL_ID' | translate }}</th>
                <th>{{ 'OWNERS.PHONE' | translate }}</th>
                <th>{{ 'OWNERS.EMAIL' | translate }}</th>
                <th>{{ 'OWNERS.PORTAL_LOGIN' | translate }}</th>
                <th>{{ 'COMMON.ACTIVE' | translate }}</th>
                <th>{{ 'REQUEST_LIST.ACTIONS' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let o of pagedOwners">
                <td>{{ o.id }}</td>
                <td>
                  <div class="owner-name-cell">
                    <img *ngIf="o.profileImageUrl" [src]="o.profileImageUrl" class="owner-avatar" alt="">
                    <span class="avatar-placeholder" *ngIf="!o.profileImageUrl">
                      {{ ownerLabel(o).charAt(0).toUpperCase() }}
                    </span>
                    <strong>{{ ownerLabel(o) }}</strong>
                  </div>
                </td>
                <td>{{ o.nationalId || '--' }}</td>
                <td>{{ o.phone || '--' }}</td>
                <td>{{ o.email || '--' }}</td>
                <td>
                  <span class="badge" [class.badge-success]="ownerPortalLoginActive(o)" [class.badge-muted]="!ownerPortalLoginActive(o)">
                    <mat-icon>{{ ownerPortalLoginActive(o) ? 'check_circle' : 'cancel' }}</mat-icon>
                    {{ (ownerPortalLoginActive(o) ? 'COMMON.ACTIVE' : 'COMMON.INACTIVE') | translate }}
                  </span>
                </td>
                <td>
                  <span class="badge" [class.badge-success]="ownerRowEffectiveActive(o)" [class.badge-muted]="!ownerRowEffectiveActive(o)">
                    <mat-icon>{{ ownerRowEffectiveActive(o) ? 'check_circle' : 'cancel' }}</mat-icon>
                    {{ (ownerRowEffectiveActive(o) ? 'COMMON.ACTIVE' : 'COMMON.INACTIVE') | translate }}
                  </span>
                </td>
                <td class="actions-cell">
                  <button class="app-icon-btn accent" type="button" (click)="openView(o)" [matTooltip]="'ACTIONS.VIEW' | translate">
                    <mat-icon>visibility</mat-icon>
                  </button>
                  <button class="app-icon-btn" type="button" (click)="openDialog(o)" [matTooltip]="'ACTIONS.EDIT' | translate">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button class="app-icon-btn" type="button" (click)="openLinkUser(o)" [matTooltip]="'OWNERS.LINK_USER_TITLE' | translate">
                    <mat-icon>link</mat-icon>
                  </button>
                  <button class="app-icon-btn danger" type="button" *ngIf="isSuperAdmin" (click)="remove(o)" [matTooltip]="'ACTIONS.DELETE' | translate">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </tr>
              <tr *ngIf="filteredOwners.length === 0">
                <td colspan="8" class="empty-row">{{ 'COMMON.NO_DATA' | translate }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <app-table-pager
          [length]="filteredOwners.length"
          [pageSize]="pageSize"
          [pageIndex]="pageIndex"
          (pageIndexChange)="pageIndex = $event">
        </app-table-pager>
      </div>
    </div>
  `,
  styles: [`
    .navy-btn { background: var(--navy-800) !important; color: white !important; }
    .badge { display: inline-flex; align-items: center; gap: 4px; font-size: 0.78rem; padding: 2px 8px; border-radius: 12px; font-weight: 500; }
    .badge mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .badge-success { background: #e8f5e9; color: #2e7d32; }
    .badge-muted { background: #f5f5f5; color: #9e9e9e; }
    .actions-cell { display: flex; gap: 4px; align-items: center; }
    .app-icon-btn.danger mat-icon { color: var(--error, #d32f2f); }
    .loading-center { display: flex; justify-content: center; padding: 48px; }
    .owner-name-cell { display: flex; align-items: center; gap: 10px; }
    .owner-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 1px solid var(--line); flex-shrink: 0; }
    .avatar-placeholder { width: 36px; height: 36px; border-radius: 50%; background: var(--navy-800); color: white; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; font-weight: 700; flex-shrink: 0; }
  `]
})
export class OwnersManagementComponent implements OnInit {
  owners: Owner[] = [];
  properties: Property[] = [];
  filterPropertyId: number | null = null;
  searchTerm = '';
  pageFilters: FilterSpec[] = [];
  loading = true;
  readonly pageSize = 10;
  pageIndex = 0;

  constructor(
    private readonly svc: OwnerService,
    private readonly propertySvc: PropertyService,
    private readonly dialog: MatDialog,
    private readonly snack: SnackService,
    private readonly deleteConfirm: DeleteConfirmService,
    private readonly i18n: I18nService,
    readonly auth: AuthService
  ) {}

  get isSuperAdmin(): boolean { return this.auth.isSuperAdmin(); }

  ownerLabel(o: Owner): string {
    return ownerDisplayName(o, this.i18n.currentLang);
  }

  /** Portal login allowed: flag on + linked user + that user account active in Users. */
  ownerPortalLoginActive(o: Owner): boolean {
    return !!(o.portalAccess && o.userId && o.linkedUserActive);
  }

  /**
   * Shown in «نشط»: owner record must be active; if portal access is on, linked user must exist and be active
   * (matches disabling the user in Users — no more «نشط» while portal shows غير نشط).
   */
  ownerRowEffectiveActive(o: Owner): boolean {
    if (!o.active) return false;
    if (o.portalAccess) {
      if (!o.userId) return false;
      return !!o.linkedUserActive;
    }
    return true;
  }

  get pagedOwners(): Owner[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredOwners.slice(start, start + this.pageSize);
  }

  get filteredOwners(): Owner[] {
    const q = this.searchTerm.trim().toLowerCase();
    if (!q) return this.owners;
    return this.owners.filter((owner) =>
      this.ownerLabel(owner).toLowerCase().includes(q) ||
      (owner.email ?? '').toLowerCase().includes(q) ||
      (owner.phone ?? '').toLowerCase().includes(q) ||
      (owner.nationalId ?? '').toLowerCase().includes(q)
    );
  }

  get exportColumns(): ExportColumn<Owner>[] {
    return [
      { header: '#', value: 'id' },
      { header: this.i18n.instant('OWNERS.NAME_COL'), value: (row) => this.ownerLabel(row) },
      { header: this.i18n.instant('OWNERS.NATIONAL_ID'), value: (row) => row.nationalId || '-' },
      { header: this.i18n.instant('OWNERS.PHONE'), value: (row) => row.phone || '-' },
      { header: this.i18n.instant('OWNERS.EMAIL'), value: (row) => row.email || '-' },
      { header: this.i18n.instant('OWNERS.PORTAL_LOGIN'), value: (row) => this.i18n.instant(this.ownerPortalLoginActive(row) ? 'COMMON.ACTIVE' : 'COMMON.INACTIVE') },
      { header: this.i18n.instant('COMMON.ACTIVE'), value: (row) => this.i18n.instant(this.ownerRowEffectiveActive(row) ? 'COMMON.ACTIVE' : 'COMMON.INACTIVE') }
    ];
  }

  ngOnInit(): void {
    this.loadProperties();
  }

  private load(): void {
    this.loading = true;
    this.svc.getAll(0, 500, this.filterPropertyId).subscribe({
      next: (res) => { this.owners = res.data?.content ?? []; this.loading = false; },
      error: () => { this.owners = []; this.loading = false; }
    });
  }

  private loadProperties(): void {
    this.propertySvc.getAll(0, 500).subscribe({
      next: (res) => {
        this.properties = res.data?.content ?? [];
        if (this.properties.length === 1) {
          this.filterPropertyId = this.properties[0].id;
        }
        this.setupFilters();
        this.load();
      },
      error: () => {
        this.properties = [];
        this.setupFilters();
        this.load();
      }
    });
  }

  private setupFilters(): void {
    this.pageFilters = this.properties.length > 1 ? [
      {
        key: 'filterPropertyId',
        label: 'REQUEST_FORM.PROPERTY',
        type: 'select',
        options: this.properties.map((p) => ({
          value: p.id,
          label: this.i18n.currentLang === 'ar' ? (p.propertyNameAr || p.propertyName) : (p.propertyNameEn || p.propertyName)
        }))
      }
    ] : [];
  }

  onFilterBarChange(values: any): void {
    if (values?.filterPropertyId !== undefined) {
      this.filterPropertyId = values.filterPropertyId;
      this.pageIndex = 0;
      this.load();
    }
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.pageIndex = 0;
  }

  clearFiltersFromBar(): void {
    this.searchTerm = '';
    this.filterPropertyId = this.properties.length === 1 ? this.properties[0].id : null;
    this.pageIndex = 0;
    this.load();
  }

  hasFiltersBar(): boolean {
    return !!(this.searchTerm || (this.properties.length > 1 && this.filterPropertyId !== null));
  }

  get filterValues(): Record<string, unknown> {
    return {
      filterPropertyId: this.filterPropertyId
    };
  }

  openDialog(owner: Owner | null): void {
    this.dialog.open<OwnerDialogComponent, OwnerDialogData, Owner | null>(
      OwnerDialogComponent,
      { data: { owner, readOnly: false }, width: '560px', maxHeight: '95vh', panelClass: 'app-dialog-panel' }
    ).afterClosed().subscribe(result => {
      if (result) this.load();
    });
  }

  openView(owner: Owner): void {
    this.svc.getById(owner.id).subscribe({
      next: (res) => {
        const o = res.data;
        if (!o) return;
        this.dialog.open<OwnerDialogComponent, OwnerDialogData, Owner | null>(OwnerDialogComponent, {
          data: { owner: o, readOnly: true },
          width: '560px',
          maxHeight: '95vh',
          panelClass: 'app-dialog-panel'
        });
      },
      error: () => this.snack.error(this.i18n.instant('COMMON.ERROR'))
    });
  }

  openLinkUser(owner: Owner): void {
    this.dialog.open<OwnerLinkUserDialogComponent, OwnerLinkUserDialogData, Owner | null>(
      OwnerLinkUserDialogComponent,
      { data: { owner }, width: '500px' }
    ).afterClosed().subscribe(result => {
      if (result !== undefined && result !== null) this.load();
    });
  }

  remove(owner: Owner): void {
    this.deleteConfirm.openDeleteConfirm({
      messageKey: 'OWNERS.CONFIRM_DELETE',
      messageParams: { name: this.ownerLabel(owner) }
    }).subscribe((ok) => {
      if (!ok) return;
      this.svc.delete(owner.id).subscribe({
        next: () => { this.snack.success(this.i18n.instant('OWNERS.DELETE_SUCCESS')); this.load(); },
        error: (err: Error) => this.deleteConfirm.handleDeleteError(err, this.snack)
      });
    });
  }
}
