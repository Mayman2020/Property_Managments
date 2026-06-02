import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EstateLovOption, EstateLovSelectComponent } from '../../../shared/components/estate-lov-select/estate-lov-select.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { ExportColumn, TableExportToolbarComponent } from '../../../shared/components/table-export-toolbar/table-export-toolbar.component';
import { TableEntityCellComponent } from '../../../shared/components/table-entity-cell/table-entity-cell.component';
import { TableRowIndexPipe } from '../../../shared/pipes/table-row-index.pipe';
import { Owner, OwnerService, ownerDisplayName } from '../../../core/services/owner.service';
import { Property, PropertyService } from '../../../core/services/property.service';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionService } from '../../../core/services/permission.service';
import { SnackService } from '../../../core/services/snack.service';
import { DeleteConfirmService } from '../../../core/services/delete-confirm.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { OwnerDialogComponent, OwnerDialogData } from '../owner-dialog/owner-dialog.component';
import { OwnerLinkUserDialogComponent, OwnerLinkUserDialogData } from '../owner-link-user-dialog/owner-link-user-dialog.component';
import { ListLoadController } from '../../../shared/utils/list-load.util';

@Component({
  selector: 'app-owners-management',
  standalone: true,
  imports: [
    NgFor, NgIf, FormsModule,
    TranslateModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule,
    PageHeaderComponent, EmptyStateComponent, TablePagerComponent, TableExportToolbarComponent, TableEntityCellComponent, TableRowIndexPipe,
    EstateLovSelectComponent
  ],
  template: `
    <div class="app-page">
      <app-page-header
        [title]="'OWNERS.TITLE' | translate"
        [subtitle]="'OWNERS.SUBTITLE' | translate"
        [breadcrumbs]="[
          { label: ('NAV.DASHBOARD' | translate), route: '/admin/dashboard' },
          { label: ('OWNERS.TITLE' | translate) }
        ]"
        [showBack]="true"
        (backClick)="goBack()">
        <button mat-flat-button class="navy-btn" type="button" (click)="openDialog(null)">
          <mat-icon>add</mat-icon>
          {{ 'OWNERS.ADD' | translate }}
        </button>
      </app-page-header>

      <div class="loading-wrap" *ngIf="listLoad.showInitialSpinner">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <app-empty-state
        *ngIf="listLoad.showSurface && owners.length === 0 && !hasFiltersBar()"
        icon="person_pin"
        [title]="'OWNERS.EMPTY_TITLE' | translate"
        [message]="'OWNERS.EMPTY_MSG' | translate">
      </app-empty-state>

      <div class="app-card table-card directory-table-card app-list-surface"
        [class.is-refreshing]="listLoad.refreshing"
        *ngIf="listLoad.showSurface && (owners.length > 0 || hasFiltersBar())">
        <div class="list-refresh-spinner" *ngIf="listLoad.refreshing"><mat-spinner diameter="32"></mat-spinner></div>
        <div class="estate-table-toolbar directory-toolbar">
          <div class="directory-toolbar-top table-list-toolbar">
            <div class="directory-search">
              <mat-icon>search</mat-icon>
              <input [value]="searchTerm" (input)="onSearch($any($event.target).value)" [placeholder]="'ACTIONS.SEARCH' | translate">
            </div>
            <div class="finance-filter-strip" *ngIf="properties.length > 1">
              <app-estate-lov-select
                [label]="'REQUEST_FORM.PROPERTY'"
                [options]="propertyLovOptions"
                [showAll]="true"
                allLabelKey="COMMON.ALL"
                [(ngModel)]="filterPropertyId"
                (ngModelChange)="onPropertyChange()">
              </app-estate-lov-select>
            </div>
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
                <th class="table-index-col">#</th>
                <th>{{ 'OWNERS.NAME_COL' | translate }}</th>
                <th>{{ 'REQUEST_FORM.PROPERTY' | translate }}</th>
                <th>{{ 'OWNERS.NATIONAL_ID' | translate }}</th>
                <th>{{ 'OWNERS.PHONE' | translate }}</th>
                <th>{{ 'OWNERS.PORTAL_LOGIN' | translate }}</th>
                <th>{{ 'COMMON.ACTIVE' | translate }}</th>
                <th>{{ 'REQUEST_LIST.ACTIONS' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let o of pagedOwners; let i = index">
                <td class="table-index-col">{{ i | tableRowIndex:pageIndex:pageSize }}</td>
                <td>
                  <app-table-entity-cell
                    [title]="ownerLabel(o)"
                    [imageUrl]="o.profileImageUrl"
                    [initial]="ownerLabel(o).charAt(0).toUpperCase()">
                  </app-table-entity-cell>
                </td>
                <td>
                  <span *ngFor="let p of (o.properties || []); let last = last" class="prop-chip">
                    {{ i18n.currentLang === 'ar' ? (p.propertyNameAr || p.propertyNameEn) : (p.propertyNameEn || p.propertyNameAr) }}<ng-container *ngIf="!last">, </ng-container>
                  </span>
                  <span *ngIf="!o.properties || o.properties.length === 0" class="text-muted">--</span>
                </td>
                <td>{{ o.nationalId || '--' }}</td>
                <td>{{ o.phone || '--' }}</td>
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
                  <button class="app-icon-btn danger" type="button" *ngIf="canDeleteOwner()" (click)="remove(o)" [matTooltip]="'ACTIONS.DELETE' | translate">
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
          [length]="totalElements"
          [pageSize]="pageSize"
          [pageIndex]="pageIndex"
          (pageIndexChange)="onPageChange($event)">
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
    .finance-filter-strip { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 8px 12px; border-radius: 12px; background: rgba(255,255,255,0.72); border: 1px solid var(--line-2, #e4d8c8); box-shadow: inset 0 1px 0 rgba(255,255,255,0.7); }
    .finance-filter-strip label { font-size: 12px; font-weight: 600; color: var(--text-muted); white-space: nowrap; }
    .prop-chip { font-size: 0.82rem; color: var(--navy-800); font-weight: 500; }
    .text-muted { color: var(--text-muted); }
  `]
})
export class OwnersManagementComponent implements OnInit {
  owners: Owner[] = [];
  properties: Property[] = [];
  filterPropertyId: number | null = null;
  searchTerm = '';
  listLoad = new ListLoadController();
  readonly pageSize = 5;
  pageIndex = 0;
  totalElements = 0;

