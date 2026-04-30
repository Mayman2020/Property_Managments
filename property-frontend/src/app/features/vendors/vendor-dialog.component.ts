import { Component, Inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';

import { VendorService } from '../../core/services/vendor.service';
import { Property } from '../../core/services/property.service';
import { SnackService } from '../../core/services/snack.service';
import { I18nService } from '../../core/i18n/i18n.service';

export interface VendorDialogData {
  properties: Property[];
  defaultPropertyId?: number;
}

@Component({
  selector: 'app-vendor-dialog',
  standalone: true,
  imports: [
    NgIf, NgFor, ReactiveFormsModule, TranslateModule,
    MatDialogModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatProgressSpinnerModule, MatSelectModule
  ],
  template: `
    <h2 mat-dialog-title>{{ isAr ? 'إضافة مورد' : 'Add Vendor' }}</h2>
    <mat-dialog-content class="dialog-body">
      <form [formGroup]="form" class="vendor-dialog-form">
        <div class="dialog-intro full">
          <span class="material-icons">engineering</span>
          <div>
            <strong>{{ isAr ? 'إضافة مورد' : 'Add Vendor' }}</strong>
            <p>{{ isAr ? 'سجل موردًا أو مقاولًا جديدًا واربطه بالعقار والتشغيل.' : 'Register a new vendor or contractor and link it to operations.' }}</p>
          </div>
        </div>

        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ isAr ? 'العقار' : 'Property' }}</mat-label>
          <mat-select formControlName="propertyId">
            <mat-option [value]="null">{{ isAr ? '— مشترك —' : '— Shared —' }}</mat-option>
            <mat-option *ngFor="let p of data.properties" [value]="p.id">
              {{ isAr ? (p.propertyNameAr || p.propertyName) : (p.propertyNameEn || p.propertyName) }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ isAr ? 'اسم المورد' : 'Vendor Name' }}</mat-label>
          <input matInput formControlName="vendorName" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ isAr ? 'النوع' : 'Type' }}</mat-label>
          <input matInput formControlName="vendorType" [placeholder]="isAr ? 'مثال: سباكة، كهرباء' : 'e.g. Plumbing, Electrical'" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ isAr ? 'مسؤول التواصل' : 'Contact Person' }}</mat-label>
          <input matInput formControlName="contactPerson" />
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
    .dialog-body { min-width: min(520px, 94vw); padding-top: 8px; }
    .vendor-dialog-form { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .full { grid-column: 1 / -1; }
    @media (max-width: 560px) { .vendor-dialog-form { grid-template-columns: 1fr; } }
  `]
})
export class VendorDialogComponent {
  saving = false;
  get isAr(): boolean { return this.i18n.currentLang === 'ar'; }

  readonly form = this.fb.nonNullable.group({
    propertyId: [this.data.defaultPropertyId ?? (null as number | null)],
    vendorName: ['', Validators.required],
    vendorType: [''],
    contactPerson: [''],
    phone: [''],
    email: ['']
  });

  constructor(
    readonly ref: MatDialogRef<VendorDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) readonly data: VendorDialogData,
    private readonly fb: FormBuilder,
    private readonly svc: VendorService,
    private readonly snack: SnackService,
    private readonly i18n: I18nService
  ) {
    if (data.properties.length === 1) {
      this.form.patchValue({ propertyId: data.properties[0].id });
    }
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const v = this.form.getRawValue();
    this.svc.createVendor({
      propertyId: v.propertyId ?? undefined,
      vendorName: v.vendorName,
      vendorType: v.vendorType || undefined,
      contactPerson: v.contactPerson || undefined,
      phone: v.phone || undefined,
      email: v.email || undefined
    }).subscribe({
      next: () => { this.saving = false; this.snack.success(this.isAr ? 'تم حفظ المورد' : 'Vendor saved'); this.ref.close(true); },
      error: () => { this.saving = false; }
    });
  }
}
