import { DialogTitleCloseDirective } from './../../../shared/directives/dialog-title-close.directive';
import { Component, Inject, OnInit } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { switchMap, of } from 'rxjs';

import { ContractorCompany, ContractorCompanyService } from '../../../core/services/contractor-company.service';
import { PropertyService, Property } from '../../../core/services/property.service';
import { MaintenanceAssignmentService } from '../../../core/services/maintenance-assignment.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { UploadZoneComponent } from '../../../shared/components/upload-zone/upload-zone.component';
import { IdentityMediaFieldsComponent } from '../../../shared/components/identity-media-fields/identity-media-fields.component';
import { AuditTrailComponent } from '../../../shared/components/audit-trail/audit-trail.component';

export interface ContractorCompanyDialogData {
  company: ContractorCompany | null;
  readOnly?: boolean;
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

function parseFlexibleDate(value: string | undefined | null): Date | null {
  const raw = (value ?? '').trim();
  const match = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (!day || !month || month < 1 || month > 12) return null;
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

@Component({
  selector: 'app-contractor-company-dialog',
  standalone: true,
  imports: [
    NgIf, NgFor,
    ReactiveFormsModule,
    TranslateModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
    MatIconModule,
    UploadZoneComponent,
    IdentityMediaFieldsComponent,
    AuditTrailComponent, DialogTitleCloseDirective],
  template: `
    <h2 mat-dialog-title>{{ titleKey | translate }}</h2>
    <mat-dialog-content class="dialog-body">
      <form [formGroup]="form" class="contractor-dialog-form">
        <div class="dialog-intro full">
          <span class="material-icons">engineering</span>
          <div>
            <strong>{{ (data.company ? 'CONTRACTORS.EDIT' : 'CONTRACTORS.NEW') | translate }}</strong>
            <p>{{ 'CONTRACTORS.DIALOG_HINT' | translate }}</p>
          </div>
        </div>

        <section class="full identity-wrap" [class.media-readonly]="data.readOnly">
          <app-identity-media-fields
            [compact]="true"
            [(profileImageUrl)]="profileImageUrl"
            [(civilIdImageUrl)]="civilIdImageUrl">
          </app-identity-media-fields>
        </section>

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
          <input matInput [matDatepicker]="p1" formControlName="contractStart" (blur)="normalizeDateInput('contractStart', $event)" />
          <mat-datepicker-toggle matIconSuffix [for]="p1"></mat-datepicker-toggle>
          <mat-datepicker #p1></mat-datepicker>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'CONTRACTORS.CONTRACT_END' | translate }}</mat-label>
          <input matInput [matDatepicker]="p2" formControlName="contractEnd" (blur)="normalizeDateInput('contractEnd', $event)" />
          <mat-datepicker-toggle matIconSuffix [for]="p2"></mat-datepicker-toggle>
          <mat-datepicker #p2></mat-datepicker>
        </mat-form-field>

        <div class="section-divider full" *ngIf="!data.company">
          <span class="material-icons">link</span>
          <span>{{ 'CONTRACTORS.PROPERTY_LINK_SECTION' | translate }}</span>
        </div>

        <mat-form-field appearance="outline" class="full" *ngIf="!data.company">
          <mat-label>{{ 'CONTRACTORS.SELECT_PROPERTY' | translate }}</mat-label>
          <mat-select formControlName="propertyId">
            <mat-option *ngFor="let p of properties" [value]="p.id">
              {{ propertyLabel(p) }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full" *ngIf="!data.company && form.value.propertyId">
          <mat-label>{{ 'CONTRACTORS.CONTRACT_VALUE' | translate }}</mat-label>
          <input matInput type="number" min="0" formControlName="contractValue" />
        </mat-form-field>

        <div class="property-link-hint full" *ngIf="!data.company && form.value.propertyId">
          <span class="material-icons">info_outline</span>
          <span>{{ 'CONTRACTORS.PROPERTY_LINK_HINT' | translate }}</span>
        </div>

        <div class="upload-block full">
          <app-upload-zone
            [readOnly]="!!data.readOnly"
            [multiple]="true"
            [accept]="'image/*,.pdf,.doc,.docx'"
            [urlList]="attachmentUrls"
            (urlListChange)="attachmentUrls = $event"
            [label]="'CONTRACTORS.CONTRACT_ATTACHMENTS' | translate">
          </app-upload-zone>
        </div>

        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ 'CONTRACTORS.NOTES' | translate }}</mat-label>
          <textarea matInput rows="2" formControlName="notes"></textarea>
        </mat-form-field>

        <div class="full status-readonly" *ngIf="data.readOnly && data.company">
          <span class="lbl">{{ 'COMMON.ACTIVE' | translate }}</span>
          <span class="val">{{ (data.company.active ? 'COMMON.ACTIVE' : 'COMMON.INACTIVE') | translate }}</span>
        </div>
      </form>
      <app-audit-trail *ngIf="data.company" class="company-audit"
        [createdAt]="data.company.createdAt"
        [updatedAt]="data.company.updatedAt"
        [createdBy]="data.company.createdBy"
        [createdByName]="data.company.createdByName"
        [modifiedBy]="data.company.modifiedBy"
        [modifiedByName]="data.company.modifiedByName">
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
    .dialog-body { min-width: min(560px, 94vw); padding-top: 8px; }
    .contractor-dialog-form { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .full { grid-column: 1 / -1; }
    .identity-wrap {
      padding-bottom: 12px;
      margin-bottom: 4px;
      border-bottom: 1px solid var(--line, rgba(0,0,0,.08));
    }
    @media (max-width: 560px) { .contractor-dialog-form { grid-template-columns: 1fr; } }
    .company-audit { margin-top: 12px; }
    .status-readonly { display: flex; flex-direction: column; gap: 4px; padding: 8px 0; }
    .status-readonly .lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); }
    .status-readonly .val { font-size: 0.92rem; }
    .media-readonly { pointer-events: none; opacity: 0.92; }
    .section-divider {
      display: flex; align-items: center; gap: 8px;
      font-size: 0.82rem; font-weight: 700; text-transform: uppercase;
      color: var(--primary, #1a2e4a); letter-spacing: 0.04em;
      padding: 10px 0 4px; border-top: 1px solid var(--line, rgba(0,0,0,.08));
      margin-top: 4px;
    }
    .section-divider .material-icons { font-size: 16px; }
    .property-link-hint {
      display: flex; align-items: center; gap: 6px;
      font-size: 0.8rem; color: var(--text-muted);
      background: var(--surface-alt, rgba(0,0,0,.03));
      border-radius: 6px; padding: 8px 10px;
    }
    .property-link-hint .material-icons { font-size: 16px; color: var(--accent, #c8a84b); }
  `]
})
export class ContractorCompanyDialogComponent implements OnInit {
  saving = false;
  attachmentUrls: string[] = [];
  profileImageUrl = '';
  civilIdImageUrl = '';
  properties: Property[] = [];

