import { Component, Inject } from '@angular/core';
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
import { TranslateModule } from '@ngx-translate/core';
import { EmployeeItem, HrService } from '../../../core/services/hr.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';

export interface LeaveRequestDialogData {
  employees: EmployeeItem[];
}

interface LeaveType {
  id: number;
  nameAr: string;
  nameEn: string;
}

const LEAVE_TYPES: LeaveType[] = [
  { id: 1, nameAr: 'إجازة سنوية',     nameEn: 'Annual Leave' },
  { id: 2, nameAr: 'إجازة مرضية',     nameEn: 'Sick Leave' },
  { id: 3, nameAr: 'إجازة طارئة',     nameEn: 'Emergency Leave' },
  { id: 4, nameAr: 'إجازة بدون أجر',  nameEn: 'Unpaid Leave' },
  { id: 5, nameAr: 'إجازة حج',        nameEn: 'Hajj Leave' },
  { id: 6, nameAr: 'إجازة وضع',       nameEn: 'Maternity Leave' }
];

function toYmd(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
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
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>{{ 'HR.ADD_LEAVE_REQUEST' | translate }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="leave-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'HR.EMPLOYEE_COL' | translate }}</mat-label>
          <mat-select formControlName="employeeId" required>
            <mat-option *ngFor="let emp of data.employees" [value]="emp.id">
              {{ empName(emp) }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'HR.TYPE_COL' | translate }}</mat-label>
          <mat-select formControlName="leaveTypeId" required>
            <mat-option *ngFor="let lt of leaveTypes" [value]="lt.id">
              {{ i18n.currentLang === 'ar' ? lt.nameAr : lt.nameEn }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <div class="date-row">
          <mat-form-field appearance="outline">
            <mat-label>{{ 'HR.FROM_COL' | translate }}</mat-label>
            <input matInput [matDatepicker]="startPicker" formControlName="startDate" required>
            <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
            <mat-datepicker #startPicker></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>{{ 'HR.TO_COL' | translate }}</mat-label>
            <input matInput [matDatepicker]="endPicker" formControlName="endDate" required>
            <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
            <mat-datepicker #endPicker></mat-datepicker>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'HR.REASON_LABEL' | translate }}</mat-label>
          <textarea matInput formControlName="reason" rows="3"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button mat-dialog-close>{{ 'ACTIONS.CANCEL' | translate }}</button>
      <button mat-flat-button class="navy-btn" [disabled]="form.invalid || saving" (click)="submit()">
        <mat-spinner *ngIf="saving" diameter="18" style="display:inline-block;margin-inline-end:6px"></mat-spinner>
        {{ 'ACTIONS.SUBMIT' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .navy-btn { background: var(--navy-800) !important; color: white !important; }
    .leave-form { display: flex; flex-direction: column; gap: 4px; padding-top: 8px; }
    .full-width { width: 100%; }
    .date-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    mat-dialog-content { min-width: 420px; }
  `]
})
export class LeaveRequestDialogComponent {
  readonly leaveTypes = LEAVE_TYPES;
  saving = false;

  form = this.fb.group({
    employeeId:  [null as number | null, Validators.required],
    leaveTypeId: [null as number | null, Validators.required],
    startDate:   [null as Date | null,   Validators.required],
    endDate:     [null as Date | null,   Validators.required],
    reason:      ['']
  });

  constructor(
    @Inject(MAT_DIALOG_DATA) readonly data: LeaveRequestDialogData,
    private readonly dialogRef: MatDialogRef<LeaveRequestDialogComponent>,
    private readonly fb: FormBuilder,
    private readonly hrService: HrService,
    private readonly snack: SnackService,
    readonly i18n: I18nService
  ) {}

  empName(emp: EmployeeItem): string {
    const ar = emp.fullNameAr?.trim();
    const en = emp.fullNameEn?.trim();
    const fb = emp.fullName?.trim();
    return this.i18n.currentLang === 'ar' ? (ar || en || fb || `#${emp.id}`) : (en || ar || fb || `#${emp.id}`);
  }

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.saving = true;
    this.hrService.createLeave({
      employeeId:  v.employeeId!,
      leaveTypeId: v.leaveTypeId!,
      startDate:   toYmd(v.startDate!),
      endDate:     toYmd(v.endDate!),
      reason:      v.reason || undefined
    }).subscribe({
      next: () => {
        this.saving = false;
        this.dialogRef.close(true);
      },
      error: () => {
        this.saving = false;
        this.snack.error(this.i18n.instant('COMMON.ERROR'));
      }
    });
  }
}
