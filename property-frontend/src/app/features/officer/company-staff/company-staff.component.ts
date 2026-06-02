import { DialogTitleCloseDirective } from './../../../shared/directives/dialog-title-close.directive';
import { Component, Inject, OnInit } from '@angular/core';
import { NgFor, NgIf, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { DEFAULT_TABLE_PAGE_SIZE, paginatedSlice } from '../../../core/utils/pagination.util';
import { CompanyStaffService, CompanyOfficer } from '../../../core/services/company-staff.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DeleteConfirmService } from '../../../core/services/delete-confirm.service';
import { AddOfficerDialogComponent } from './add-officer-dialog.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-reassign-officer-dialog',
  standalone: true,
  imports: [TranslateModule, NgFor, FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatSelectModule, DialogTitleCloseDirective],
  template: `
    <h2 mat-dialog-title>{{ ('INLINE_TEXT.TRANSFER_OFFICER_TASKS' | translate) }}</h2>
    <mat-dialog-content class="reassign-body">
      <p>
        {{ ('INLINE_TEXT.THIS_OFFICER_HAS_ASSIGNED_MAINTENANCE_REQUESTS_CHOOSE_A' | translate) }}
      </p>
      <mat-form-field appearance="outline" class="full">
        <mat-label>{{ ('INLINE_TEXT.REPLACEMENT_OFFICER' | translate) }}</mat-label>
        <mat-select [(ngModel)]="replacementId">
          <mat-option *ngFor="let officer of data.officers" [value]="officer.id">
            {{ displayName(officer) }}
          </mat-option>
        </mat-select>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>{{ ('INLINE_TEXT.CANCEL' | translate) }}</button>
      <button mat-flat-button type="button" [disabled]="!replacementId" (click)="confirm()">
        {{ ('INLINE_TEXT.TRANSFER_DELETE' | translate) }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .reassign-body { min-width: min(420px, 82vw); }
    .reassign-body p { color: var(--text-muted); margin: 0 0 16px; line-height: 1.7; }
    .full { width: 100%; }
  `]
})
class ReassignOfficerDialogComponent {
  replacementId: number | null = null;

  constructor(
    private readonly dialogRef: MatDialogRef<ReassignOfficerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { officers: CompanyOfficer[]; isAr: boolean }
  ) {}

  displayName(o: CompanyOfficer): string {
    const ar = (o.fullNameAr ?? '').trim();
    const en = (o.fullNameEn ?? '').trim();
    const def = (o.fullName ?? '').trim();
    return this.data.isAr ? (ar || en || def) : (en || ar || def);
  }

  confirm(): void {
    if (this.replacementId) {
      this.dialogRef.close(this.replacementId);
    }
  }
}