  get titleKey(): string {
    if (this.data.readOnly && this.data.company) return 'CONTRACTORS.VIEW_DETAILS';
    return this.data.company ? 'CONTRACTORS.EDIT' : 'CONTRACTORS.NEW';
  }

  readonly form = this.fb.nonNullable.group({
    nameAr: ['', [Validators.required, Validators.maxLength(200)]],
    nameEn: ['', [Validators.required, Validators.maxLength(200)]],
    phone: ['', [Validators.maxLength(40)]],
    email: ['', [Validators.email, Validators.maxLength(150)]],
    notes: [''],
    contractStart: [null as Date | null, [Validators.required]],
    contractEnd: [null as Date | null, [Validators.required]],
    propertyId: [null as number | null],
    contractValue: [null as number | null]
  });

  constructor(
    readonly ref: MatDialogRef<ContractorCompanyDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) readonly data: ContractorCompanyDialogData,
    private readonly fb: FormBuilder,
    private readonly svc: ContractorCompanyService,
    private readonly propertySvc: PropertyService,
    private readonly assignSvc: MaintenanceAssignmentService,
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
        contractStart: parseYmd(c.contractStart),
        contractEnd: parseYmd(c.contractEnd)
      });
      this.attachmentUrls = [...(c.attachmentFiles ?? [])];
      this.profileImageUrl = c.profileImageUrl ?? '';
      this.civilIdImageUrl = c.civilIdImageUrl ?? '';
    }
    if (data.readOnly) {
      this.form.disable();
    }
    if (!data.company) {
      this.form.get('email')?.addValidators(Validators.required);
      this.form.get('email')?.updateValueAndValidity({ emitEvent: false });
      this.form.get('propertyId')?.addValidators(Validators.required);
      this.form.get('propertyId')?.updateValueAndValidity({ emitEvent: false });
    }
  }

  ngOnInit(): void {
    if (!this.data.company) {
      this.propertySvc.getAll(0, 200).subscribe({
        next: (res) => { this.properties = res.data?.content ?? []; }
      });
    }
  }

  propertyLabel(p: Property): string {
    return (this.i18n.currentLang === 'ar' ? (p.propertyNameAr || p.propertyName) : (p.propertyNameEn || p.propertyName)) || '-';
  }

  normalizeDateInput(controlName: 'contractStart' | 'contractEnd', event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const parsed = parseFlexibleDate(input?.value);
    if (parsed) {
      this.form.get(controlName)?.setValue(parsed);
      this.form.get(controlName)?.markAsDirty();
      this.form.get(controlName)?.updateValueAndValidity();
    }
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.snack.error(this.i18n.instant('COMMON.FILL_REQUIRED_FIELDS'));
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
      active: this.data.company?.active ?? true,
      contractStart: start,
      contractEnd: end,
      attachmentFiles: [...this.attachmentUrls],
      profileImageUrl: (this.profileImageUrl ?? '').trim(),
      civilIdImageUrl: (this.civilIdImageUrl ?? '').trim(),
      portalPropertyId: v.propertyId ?? null
    };

    const req$ = this.data.company ? this.svc.update(this.data.company.id, body) : this.svc.create(body);
    req$.pipe(
      switchMap((res) => {
        const companyId = res.data?.id;
        const propertyId = v.propertyId;
        if (!this.data.company && companyId && propertyId) {
          return this.assignSvc.assign(propertyId, {
            providerType: 'COMPANY',
            companyId,
            isPrimary: false,
            startDate: start ?? undefined,
            contract: {
              startDate: start!,
              endDate: end ?? null,
              contractValue: v.contractValue ? Number(v.contractValue) : null
            }
          });
        }
        return of(null);
      })
    ).subscribe({
      next: () => {
        this.saving = false;
        this.snack.success(this.i18n.instant('COMMON.SUCCESS'));
        this.ref.close(true);
      },
      error: (err) => {
        this.saving = false;
        this.snack.error(err?.error?.message || err?.message || this.i18n.instant('COMMON.ERROR'));
      }
    });
  }
}