  get propertyLovOptions(): EstateLovOption[] {
    return this.properties.map((p) => ({
      value: p.id,
      label: this.propertyLovLabel(p)
    }));
  }

  constructor(
    private readonly svc: OwnerService,
    private readonly propertySvc: PropertyService,
    private readonly dialog: MatDialog,
    private readonly snack: SnackService,
    private readonly deleteConfirm: DeleteConfirmService,
    readonly i18n: I18nService,
    readonly auth: AuthService,
    readonly permissions: PermissionService,
    private readonly location: Location
  ) {}

  goBack(): void {
    this.location.back();
  }

  get isSuperAdmin(): boolean { return this.auth.isSuperAdmin(); }

  canDeleteOwner(): boolean { return this.permissions.can('properties', 'delete'); }

  ownerLabel(o: Owner): string {
    return ownerDisplayName(o, this.i18n.currentLang);
  }

  ownerPortalLoginActive(o: Owner): boolean {
    return !!(o.portalAccess && o.userId && o.linkedUserActive);
  }

  ownerRowEffectiveActive(o: Owner): boolean {
    if (!o.active) return false;
    if (o.portalAccess) {
      if (!o.userId) return false;
      return !!o.linkedUserActive;
    }
    return true;
  }

  get pagedOwners(): Owner[] {
    return this.filteredOwners;
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
    this.listLoad.begin();
    this.svc.getAll(this.pageIndex, this.pageSize, this.filterPropertyId).subscribe({
      next: (res) => {
        this.owners = res.data?.content ?? [];
        this.totalElements = res.data?.totalElements ?? this.owners.length;
        this.listLoad.end();
      },
      error: () => {
        this.owners = [];
        this.totalElements = 0;
        this.listLoad.end();
      }
    });
  }

  onPageChange(index: number): void {
    this.pageIndex = index;
    this.load();
  }

  private loadProperties(): void {
    this.propertySvc.getAll(0, 200).subscribe({
      next: (res) => {
        this.properties = res.data?.content ?? [];
        if (this.properties.length === 1) {
          this.filterPropertyId = this.properties[0].id;
        }
        this.load();
      },
      error: () => {
        this.properties = [];
        this.load();
      }
    });
  }

  onPropertyChange(): void {
    this.pageIndex = 0;
    this.load();
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
    const ar = this.i18n.currentLang === 'ar';
    const name = this.ownerLabel(owner);
    const hasUser = !!owner.userId;
    const baseLine = ar ? `هل تريد حذف المالك "${name}"؟` : `Delete owner "${name}"?`;
    const userLine = hasUser
      ? (this.i18n.instant('INLINE_TEXT.THIS_WILL_ALSO_DELETE_THE_LINKED_OWNER_PORTAL_USER_ACCO'))
      : '';
    const warningLine = this.i18n.instant('INLINE_TEXT.DELETION_WILL_BE_BLOCKED_IF_THEY_ARE_THE_SOLE_OWNER_OF_');
    this.deleteConfirm.openDeleteConfirm({
      message: [baseLine, userLine, warningLine].filter(Boolean).join('\n')
    }).subscribe((ok) => {
      if (!ok) return;
      this.svc.delete(owner.id).subscribe({
        next: () => { this.snack.success(this.i18n.instant('OWNERS.DELETE_SUCCESS')); this.load(); },
        error: (err: Error) => this.deleteConfirm.handleDeleteError(err, this.snack)
      });
    });
  }

  private propertyLovLabel(p: Property): string {
    const name = this.i18n.currentLang === 'ar'
      ? (p.propertyNameAr || p.propertyName)
      : (p.propertyNameEn || p.propertyName);
    return p.propertyCode ? `${p.propertyCode} — ${name}` : name;
  }
}
