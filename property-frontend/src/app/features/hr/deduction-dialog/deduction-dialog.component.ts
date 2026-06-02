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

import { EmployeeItem, HrService, PayrollDeductionItem } from '../../../core/services/hr.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LookupCacheService } from '../../../core/services/lookup-cache.service';
import { PermissionService } from '../../../core/services/permission.service';
import { DeleteConfirmService } from '../../../core/services/delete-confirm.service';
import { DialogTitleCloseDirective } from '../../../shared/directives/dialog-title-close.directive';

export interface DeductionDialogData {
  employees: EmployeeItem[];
  deduction?: PayrollDeductionItem | null;
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
  selector: 'app-deduction-dialog',
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
    MatTooltipModule,
    DialogTitleCloseDirective
  ],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon class="dialog-title-icon">payments</mat-icon>
      {{ titleKey | translate }}
    </h2>

    <mat-dialog-content class="dialog-body">
      <div class="status-row full" *ngIf="data.deduction">
        <span class="status-badge" [attr.data-status]="(data.deduction.status || 'DRAFT').toUpperCase()">
          {{ statusLabel(data.deduction.status) }}
        </span>
      </div>

      <form [formGroup]="form" class="deduction-dialog-form">
        <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
          <mat-label>{{ 'HR.EMPLOYEE_COL' | translate }}</mat-label>
          <mat-select formControlName="employeeId" required>
            <mat-option *ngFor="let emp of data.employees" [value]="emp.id">
              {{ empName(emp) }}
            </mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('employeeId')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'HR.DEDUCTION_AMOUNT' | translate }}</mat-label>
          <input matInput type="number" formControlName="amount" required min="0.01" step="0.01">
          <mat-error *ngIf="form.get('amount')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
          <mat-error *ngIf="form.get('amount')?.hasError('min')">{{ 'HR.VALIDATION_DEDUCTION_AMOUNT' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'HR.PAYROLL_MONTH' | translate }}</mat-label>
          <input matInput type="month" formControlName="payrollMonth" required>
          <mat-error *ngIf="form.get('payrollMonth')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'HR.DEDUCTION_DATE' | translate }}</mat-label>
          <input matInput [matDatepicker]="datePicker" formControlName="deductionDate" required>
          <mat-datepicker-toggle matSuffix [for]="datePicker"></mat-datepicker-toggle>
          <mat-datepicker #datePicker></mat-datepicker>
          <mat-error *ngIf="form.get('deductionDate')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
          <mat-label>{{ 'HR.DEDUCTION_REASON' | translate }}</mat-label>
          <textarea matInput formControlName="reason" rows="3" required></textarea>
          <mat-error *ngIf="form.get('reason')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic"
                        *ngIf="data.deduction?.reviewNote && data.deduction?.status === 'REJECTED'">
          <mat-label>{{ 'HR.REVIEW_NOTE' | translate }}</mat-label>
          <textarea matInput [value]="data.deduction?.reviewNote" rows="2" readonly></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-stroked-button type="button" class="btn-dialog-cancel" (click)="ref.close(false)">
        {{ (isReadOnly ? 'ACTIONS.CLOSE' : 'ACTIONS.CANCEL') | translate }}
      </button>

      <button mat-stroked-button type="button" class="btn-dialog-danger" *ngIf="canDelete()" (click)="deleteDeduction()" [disabled]="saving">
        <mat-icon>delete_outline</mat-icon>
        {{ 'ACTIONS.DELETE' | translate }}
      </button>

      <button mat-stroked-button type="button" *ngIf="isReadOnly && canEdit()" (click)="startEdit()">
        <mat-icon>edit</mat-icon>
        {{ 'ACTIONS.EDIT' | translate }}
      </button>

      <button mat-flat-button type="button" class="btn-dialog-confirm" *ngIf="!isReadOnly" (click)="submit()" [disabled]="form.invalid || saving">
        <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
        <span *ngIf="!saving">{{ (data.deduction ? 'ACTIONS.SAVE' : 'ACTIONS.SUBMIT') | translate }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-title { display: flex; align-items: center; gap: 8px; margin: 0; }
    .dialog-title-icon { color: var(--navy-600); }
    .dialog-body { min-width: min(520px, 94vw); padding-top: 4px; }
    .deduction-dialog-form { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .full { grid-column: 1 / -1; }
    .status-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
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
    @media (max-width: 600px) { .deduction-dialog-form { grid-template-columns: 1fr; } }
  `]
})
export class DeductionDialogComponent implements OnInit {
  saving = false;
  editing = false;

  form = this.fb.group({
    employeeId:    [null as number | null, Validators.required],
    amount:        [null as number | null, [Validators.required, Validators.min(0.01)]],
    payrollMonth:  ['', [Validators.required, Validators.pattern(/^\d{4}-(0[1-9]|1[0-2])$/)]],
    deductionDate: [null as Date | null, Validators.required],
    reason:        ['', Validators.required]
  });

  constructor(
    readonly ref: MatDialogRef<DeductionDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) readonly data: DeductionDialogData,
    private readonly fb: FormBuilder,
    private readonly hrService: HrService,
    private readonly snack: SnackService,
    readonly i18n: I18nService,
    private readonly lookupCache: LookupCacheService,
    private readonly permissions: PermissionService,
    private readonly deleteConfirm: DeleteConfirmService
  ) {
    this.patchDeduction();
    if (this.isReadOnly) {
      this.form.disable({ emitEvent: false });
    }
  }

  ngOnInit(): void {}

  get isReadOnly(): boolean {
    return !!this.data.readOnly && !this.editing;
  }

  get titleKey(): string {
    if (this.isReadOnly && this.data.deduction) return 'HR.DEDUCTION_DETAIL_TITLE';
    if (this.data.deduction) return 'HR.EDIT_DEDUCTION';
    return 'HR.ADD_DEDUCTION';
  }

  canEdit(): boolean {
    return !!this.data.deduction
      && (this.data.deduction.status ?? 'DRAFT') === 'DRAFT'
      && this.permissions.can('hr', 'edit');
  }

  canDelete(): boolean {
    return !!this.data.deduction
      && (this.data.deduction.status ?? 'DRAFT') === 'DRAFT'
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

  statusLabel(status?: string | null): string {
    return status ? this.i18n.instant(`HR.STATUS.${status}`) : '-';
  }

  deleteDeduction(): void {
    if (!this.data.deduction) return;
    this.deleteConfirm.openDeleteConfirm({
      messageKey: 'DIALOG.DELETE_NAMED',
      messageParams: { name: this.data.deduction.employeeName || `#${this.data.deduction.id}` }
    }).subscribe((ok) => {
      if (!ok) return;
      this.saving = true;
      this.hrService.deleteDeduction(this.data.deduction!.id).subscribe({
        next: () => {
          this.saving = false;
          this.snack.success(this.i18n.instant('HR.DEDUCTION_DELETED'));
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
      employeeId:    v.employeeId!,
      amount:        Number(v.amount),
      reason:        (v.reason || '').trim(),
      deductionDate: toYmd(v.deductionDate!),
      payrollMonth:  v.payrollMonth!
    };
    this.saving = true;
    const req$ = this.data.deduction
      ? this.hrService.updateDeduction(this.data.deduction.id, payload)
      : this.hrService.createDeduction(payload);
    req$.subscribe({
      next: () => {
        this.saving = false;
        this.snack.success(this.i18n.instant(this.data.deduction ? 'HR.DEDUCTION_UPDATED' : 'HR.DEDUCTION_CREATED'));
        this.ref.close(true);
      },
      error: (err: Error) => {
        this.saving = false;
        this.deleteConfirm.handleDeleteError(err, this.snack);
      }
    });
  }

  private patchDeduction(): void {
    const d = this.data.deduction;
    if (!d) return;
    this.form.patchValue({
      employeeId: d.employeeId ?? null,
      amount: d.amount ?? null,
      payrollMonth: d.payrollMonth ?? '',
      deductionDate: parseYmd(d.deductionDate),
      reason: d.reason ?? ''
    });
  }
}
