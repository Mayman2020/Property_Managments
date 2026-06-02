import { DialogTitleCloseDirective } from './../../../shared/directives/dialog-title-close.directive';
import { Component, Inject, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';

import { EmployeeItem, HrService, LeaveRequestItem } from '../../../core/services/hr.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LookupCacheService } from '../../../core/services/lookup-cache.service';
import { LookupItem, LookupService } from '../../../core/services/lookup.service';
import { PermissionService } from '../../../core/services/permission.service';
import { DeleteConfirmService } from '../../../core/services/delete-confirm.service';

export interface LeaveRequestDialogData {
  employees: EmployeeItem[];
  leave?: LeaveRequestItem | null;
  readOnly?: boolean;
}

function toYmd(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

function parseYmd(value?: string | null): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

@Component({
  selector: 'app-leave-request-dialog',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    ReactiveFormsModule,
    TranslateModule,
    MatDialogModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatIconModule,
    MatTooltipModule, DialogTitleCloseDirective],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon class="dialog-title-icon">event_available</mat-icon>
      {{ titleKey | translate }}
    </h2>

    <mat-dialog-content class="dialog-body">
      <div class="leave-status-row full" *ngIf="data.leave">
        <span class="status-badge" [attr.data-status]="(data.leave.status || 'PENDING').toUpperCase()">
          {{ leaveStatusLabel(data.leave.status) }}
        </span>
        <span class="days-chip">{{ data.leave.daysCount }} {{ 'HR.DAYS_COL' | translate }}</span>
      </div>

      <form [formGroup]="form" class="leave-dialog-form">
        <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
          <mat-label>{{ 'HR.EMPLOYEE_COL' | translate }}</mat-label>
          <mat-select formControlName="employeeId" required>
            <mat-option *ngFor="let emp of data.employees" [value]="emp.id">
              {{ empName(emp) }}
            </mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('employeeId')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
          <mat-label>{{ 'HR.TYPE_COL' | translate }}</mat-label>
          <mat-select formControlName="leaveTypeId" required>
            <mat-option *ngFor="let lt of leaveTypes" [value]="leaveTypeId(lt)">
              {{ lookupName(lt) }}
            </mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('leaveTypeId')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'HR.FROM_COL' | translate }}</mat-label>
          <input matInput [matDatepicker]="startPicker" formControlName="startDate" required>
          <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
          <mat-datepicker #startPicker></mat-datepicker>
          <mat-error *ngIf="form.get('startDate')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'HR.TO_COL' | translate }}</mat-label>
          <input matInput [matDatepicker]="endPicker" formControlName="endDate" required>
          <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
          <mat-datepicker #endPicker></mat-datepicker>
          <mat-error *ngIf="form.get('endDate')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
          <mat-label>{{ 'HR.REASON_LABEL' | translate }}</mat-label>
          <textarea matInput formControlName="reason" rows="3"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic"
                        *ngIf="data.leave?.rejectionReason && (data.leave?.status === 'REJECTED')">
          <mat-label>{{ 'COMMON.REJECTION_REASON' | translate }}</mat-label>
          <textarea matInput [value]="data.leave?.rejectionReason" rows="2" readonly></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-stroked-button type="button" class="btn-dialog-cancel" (click)="ref.close(false)">
        {{ (isReadOnly ? 'ACTIONS.CLOSE' : 'ACTIONS.CANCEL') | translate }}
      </button>

      <button mat-stroked-button type="button" class="btn-dialog-danger" *ngIf="canDelete()" (click)="deleteLeave()" [disabled]="saving">
        <mat-icon>delete_outline</mat-icon>
        {{ 'ACTIONS.DELETE' | translate }}
      </button>

      <button mat-stroked-button type="button" *ngIf="isReadOnly && canEdit()" (click)="startEdit()">
        <mat-icon>edit</mat-icon>
        {{ 'ACTIONS.EDIT' | translate }}
      </button>

      <button mat-flat-button type="button" class="btn-dialog-confirm" *ngIf="!isReadOnly" (click)="submit()" [disabled]="form.invalid || saving">
        <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
        <span *ngIf="!saving">{{ (data.leave ? 'ACTIONS.SAVE' : 'ACTIONS.SUBMIT') | translate }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-title { display: flex; align-items: center; gap: 8px; margin: 0; }
    .dialog-title-icon { color: var(--navy-600); }
    .dialog-body { min-width: min(520px, 94vw); padding-top: 4px; }
    .leave-dialog-form { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .full { grid-column: 1 / -1; }
    .leave-status-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
    .days-chip {
      display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px;
      background: var(--surface-2); border: 1px solid var(--line); font-size: 12px; font-weight: 600;
    }
    .dialog-actions {
      padding: 16px 24px;
      border-top: 1px solid var(--line);
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      flex-wrap: wrap;
    }
    .btn-dialog-confirm { background: var(--navy-800) !important; color: #fff !important; }
    .btn-dialog-danger { color: var(--bad) !important; border-color: rgba(198, 40, 40, 0.35) !important; }
    @media (max-width: 600px) { .leave-dialog-form { grid-template-columns: 1fr; } }
  `]
})
export class LeaveRequestDialogComponent implements OnInit {
  leaveTypes: LookupItem[] = [];
  saving = false;
  editing = false;

  form = this.fb.group({
    employeeId:  [null as number | null, Validators.required],
    leaveTypeId: [null as number | null, Validators.required],
    startDate:   [null as Date | null,   Validators.required],
    endDate:     [null as Date | null,   Validators.required],
    reason:      ['']
  });

  constructor(
    readonly ref: MatDialogRef<LeaveRequestDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) readonly data: LeaveRequestDialogData,
    private readonly fb: FormBuilder,
    private readonly hrService: HrService,
    private readonly snack: SnackService,
    readonly i18n: I18nService,
    private readonly lookups: LookupService,
    private readonly lookupCache: LookupCacheService,
    private readonly permissions: PermissionService,
    private readonly deleteConfirm: DeleteConfirmService
  ) {
    this.patchLeave();
    if (this.isReadOnly) {
      this.form.disable({ emitEvent: false });
    }
  }

  ngOnInit(): void {
    this.lookups.getByType('LEAVE_TYPE').subscribe({
      next: (res) => { this.leaveTypes = (res.data ?? []).filter((item) => item.active); },
      error: () => { this.leaveTypes = []; }
    });
  }

  get isReadOnly(): boolean {
    return !!this.data.readOnly && !this.editing;
  }

  get titleKey(): string {
    if (this.isReadOnly && this.data.leave) return 'HR.LEAVE_DETAIL_TITLE';
    if (this.data.leave) return 'HR.EDIT_LEAVE_REQUEST';
    return 'HR.ADD_LEAVE_REQUEST';
  }

  canEdit(): boolean {
    return !!this.data.leave
      && (this.data.leave.status ?? 'PENDING') === 'PENDING'
      && this.permissions.can('hr', 'edit');
  }

  canDelete(): boolean {
    return !!this.data.leave
      && (this.data.leave.status ?? 'PENDING') === 'PENDING'
      && this.permissions.can('hr', 'delete')
      && !this.editing;
  }

  startEdit(): void {
    this.editing = true;
    this.form.enable({ emitEvent: false });
  }

  empName(emp: EmployeeItem): string {
    const ar = emp.fullNameAr?.trim();
    const en = emp.fullNameEn?.trim();
    const fb = emp.fullName?.trim();
    return this.i18n.currentLang === 'ar' ? (ar || en || fb || `#${emp.id}`) : (en || ar || fb || `#${emp.id}`);
  }

  leaveTypeId(item: LookupItem): number {
    return Number(item.code);
  }

  lookupName(item: LookupItem): string {
    const preferred = this.i18n.currentLang === 'ar' ? item.nameAr : item.nameEn;
    const fallback = this.i18n.currentLang === 'ar' ? item.nameEn : item.nameAr;
    return this.cleanDisplayText(preferred) || this.cleanDisplayText(fallback) || item.code;
  }

  leaveStatusLabel(status?: string | null): string {
    return this.lookupCache.label('LEAVE_STATUS', status || 'PENDING') || status || 'PENDING';
  }

  deleteLeave(): void {
    if (!this.data.leave) return;
    this.deleteConfirm.openDeleteConfirm({
      messageKey: 'DIALOG.DELETE_NAMED',
      messageParams: { name: this.data.leave.employeeName || `#${this.data.leave.id}` }
    }).subscribe((ok) => {
      if (!ok) return;
      this.saving = true;
      this.hrService.deleteLeave(this.data.leave!.id).subscribe({
        next: () => {
          this.saving = false;
          this.snack.success(this.i18n.instant('COMMON.DELETE_SUCCESS'));
          this.ref.close(true);
        },
        error: (err: Error) => {
          this.saving = false;
          this.deleteConfirm.handleDeleteError(err, this.snack);
        }
      });
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const payload = {
      employeeId:  v.employeeId!,
      leaveTypeId: v.leaveTypeId!,
      startDate:   toYmd(v.startDate!),
      endDate:     toYmd(v.endDate!),
      reason:      v.reason || undefined
    };
    this.saving = true;
    const req$ = this.data.leave
      ? this.hrService.updateLeave(this.data.leave.id, payload)
      : this.hrService.createLeave(payload);
    req$.subscribe({
      next: () => {
        this.saving = false;
        this.ref.close(true);
      },
      error: () => {
        this.saving = false;
        this.snack.error(this.i18n.instant('COMMON.ERROR'));
      }
    });
  }

  private patchLeave(): void {
    const leave = this.data.leave;
    if (!leave) return;
    this.form.patchValue({
      employeeId: leave.employeeId ?? null,
      leaveTypeId: leave.leaveTypeId ?? null,
      startDate: parseYmd(leave.startDate),
      endDate: parseYmd(leave.endDate),
      reason: leave.reason ?? ''
    });
  }

  private cleanDisplayText(value?: string | null): string {
    const normalized = (value ?? '').trim();
    if (!normalized || /^[?\s]+$/.test(normalized) || /Ø|Ù|Â/.test(normalized)) return '';
    return normalized;
  }
}
