import { DialogTitleCloseDirective } from './../../../shared/directives/dialog-title-close.directive';
﻿import { Component, Inject } from '@angular/core';
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
import { isUserRoleCode } from '../../../core/models/user.model';
import { LookupItem, LookupService } from '../../../core/services/lookup.service';
import { Property } from '../../../core/services/property.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { IdentityMediaFieldsComponent } from '../../../shared/components/identity-media-fields/identity-media-fields.component';
import { AuditTrailComponent } from '../../../shared/components/audit-trail/audit-trail.component';

export interface EmployeeDialogData {
  properties: Property[];
  defaultPropertyId?: number;
  employee?: EmployeeItem | null;
  readOnly?: boolean;
}

function parseYmd(value?: string | null): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

@Component({
  selector: 'app-employee-dialog',
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
    IdentityMediaFieldsComponent,
    AuditTrailComponent, DialogTitleCloseDirective],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon class="dialog-title-icon">badge</mat-icon>
      {{ titleKey | translate }}
    </h2>
    <mat-dialog-content class="dialog-body">
      <form [formGroup]="form" class="employee-dialog-form">
        <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
          <mat-label>{{ 'REQUEST_FORM.PROPERTY' | translate }}</mat-label>
          <mat-select formControlName="propertyId">
            <mat-option *ngFor="let p of data.properties" [value]="p.id">
              {{ i18n.currentLang === 'ar' ? (p.propertyNameAr || p.propertyName) : (p.propertyNameEn || p.propertyName) }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <section class="identity-wrap full" [class.media-readonly]="data.readOnly">
          <app-identity-media-fields
            [compact]="true"
            [(profileImageUrl)]="profileImageUrl"
            [(civilIdImageUrl)]="civilIdImageUrl">
          </app-identity-media-fields>
        </section>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'HR.FULL_NAME_AR' | translate }}</mat-label>
          <input matInput formControlName="fullNameAr" dir="rtl" />
          <mat-error *ngIf="form.get('fullNameAr')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'HR.FULL_NAME_EN' | translate }}</mat-label>
          <input matInput formControlName="fullNameEn" dir="ltr" />
          <mat-error *ngIf="form.get('fullNameEn')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'HR.JOB_TITLE_LABEL' | translate }}</mat-label>
          <mat-select formControlName="jobTitleId">
            <mat-option *ngFor="let title of jobTitles" [value]="title.id">{{ titleName(title) }}</mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('jobTitleId')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'HR.BASIC_SALARY' | translate }}</mat-label>
          <input matInput type="number" min="1" formControlName="basicSalary" />
          <mat-error *ngIf="form.get('basicSalary')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'HR.HIRE_DATE' | translate }}</mat-label>
          <input matInput [matDatepicker]="hirePicker" formControlName="hireDate" />
          <mat-datepicker-toggle matIconSuffix [for]="hirePicker"></mat-datepicker-toggle>
          <mat-datepicker #hirePicker></mat-datepicker>
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'HR.EMAIL' | translate }}</mat-label>
          <input matInput formControlName="email" type="email" />
          <mat-error *ngIf="form.get('email')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
          <mat-error *ngIf="form.get('email')?.hasError('email')">{{ 'COMMON.INVALID_EMAIL' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'HR.NATIONAL_ID' | translate }}</mat-label>
          <input matInput formControlName="nationalId" />
          <mat-error *ngIf="form.get('nationalId')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'HR.PHONE' | translate }}</mat-label>
          <input matInput formControlName="phone" />
          <mat-error *ngIf="form.get('phone')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic" *ngIf="!data.employee && !data.readOnly">
          <mat-label>{{ 'HR.SYSTEM_ROLE' | translate }}</mat-label>
          <mat-select formControlName="systemRole">
            <mat-option [value]="null">{{ 'HR.SYSTEM_ROLE_NONE' | translate }}</mat-option>
            <mat-option value="OWNER">{{ 'ROLE.OWNER' | translate }}</mat-option>
            <mat-option value="GENERAL_MANAGER">{{ 'ROLE.GENERAL_MANAGER' | translate }}</mat-option>
            <mat-option value="ACCOUNTANT">{{ 'ROLE.ACCOUNTANT' | translate }}</mat-option>
            <mat-option value="PROCEDURES_CLERK">{{ 'ROLE.PROCEDURES_CLERK' | translate }}</mat-option>
            <mat-option value="MAINTENANCE_OFFICER_INTERNAL">{{ 'ROLE.MAINTENANCE_OFFICER_INTERNAL' | translate }}</mat-option>
            <mat-option value="MAINTENANCE_OFFICER_COMPANY">{{ 'ROLE.MAINTENANCE_OFFICER_COMPANY' | translate }}</mat-option>
            <mat-option value="MAINTENANCE_COMPANY">{{ 'ROLE.MAINTENANCE_COMPANY' | translate }}</mat-option>
            <mat-option value="PROPERTY_GUARD">{{ 'ROLE.PROPERTY_GUARD' | translate }}</mat-option>
          </mat-select>
          <mat-hint>{{ 'HR.PORTAL_ROLE_HINT' | translate }}</mat-hint>
        </mat-form-field>
      </form>

      <app-audit-trail *ngIf="data.employee" class="full employee-audit"
        [createdAt]="data.employee.createdAt"
        [updatedAt]="data.employee.updatedAt">
      </app-audit-trail>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-stroked-button type="button" class="btn-dialog-cancel" (click)="ref.close(false)">
        {{ (data.readOnly ? 'ACTIONS.CLOSE' : 'ACTIONS.CANCEL') | translate }}
      </button>
      <button mat-flat-button type="button" class="btn-dialog-confirm" *ngIf="!data.readOnly" (click)="save()" [disabled]="saving">
        <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
        <span *ngIf="!saving">{{ 'ACTIONS.SAVE' | translate }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-body { min-width: min(560px, 94vw); padding-top: 4px; }
    .employee-dialog-form { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .full { grid-column: 1 / -1; }
    .identity-wrap {
      padding-bottom: 12px;
      margin-bottom: 4px;
      border-bottom: 1px solid var(--line, rgba(0,0,0,.08));
    }
    .dialog-actions {
      padding: 16px 24px;
      border-top: 1px solid var(--line);
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }
    .btn-dialog-confirm { background: var(--navy-800) !important; color: #fff !important; }
    .employee-audit { margin-top: 14px; }
    .media-readonly { pointer-events: none; opacity: 0.92; }
    @media (max-width: 600px) { .employee-dialog-form { grid-template-columns: 1fr; } }
  `]
})
export class EmployeeDialogComponent {
  saving = false;
  jobTitles: LookupItem[] = [];
  profileImageUrl = '';
  civilIdImageUrl = '';

  get titleKey(): string {
    if (this.data.readOnly && this.data.employee) return 'HR.EMPLOYEE_DETAIL_TITLE';
    return this.data.employee ? 'ACTIONS.EDIT' : 'HR.NEW_EMPLOYEE_TITLE';
  }

  readonly form = this.fb.nonNullable.group({
    propertyId: [this.data.defaultPropertyId ?? ((this.data.properties[0]?.id ?? null) as number | null), Validators.required],
    fullNameAr: ['', Validators.required],
    fullNameEn: ['', Validators.required],
    jobTitleId: [null as number | null, Validators.required],
    basicSalary: [null as number | null, [Validators.required, Validators.min(1)]],
    hireDate: [new Date(), Validators.required],
    phone: ['', Validators.required],
    email: ['', []],
    nationalId: ['', Validators.required],
    systemRole: [null as string | null]
  });

  constructor(
    readonly ref: MatDialogRef<EmployeeDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) readonly data: EmployeeDialogData,
    private readonly fb: FormBuilder,
    private readonly svc: HrService,
    private readonly lookupSvc: LookupService,
    private readonly snack: SnackService,
    readonly i18n: I18nService
  ) {
    this.patchEmployee();
    this.lookupSvc.getByType('JOB_TITLE').subscribe({
      next: (res) => {
        // JOB_TITLE rows whose code is a portal UserRole are for user-access labels; keep ACCOUNTANT (HR + role).
        this.jobTitles = (res.data ?? []).filter(
          (t) => !isUserRoleCode(t.code) || t.code === 'ACCOUNTANT'
        );
        this.patchJobTitle();
      },
      error: () => { this.jobTitles = []; }
    });
    this.form.get('systemRole')?.valueChanges.subscribe(() => this.applyPortalEmailRules());
    this.applyPortalEmailRules();
    if (this.data.readOnly) {
      this.form.disable();
    }
  }

  private patchEmployee(): void {
    const employee = this.data.employee;
    if (!employee) return;
    this.form.patchValue({
      propertyId: employee.propertyId ?? this.data.defaultPropertyId ?? null,
      fullNameAr: employee.fullNameAr ?? employee.fullName ?? '',
      fullNameEn: employee.fullNameEn ?? employee.fullName ?? '',
      basicSalary: employee.basicSalary ?? null,
      hireDate: parseYmd(employee.hireDate) ?? new Date(),
      phone: employee.phone ?? '',
      email: employee.email ?? '',
      nationalId: employee.nationalId ?? ''
    });
    this.profileImageUrl = employee.profileImageUrl ?? '';
    this.civilIdImageUrl = employee.civilIdImageUrl ?? '';
  }

  private patchJobTitle(): void {
    const employee = this.data.employee;
    if (!employee || this.form.get('jobTitleId')?.value) return;
    const match = this.jobTitles.find((title) =>
      title.nameAr === employee.jobTitleAr ||
      title.nameEn === employee.jobTitleEn ||
      title.nameAr === employee.jobTitle ||
      title.nameEn === employee.jobTitle
    );
    if (match) {
      this.form.patchValue({ jobTitleId: match.id });
    }
  }

  private applyPortalEmailRules(): void {
    const emailCtrl = this.form.get('email');
    if (!emailCtrl) return;
    const role = this.form.get('systemRole')?.value;
    if (role) {
      emailCtrl.setValidators([Validators.required, Validators.email]);
    } else {
      emailCtrl.clearValidators();
    }
    emailCtrl.updateValueAndValidity({ emitEvent: false });
  }

  titleName(title: LookupItem): string {
    return this.i18n.currentLang === 'ar' ? title.nameAr : title.nameEn;
  }

  hasRequiredIdentityMedia(): boolean {
    return !!this.profileImageUrl?.trim() && !!this.civilIdImageUrl?.trim();
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      const v = this.form.getRawValue();
      if (v.systemRole && !String(v.email ?? '').trim()) {
        this.snack.error(this.i18n.instant('HR.EMAIL_PORTAL_HINT'));
      } else {
        this.snack.error(this.i18n.instant('COMMON.FILL_REQUIRED_FIELDS'));
      }
      return;
    }
    if (this.saving) return;
    if (!this.hasRequiredIdentityMedia()) {
      this.snack.error(this.i18n.instant('COMMON.ATTACH_PROFILE_AND_CIVIL'));
      return;
    }
    this.saving = true;
    const v = this.form.getRawValue();
    const selectedTitle = this.jobTitles.find((item) => item.id === v.jobTitleId);
    const fullNameAr = v.fullNameAr.trim();
    const fullNameEn = v.fullNameEn.trim();
    const payload = {
      propertyId: v.propertyId!,
      fullName: fullNameAr || fullNameEn,
      fullNameAr,
      fullNameEn,
      jobTitleAr: selectedTitle?.nameAr,
      jobTitleEn: selectedTitle?.nameEn,
      basicSalary: v.basicSalary!,
      hireDate: this.toYmd(v.hireDate),
      nationalId: v.nationalId.trim(),
      profileImageUrl: this.profileImageUrl?.trim() || undefined,
      civilIdImageUrl: this.civilIdImageUrl?.trim() || undefined,
      phone: v.phone.trim(),
      email: v.email || undefined,
      systemRole: v.systemRole || undefined
    };
    const req$ = this.data.employee
      ? this.svc.updateEmployee(this.data.employee.id, payload)
      : this.svc.createEmployee(payload);
    req$.subscribe({
      next: () => {
        this.saving = false;
        this.snack.success(this.i18n.instant('COMMON.SAVED'));
        this.ref.close(true);
      },
      error: (e: any) => {
        this.saving = false;
        this.snack.error(e?.error?.message || this.i18n.instant('COMMON.ERROR'));
      }
    });
  }

  private toYmd(date: Date | string): string {
    if (typeof date === 'string') return date;
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }
}