@Component({
  selector: 'app-company-staff',
  standalone: true,
  imports: [
    NgFor, NgIf, NgClass,
    FormsModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule, MatDialogModule,
    PageHeaderComponent,
    TablePagerComponent,
    TranslateModule
  ],
  template: `
    <div class="app-page company-staff-page">
      <app-page-header
        [eyebrow]="('INLINE_TEXT.MAINTENANCE_TEAM' | translate)"
        [title]="('INLINE_TEXT.MY_COMPANY_STAFF' | translate)"
        [subtitle]="('INLINE_TEXT.MANAGE_YOUR_COMPANY_MAINTENANCE_OFFICERS' | translate)"
        [breadcrumbs]="[
          { label: ('INLINE_TEXT.SCHEDULE' | translate), route: '/officer/schedule' },
          { label: ('INLINE_TEXT.COMPANY_STAFF' | translate) }
        ]"
        [showBack]="true">
        <button mat-flat-button type="button" (click)="openAddDialog()">
          <mat-icon>person_add</mat-icon>
          {{ ('INLINE_TEXT.ADD_OFFICER' | translate) }}
        </button>
      </app-page-header>

      <div *ngIf="loading" class="loading-wrap">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div class="app-empty-state" *ngIf="!loading && officers.length === 0">
        <span class="material-icons empty-icon">group_off</span>
        <h4>{{ ('INLINE_TEXT.NO_OFFICERS_REGISTERED_YET' | translate) }}</h4>
        <p>{{ ('INLINE_TEXT.CLICK_ADD_OFFICER_TO_REGISTER_A_NEW_MAINTENANCE_OFFICER' | translate) }}</p>
      </div>

      <section class="app-card table-card" *ngIf="!loading && officers.length > 0">
        <div class="estate-table-toolbar">
          <label class="estate-search-inline">
            <span class="material-icons">search</span>
            <input [(ngModel)]="searchQuery" (ngModelChange)="pageIndex = 0" [placeholder]="('INLINE_TEXT.SEARCH_OFFICER' | translate)" />
          </label>
          <span class="staff-count">{{ filtered.length }} {{ ('INLINE_TEXT.OFFICER_S' | translate) }}</span>
        </div>
        <div class="app-table-wrap">
          <table class="app-data-table">
            <thead>
              <tr>
                <th>{{ ('INLINE_TEXT.OFFICER' | translate) }}</th>
                <th>{{ ('INLINE_TEXT.EMAIL' | translate) }}</th>
                <th>{{ ('INLINE_TEXT.PHONE' | translate) }}</th>
                <th>{{ ('INLINE_TEXT.STATUS' | translate) }}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let o of pagedFiltered">
                <td>
                  <div class="officer-cell">
                    <div class="officer-avatar" [style.background-image]="o.profileImageUrl ? 'url(' + o.profileImageUrl + ')' : null">
                      <span *ngIf="!o.profileImageUrl" class="material-icons">person</span>
                    </div>
                    <div>
                      <strong>{{ displayName(o) }}</strong>
                      <span class="unit-info">{{ ('INLINE_TEXT.MAINTENANCE_OFFICER' | translate) }}</span>
                    </div>
                  </div>
                </td>
                <td>{{ o.email }}</td>
                <td>{{ o.phone || '—' }}</td>
                <td>
                  <span class="status-chip" [ngClass]="o.active ? 'chip-success' : 'chip-danger'">
                    {{ o.active ? (('INLINE_TEXT.ACTIVE' | translate)) : (('INLINE_TEXT.INACTIVE' | translate)) }}
                  </span>
                </td>
                <td>
                  <div class="row-actions">
                    <button mat-icon-button type="button"
                      [matTooltip]="o.active ? (('INLINE_TEXT.DEACTIVATE' | translate)) : (('INLINE_TEXT.ACTIVATE' | translate))"
                      (click)="toggleActive(o)"
                      [disabled]="actionId === o.id">
                      <mat-icon>{{ o.active ? 'toggle_on' : 'toggle_off' }}</mat-icon>
                    </button>
                    <button mat-icon-button type="button"
                      [matTooltip]="('INLINE_TEXT.EDIT_OFFICER' | translate)"
                      (click)="openEditDialog(o)"
                      [disabled]="actionId === o.id">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button type="button" color="warn"
                      [matTooltip]="('INLINE_TEXT.DELETE_OFFICER' | translate)"
                      (click)="remove(o)"
                      [disabled]="actionId === o.id">
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <app-table-pager
          [length]="filtered.length"
          [pageSize]="pageSize"
          [pageIndex]="pageIndex"
          (pageIndexChange)="pageIndex = $event">
        </app-table-pager>
      </section>
    </div>
  `,
  styles: [`
    .company-staff-page { }
    .loading-wrap { display: flex; justify-content: center; padding: 64px; }
    .staff-count { color: var(--text-muted); font-size: 0.85rem; }
    .officer-cell { display: flex; align-items: center; gap: 12px; }
    .officer-avatar {
      width: 40px; height: 40px; border-radius: 50%;
      background: var(--paper-2); display: grid; place-items: center;
      background-size: cover; background-position: center; flex-shrink: 0;
    }
    .officer-avatar .material-icons { color: var(--text-muted); font-size: 22px; }
    .officer-cell strong { display: block; font-size: 0.9rem; }
    .unit-info { color: var(--text-muted); font-size: 0.78rem; }
    .status-chip.chip-success {
      color: #137333;
      background: rgba(19, 115, 51, 0.12);
      border-color: rgba(19, 115, 51, 0.24);
    }
    .status-chip.chip-danger {
      color: #b3261e;
      background: rgba(179, 38, 30, 0.12);
      border-color: rgba(179, 38, 30, 0.24);
    }
    .row-actions { display: flex; gap: 4px; justify-content: flex-end; }
    .estate-table-toolbar { display: flex; align-items: center; gap: 12px; padding: 12px 16px; flex-wrap: wrap; }
    .app-empty-state { text-align: center; padding: 64px 24px; }
    .empty-icon { font-size: 56px; color: var(--text-subtle); }
  `]
})
export class CompanyStaffComponent implements OnInit {
  officers: CompanyOfficer[] = [];
  loading = false;
  actionId: number | null = null;
  searchQuery = '';
  readonly pageSize = DEFAULT_TABLE_PAGE_SIZE;
  pageIndex = 0;

  constructor(
    private readonly staffSvc: CompanyStaffService,
    private readonly snack: SnackService,
    readonly i18n: I18nService,
    private readonly deleteConfirm: DeleteConfirmService,
    private readonly dialog: MatDialog
  ) {}

  get isAr(): boolean { return this.i18n.currentLang === 'ar'; }

