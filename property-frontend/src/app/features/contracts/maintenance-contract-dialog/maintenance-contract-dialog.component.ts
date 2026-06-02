import { DialogTitleCloseDirective } from './../../../shared/directives/dialog-title-close.directive';
﻿import { Component, Inject, OnDestroy, OnInit, Optional } from '@angular/core';
import { NgIf, NgFor, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { UploadZoneComponent } from '../../../shared/components/upload-zone/upload-zone.component';
import { ContractorCompanyService, ContractorCompany } from '../../../core/services/contractor-company.service';
import { MaintenanceContractService, MaintenanceContractResponse } from '../../../core/services/maintenance-contract.service';
import { PropertyService, Property } from '../../../core/services/property.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LookupCacheService } from '../../../core/services/lookup-cache.service';
import { LookupItem } from '../../../core/services/lookup.service';
import { AuditTrailComponent } from '../../../shared/components/audit-trail/audit-trail.component';

export interface MaintenanceContractDialogData {
  propertyId?: number;
  contractorCompanyId?: number;
  contractId?: number;
  mode?: 'create' | 'edit' | 'view';
}

@Component({
  selector: 'app-maintenance-contract-dialog',
  standalone: true,
  imports: [
    NgIf, NgFor, DecimalPipe, ReactiveFormsModule,
    MatButtonModule, MatIconModule, MatInputModule, MatSelectModule,
    MatDatepickerModule, MatNativeDateModule, MatFormFieldModule,
    MatProgressSpinnerModule, MatDialogModule,
    TranslateModule, PageHeaderComponent, UploadZoneComponent,
    AuditTrailComponent, DialogTitleCloseDirective],
  templateUrl: './maintenance-contract-dialog.component.html',
  styleUrl: './maintenance-contract-dialog.component.scss'
})
export class MaintenanceContractDialogComponent implements OnInit, OnDestroy {
  form: FormGroup;
  loading = false;
  submitting = false;
  mode: 'create' | 'edit' | 'view' = 'create';

  properties: Property[] = [];
  contractorCompanies: ContractorCompany[] = [];
  currencies: LookupItem[] = [];
  attachmentUrls: string[] = [];
  loadedContract: MaintenanceContractResponse | null = null;

  private allProps: Property[] = [];
  private allContracts: MaintenanceContractResponse[] = [];
  private companyFilterSub?: Subscription;

  private static readonly blockingStatuses = new Set([
    'DRAFT',
    'PENDING_OWNER_APPROVAL',
    'PENDING_RENEWAL_APPROVAL',
    'PENDING_TERMINATION_APPROVAL',
    'SUSPENDED'
  ]);

  constructor(
    private readonly fb: FormBuilder,
    private readonly contractorCompanySvc: ContractorCompanyService,
    private readonly maintenanceContractSvc: MaintenanceContractService,
    private readonly propertySvc: PropertyService,
    private readonly snack: SnackService,
    readonly i18n: I18nService,
    readonly lookupCache: LookupCacheService,
    @Optional() private readonly dialogRef?: MatDialogRef<MaintenanceContractDialogComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) private readonly data?: MaintenanceContractDialogData
  ) {
    this.form = this.fb.group({
      propertyId: [null, Validators.required],
      contractorCompanyId: [null, Validators.required],
      startDate: [null, Validators.required],
      endDate: [null, Validators.required],
      contractValue: [null, [Validators.required, Validators.min(0)]],
      currency: ['SAR', Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.mode = this.data?.mode ?? 'create';
    if (this.mode === 'view') {
      this.form.disable();
    }

    this.loading = true;

    forkJoin({
      properties: this.propertySvc.getAll(0, 500).pipe(
        catchError(() => of({ data: { content: [] } }))
      ),
      companies: this.contractorCompanySvc.list(true).pipe(
        catchError(() => of({ data: [] }))
      ),
      activeContracts: this.maintenanceContractSvc.listAll().pipe(
        catchError(() => of({ data: [] }))
      ),
      currencies: this.lookupCache.preload('CURRENCY').pipe(
        catchError(() => of([] as LookupItem[]))
      )
    }).subscribe(({ properties, companies, activeContracts, currencies }) => {
      this.allProps = properties.data?.content ?? [];
      this.allContracts = activeContracts.data ?? [];
      this.contractorCompanies = companies.data ?? [];
      this.currencies = Array.isArray(currencies) ? currencies : [];

      if (this.mode === 'create') {
        const initialCompanyId = this.data?.contractorCompanyId ?? null;
        this.applyFilteredProperties(initialCompanyId);
        this.companyFilterSub = this.form.get('contractorCompanyId')?.valueChanges.subscribe((cid: number | null) => {
          this.applyFilteredProperties(cid ?? null);
        });
      } else {
        this.properties = [...this.allProps];
      }

      if (this.data?.propertyId) {
        this.form.patchValue({ propertyId: this.data.propertyId });
      }

      if (this.data?.contractorCompanyId) {
        this.form.patchValue({ contractorCompanyId: this.data.contractorCompanyId });
        if (this.mode === 'create') {
          this.form.get('contractorCompanyId')?.disable({ emitEvent: false });
        }
      }

      if (this.data?.contractId && this.mode !== 'create') {
        this.loadContract(this.data.contractId);
      } else {
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.companyFilterSub?.unsubscribe();
  }

  /** Same company + property: block in-flight statuses or ACTIVE within calendar window (matches backend duplicate rule). */
  private applyFilteredProperties(companyId: number | null): void {
    if (!companyId) {
      this.properties = [...this.allProps];
    } else {
      this.properties = this.allProps.filter(
        (p) => !this.allContracts.some((c) => this.isBlockingForCompanyAndProperty(c, companyId, p.id))
      );
    }

    const sel = this.form.get('propertyId')?.value as number | null;
    if (sel != null && !this.properties.some((p) => p.id === sel)) {
      this.form.patchValue({ propertyId: null }, { emitEvent: false });
    }
  }

  private isBlockingForCompanyAndProperty(
    c: MaintenanceContractResponse,
    companyId: number,
    propertyId: number
  ): boolean {
    if (c.contractorCompanyId !== companyId || c.propertyId !== propertyId) {
      return false;
    }
    if (MaintenanceContractDialogComponent.blockingStatuses.has(c.status)) {
      return true;
    }
    return this.isActiveInWindow(c);
  }

  private todayYmd(): string {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }

  private contractStartYmd(c: MaintenanceContractResponse): string {
    const s = c.startDate ?? '';
    return s.length >= 10 ? s.slice(0, 10) : s;
  }

  private contractEndYmd(c: MaintenanceContractResponse): string | null {
    if (c.endDate == null || c.endDate === '') {
      return null;
    }
    const s = c.endDate;
    return s.length >= 10 ? s.slice(0, 10) : s;
  }

  private isActiveInWindow(c: MaintenanceContractResponse): boolean {
    if (c.status !== 'ACTIVE') {
      return false;
    }
    const today = this.todayYmd();
    const start = this.contractStartYmd(c);
    if (start > today) {
      return false;
    }
    const end = this.contractEndYmd(c);
    if (end == null) {
      return true;
    }
    return end >= today;
  }

  private loadContract(contractId: number): void {
    this.maintenanceContractSvc.getById(contractId).subscribe({
      next: (res) => {
        if (res.data) {
          const contract = res.data;
          this.loadedContract = contract;
          this.form.patchValue({
            propertyId: contract.propertyId,
            contractorCompanyId: contract.contractorCompanyId,
            startDate: contract.startDate ? new Date(contract.startDate) : null,
            endDate: contract.endDate ? new Date(contract.endDate) : null,
            contractValue: contract.contractValue,
            currency: contract.currency || 'SAR',
            notes: contract.notes || ''
          });
          if (contract.attachmentUrls) {
            try {
              this.attachmentUrls = JSON.parse(contract.attachmentUrls);
            } catch {
              this.attachmentUrls = [];
            }
          }
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.error(this.i18n.instant('MAINTENANCE.LOAD_ERROR'));
      }
    });
  }

  get titleKey(): string {
    if (this.mode === 'edit') return 'MAINTENANCE.CONTRACT_EDIT';
    if (this.mode === 'view') return 'MAINTENANCE.CONTRACT_VIEW';
    return 'MAINTENANCE.CONTRACT_NEW';
  }

  propertyLabel(property: Property): string {
    return this.i18n.currentLang === 'ar'
      ? (property.propertyNameAr || property.propertyName)
      : (property.propertyNameEn || property.propertyName);
  }

  companyLabel(company: ContractorCompany): string {
    return this.i18n.currentLang === 'ar'
      ? (company.nameAr || company.name)
      : (company.nameEn || company.name);
  }

  currencyLabel(currency: LookupItem): string {
    return this.i18n.currentLang === 'ar' ? currency.nameAr : currency.nameEn;
  }

  cancel(): void {
    this.dialogRef?.close(false);
  }

  submit(): void {
    if (this.submitting || this.form.invalid) return;

    this.submitting = true;
    const formValue = this.form.getRawValue();

    const payload = {
      propertyId: formValue.propertyId,
      contractorCompanyId: formValue.contractorCompanyId,
      startDate: formValue.startDate ? this.formatDate(formValue.startDate) : null,
      endDate: formValue.endDate ? this.formatDate(formValue.endDate) : null,
      contractValue: formValue.contractValue,
      currency: formValue.currency,
      notes: formValue.notes || null,
      attachmentUrls: this.attachmentUrls.length > 0 ? JSON.stringify(this.attachmentUrls) : null
    };

    const request$ = this.data?.contractId && this.mode === 'edit'
      ? this.maintenanceContractSvc.update(this.data.contractId, payload)
      : this.maintenanceContractSvc.create(payload);

    request$.subscribe({
      next: () => {
        this.submitting = false;
        this.snack.success(this.i18n.instant('MAINTENANCE.CONTRACT_SAVED'));
        this.dialogRef?.close(true);
      },
      error: (err: unknown) => {
        this.submitting = false;
        const msg = (err as { error?: { message?: string } })?.error?.message;
        this.snack.error(msg || this.i18n.instant('MAINTENANCE.SAVE_ERROR'));
      }
    });
  }

  private formatDate(date: Date | string): string {
    if (typeof date === 'string') return date;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

