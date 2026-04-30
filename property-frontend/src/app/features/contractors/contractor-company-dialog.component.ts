import { Component, Inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TranslateModule } from '@ngx-translate/core';

import { ContractorCompany, ContractorCompanyService } from '../../core/services/contractor-company.service';
import { SnackService } from '../../core/services/snack.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { UploadZoneComponent } from '../../shared/components/upload-zone/upload-zone.component';

export interface ContractorCompanyDialogData {
  company: ContractorCompany | null;
}

function toYmd(d: Date | null | undefined): string | undefined {
  if (!d) return undefined;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseYmd(s: string | undefined | null): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

@Component({
  selector: 'app-contractor-company-dialog',
  standalone: true,
  imports: [
    NgIf,
    ReactiveFormsModule,
    TranslateModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    UploadZoneComponent
  ],
  template: `
    <h2 mat-dialog-title>{{ (data.company ? 'CONTRACTORS.EDIT' : 'CONTRACTORS.NEW') | translate }}</h2>
    <mat-dialog-content class="dialog-body">
      <form [formGroup]="form" class="contractor-dialog-form">
        <div class="dialog-intro full">
          <span class="material-icons">engineering</span>
          <div>
            <strong>{{ (data.company ? 'CONTRACTORS.EDIT' : 'CONTRACTORS.NEW') | translate }}</strong>
            <p>{{ i18n.currentLang === 'ar' ? 'أدخل بيانات شركة الصيانة والعقد والمرفقات المطلوبة.' : 'Capture contractor details, contract dates, and required attachments.' }}</p>
          </div>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'CONTRACTORS.NAME_AR' | translate }}</mat-label>
          <input matInput formControlName="nameAr" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'CONTRACTORS.NAME_EN' | translate }}</mat-label>
          <input matInput formControlName="nameEn" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'CONTRACTORS.PHONE' | translate }}</mat-label>
          <input matInput formControlName="phone" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'CONTRACTORS.EMAIL' | translate }}</mat-label>
          <input matInput type="email" formControlName="email" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'CONTRACTORS.CONTRACT_START' | translate }}</mat-label>
          <input matInput [matDatepicker]="p1" formControlName="contractStart" />
          <mat-datepicker-toggle matIconSuffix [for]="p1"></mat-datepicker-toggle>
          <mat-datepicker #p1></mat-datepicker>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'CONTRACTORS.CONTRACT_END' | translate }}</mat-label>
          <input matInput [matDatepicker]="p2" formControlName="contractEnd" />
          <mat-datepicker-toggle matIconSuffix [for]="p2"></mat-datepicker-toggle>
          <mat-datepicker #p2></mat-datepicker>
        </mat-form-field>

        <div class="upload-block full">
          <app-upload-zone
            [multiple]="true"
            [accept]="'image/*,.pdf,.doc,.docx'"
            [label]="'CONTRACTORS.CONTRACT_ATTACHMENTS' | translate"
            (filesUploaded)="onFiles($event)">
          </app-upload-zone>
        </div>

        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ 'CONTRACTORS.NOTES' | translate }}</mat-label>
          <textarea matInput rows="2" formControlName="notes"></textarea>
        </mat-form-field>

        <mat-slide-toggle formControlName="active" class="full">{{ 'COMMON.ACTIVE' | translate }}</mat-slide-toggle>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-stroked-button type="button" class="btn-dialog-cancel" (click)="ref.close(false)">
        {{ 'ACTIONS.CANCEL' | translate }}
      </button>
      <button mat-flat-button type="button" class="btn-dialog-confirm" (click)="save()" [disabled]="saving">
        <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
        <span *ngIf="!saving">{{ 'ACTIONS.SAVE' | translate }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-body { min-width: min(560px, 94vw); padding-top: 8px; }
    .contractor-dialog-form { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .full { grid-column: 1 / -1; }
    @media (max-width: 560px) { .contractor-dialog-form { grid-template-columns: 1fr; } }
  `]
})
export class ContractorCompanyDialogComponent {
  saving = false;
  attachmentUrls: string[] = [];
  readonly form = this.fb.nonNullable.group({
    nameAr: ['', [Validators.required, Validators.maxLength(200)]],
    nameEn: ['', [Validators.required, Validators.maxLength(200)]],
    phone: ['', [Validators.maxLength(40)]],
    email: ['', [Validators.maxLength(150)]],
    notes: [''],
    active: [true],
    contractStart: [null as Date | null],
    contractEnd: [null as Date | null]
  });

  constructor(
    readonly ref: MatDialogRef<ContractorCompanyDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) readonly data: ContractorCompanyDialogData,
    private readonly fb: FormBuilder,
    private readonly svc: ContractorCompanyService,
    private readonly snack: SnackService,
    readonly i18n: I18nService
  ) {
    const c = data.company;
    if (c) {
      this.form.patchValue({
        nameAr: c.nameAr ?? c.name,
        nameEn: c.nameEn ?? c.name,
        phone: c.phone ?? '',
        email: c.email ?? '',
        notes: c.notes ?? '',
        active: c.active,
        contractStart: parseYmd(c.contractStart),
        contractEnd: parseYmd(c.contractEnd)
      });
      this.attachmentUrls = [...(c.attachmentFiles ?? [])];
    }
  }

  onFiles(urls: string[]): void {
    this.attachmentUrls = [...new Set([...this.attachmentUrls, ...urls])];
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const start = toYmd(v.contractStart ?? undefined);
    const end = toYmd(v.contractEnd ?? undefined);
    if (!start || !end || this.attachmentUrls.length === 0) {
      this.snack.error(this.i18n.instant('CONTRACTORS.CONTRACT_REQUIRED'));
      return;
    }
    if (end < start) {
      this.snack.error(this.i18n.instant('TENANTS.LEASE_PERIOD_INVALID'));
      return;
    }

    this.saving = true;
    const body = {
      name: (v.nameAr || v.nameEn).trim(),
      nameAr: (v.nameAr || v.nameEn).trim(),
      nameEn: (v.nameEn || v.nameAr).trim(),
      phone: v.phone?.trim() || undefined,
      email: v.email?.trim() || undefined,
      notes: v.notes?.trim() || undefined,
      active: v.active,
      contractStart: start,
      contractEnd: end,
      attachmentFiles: [...this.attachmentUrls]
    };

    const req$ = this.data.company ? this.svc.update(this.data.company.id, body) : this.svc.create(body);
    req$.subscribe({
      next: () => {
        this.saving = false;
        this.snack.success(this.i18n.instant('COMMON.SUCCESS'));
        this.ref.close(true);
      },
      error: () => {
        this.saving = false;
      }
    });
  }
}