  get filtered(): CompanyOfficer[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.officers;
    return this.officers.filter(o =>
      (o.fullName ?? '').toLowerCase().includes(q) ||
      (o.fullNameAr ?? '').toLowerCase().includes(q) ||
      (o.fullNameEn ?? '').toLowerCase().includes(q) ||
      (o.email ?? '').toLowerCase().includes(q) ||
      (o.phone ?? '').toLowerCase().includes(q)
    );
  }

  get pagedFiltered(): CompanyOfficer[] {
    return paginatedSlice(this.filtered, this.pageIndex, this.pageSize);
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.staffSvc.listMyOfficers().subscribe({
      next: (res) => { this.officers = res.data ?? []; this.pageIndex = 0; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  displayName(o: CompanyOfficer): string {
    const ar = (o.fullNameAr ?? '').trim();
    const en = (o.fullNameEn ?? '').trim();
    const def = (o.fullName ?? '').trim();
    return this.isAr ? (ar || en || def) : (en || ar || def);
  }

  openAddDialog(): void {
    this.dialog.open(AddOfficerDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      panelClass: 'app-dialog-panel',
      data: {}
    }).afterClosed().subscribe((created: CompanyOfficer | null | undefined) => {
      if (created) {
        this.officers = [...this.officers, created];
        this.snack.success(this.i18n.instant('INLINE_TEXT.OFFICER_ADDED_SUCCESSFULLY'));
      }
    });
  }

  openEditDialog(o: CompanyOfficer): void {
    this.dialog.open(AddOfficerDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      panelClass: 'app-dialog-panel',
      data: { officer: o }
    }).afterClosed().subscribe((updated: CompanyOfficer | null | undefined) => {
      if (!updated) return;
      const idx = this.officers.findIndex(x => x.id === updated.id);
      if (idx >= 0) {
        this.officers[idx] = updated;
        this.officers = [...this.officers];
      }
      this.snack.success(this.i18n.instant('INLINE_TEXT.OFFICER_UPDATED_SUCCESSFULLY'));
    });
  }

  toggleActive(o: CompanyOfficer): void {
    this.actionId = o.id;
    this.staffSvc.toggleActive(o.id).subscribe({
      next: (res) => {
        this.actionId = null;
        if (res.data) {
          const idx = this.officers.findIndex(x => x.id === o.id);
          if (idx >= 0) this.officers[idx] = res.data!;
          this.officers = [...this.officers];
        }
      },
      error: () => { this.actionId = null; }
    });
  }

  remove(o: CompanyOfficer): void {
    const name = this.displayName(o);
    const msg = this.isAr
      ? `هل تريد حذف الموظف "${name}"؟ لن يتمكن من تسجيل الدخول بعد الحذف.`
      : `Delete officer "${name}"? They will no longer be able to log in.`;
    this.deleteConfirm.openDeleteConfirm({ message: msg }).subscribe(ok => {
      if (!ok) return;
      this.actionId = o.id;
      this.staffSvc.deleteOfficer(o.id).subscribe({
        next: () => {
          this.officers = this.officers.filter(x => x.id !== o.id);
          this.actionId = null;
          this.snack.success(this.i18n.instant('INLINE_TEXT.OFFICER_DELETED'));
        },
        error: (err: unknown) => {
          this.actionId = null;
          if (this.isReassignRequired(err)) {
            this.openReassignAndDelete(o);
            return;
          }
          this.deleteConfirm.handleDeleteError(err as Error, this.snack);
        }
      });
    });
  }

  private isReassignRequired(err: unknown): boolean {
    return (err as { error?: { errorCode?: string } })?.error?.errorCode === 'STAFF_REASSIGN_REQUIRED';
  }

  private openReassignAndDelete(o: CompanyOfficer): void {
    const replacements = this.officers.filter(x => x.id !== o.id && x.active);
    if (replacements.length === 0) {
      this.snack.error(this.i18n.instant('INLINE_TEXT.NO_OTHER_ACTIVE_OFFICER_IS_AVAILABLE_FOR_TASK_TRANSFER'));
      return;
    }
    this.dialog.open(ReassignOfficerDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      data: { officers: replacements, isAr: this.isAr }
    }).afterClosed().subscribe((replacementId: number | null | undefined) => {
      if (!replacementId) return;
      this.actionId = o.id;
      this.staffSvc.deleteOfficer(o.id, replacementId).subscribe({
        next: () => {
          this.officers = this.officers.filter(x => x.id !== o.id);
          this.actionId = null;
          this.snack.success(this.i18n.instant('INLINE_TEXT.TASKS_TRANSFERRED_AND_OFFICER_DELETED'));
        },
        error: (err: unknown) => {
          this.actionId = null;
          this.deleteConfirm.handleDeleteError(err as Error, this.snack);
        }
      });
    });
  }
}
