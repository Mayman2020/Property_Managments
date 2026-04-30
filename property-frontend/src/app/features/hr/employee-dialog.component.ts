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
import { TranslateModule } from '@ngx-translate/core';

import { HrService } from '../../core/services/hr.service';
import { LookupItem, LookupService } from '../../core/services/lookup.service';
import { Property } from '../../core/services/property.service';
import { SnackService } from '../../core/services/snack.service';
import { I18nService } from '../../core/i18n/i18n.service';

export interface EmployeeDialogData {
  properties: Property[];
  defaultPropertyId?: number;
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
    MatSelectModule
  ],
  template: `
    <h2 mat-dialog-title>{{ isAr ? 'إضافة موظف' : 'Add Employee' }}</h2>
    <mat-dialog-content class="dialog-body">
      <form [formGroup]="form" class="employee-dialog-form">
        <div class="dialog-intro full">
          <span class="material-icons">badge</span>
          <div>
            <strong>{{ isAr ? 'إضافة موظف' : 'Add Employee' }}</strong>
            <p>{{ isAr ? 'أضف موظفا جديدا مع بيانات التوظيف الأساسية وربطه بالعقار.' : 'Create a new employee record and link it to the property.' }}</p>
          </div>
        </div>

        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ isAr ? 'العقار' : 'Property' }}</mat-label>
          <mat-select formControlName="propertyId">
            <mat-option *ngFor="let p of data.properties" [value]="p.id">
              {{ isAr ? (p.propertyNameAr || p.propertyName) : (p.propertyNameEn || p.propertyName) }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ isAr ? 'الاسم الكامل' : 'Full Name' }}</mat-label>
          <input matInput formControlName="fullName" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ isAr ? 'المسمى الوظيفي' : 'Job Title' }}</mat-label>
          <mat-select formControlName="jobTitleId">
            <mat-option *ngFor="let title of jobTitles" [value]="title.id">{{ titleName(title) }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ isAr ? 'الراتب الأساسي' : 'Basic Salary' }}</mat-label>
          <input matInput type="number" min="1" formControlName="basicSalary" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ isAr ? 'تاريخ التعيين' : 'Hire Date' }}</mat-label>
          <input matInput [matDatepicker]="hirePicker" formControlName="hireDate" />
          <mat-datepicker-toggle matIconSuffix [for]="hirePicker"></mat-datepicker-toggle>
          <mat-datepicker #hirePicker></mat-datepicker>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ isAr ? 'الهاتف' : 'Phone' }}</mat-label>
          <input matInput formControlName="phone" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ isAr ? 'البريد الإلكتروني' : 'Email' }}</mat-label>
          <input matInput formControlName="email" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-stroked-button type="button" class="btn-dialog-cancel" (click)="ref.close(false)">{{ isAr ? 'إلغاء' : 'Cancel' }}</button>
      <button mat-flat-button type="button" class="btn-dialog-confirm" (click)="save()" [disabled]="saving">
        <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
        <span *ngIf="!saving">{{ isAr ? 'حفظ' : 'Save' }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-body { min-width: min(560px, 94vw); padding-top: 8px; }
    .employee-dialog-form { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .full { grid-column: 1 / -1; }
    @media (max-width: 600px) { .employee-dialog-form { grid-template-columns: 1fr; } }
  `]
})
export class EmployeeDialogComponent {
  saving = false;
  jobTitles: LookupItem[] = [];
  get isAr(): boolean { return this.i18n.currentLang === 'ar'; }

  readonly form = this.fb.nonNullable.group({
    propertyId: [this.data.defaultPropertyId ?? ((this.data.properties[0]?.id ?? null) as number | null), Validators.required],
    fullName: ['', Validators.required],
    jobTitleId: [null as number | null, Validators.required],
    basicSalary: [null as number | null, [Validators.required, Validators.min(1)]],
    hireDate: [new Date(), Validators.required],
    phone: [''],
    email: ['']
  });

  constructor(
    readonly ref: MatDialogRef<EmployeeDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) readonly data: EmployeeDialogData,
    private readonly fb: FormBuilder,
    private readonly svc: HrService,
    private readonly lookupSvc: LookupService,
    private readonly snack: SnackService,
    private readonly i18n: I18nService
  ) {
    this.lookupSvc.getByType('JOB_TITLE').subscribe({
      next: (res) => { this.jobTitles = res.data ?? []; },
      error: () => { this.jobTitles = []; }
    });
  }

  titleName(title: LookupItem): string {
    return this.isAr ? title.nameAr : title.nameEn;
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const v = this.form.getRawValue();
    const selectedTitle = this.jobTitles.find((item) => item.id === v.jobTitleId);
    this.svc.createEmployee({
      propertyId: v.propertyId!,
      fullName: v.fullName,
      jobTitleAr: selectedTitle?.nameAr,
      jobTitleEn: selectedTitle?.nameEn,
      basicSalary: v.basicSalary!,
      hireDate: this.toYmd(v.hireDate),
      phone: v.phone || undefined,
      email: v.email || undefined
    }).subscribe({
      next: () => { this.saving = false; this.snack.success(this.isAr ? 'تم حفظ الموظف' : 'Employee saved'); this.ref.close(true); },
      error: () => { this.saving = false; }
    });
  }

  private toYmd(date: Date | string): string {
    if (typeof date === 'string') return date;
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }
}
