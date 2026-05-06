import { Component, Inject, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';

import { MaintenanceOfficerType, User, UserRole } from '../../core/models/user.model';
import { Property } from '../../core/services/property.service';
import { ContractorCompany } from '../../core/services/contractor-company.service';
import { UserManageRequest, UserService } from '../../core/services/user.service';
import { SnackService } from '../../core/services/snack.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { SearchableSelectComponent } from '../../shared/components/searchable-select/searchable-select.component';
import { IdentityMediaFieldsComponent } from '../../shared/components/identity-media-fields/identity-media-fields.component';

export interface UserDialogData {
  user: User | null;
  properties: Property[];
  contractorCompanies: ContractorCompany[];
}

@Component({
  selector: 'app-user-dialog',
  standalone: true,
  imports: [
    NgIf, NgFor, DatePipe, ReactiveFormsModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule, MatInputModule,
    MatProgressSpinnerModule, MatSelectModule, SearchableSelectComponent,
    TranslateModule,
    IdentityMediaFieldsComponent
  ],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon class="dialog-title-icon">{{ data.user ? 'person' : 'person_add' }}</mat-icon>
      {{ (data.user ? 'USER_MGMT.EDIT_USER' : 'USER_MGMT.NEW_USER') | translate }}
    </h2>
    <mat-dialog-content>
      <div *ngIf="loadingDetail" class="detail-loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
      <form *ngIf="!loadingDetail" [formGroup]="form" class="user-dialog-form">
        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ 'AUTH.EMAIL' | translate }}</mat-label>
          <input matInput formControlName="email" type="email">
          <mat-hint *ngIf="!data.user">{{ 'USER_MGMT.EMAIL_AS_USERNAME_HINT' | translate }}</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ 'AUTH.PASSWORD' | translate }}</mat-label>
          <input matInput formControlName="password" type="password">
          <mat-hint>{{ data.user ? ('USER_MGMT.PASSWORD_HINT' | translate) : ('USER_MGMT.DEFAULT_PASSWORD_HINT' | translate) }}</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'PROFILE.FULL_NAME' | translate }}</mat-label>
          <input matInput formControlName="fullName">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'PROFILE.PHONE' | translate }}</mat-label>
          <input matInput formControlName="phone">
        </mat-form-field>

        <section class="identity-wrap full" *ngIf="needsIdentityMedia">
          <app-identity-media-fields
            [compact]="true"
            [showCivilSection]="showCivilSection"
            [labelProfileKey]="'PROFILE.IMAGE_UPLOAD'"
            [labelCivilKey]="'OWNERS.CIVIL_ID_IMAGE'"
            [labelUploadProfileKey]="'OWNERS.UPLOAD_PHOTO'"
            [labelUploadCivilKey]="'OWNERS.UPLOAD_CIVIL_ID'"
            [(profileImageUrl)]="profileImageUrl"
            [(civilIdImageUrl)]="civilIdImageUrl">
          </app-identity-media-fields>
        </section>

        <section class="linked-registry full" *ngIf="form.get('role')?.value === 'OWNER'">
          <div class="registry-eyebrow">{{ 'PROFILE.LINKED_REGISTRY_TITLE' | translate }}</div>
          <mat-form-field appearance="outline">
            <mat-label>{{ 'OWNERS.FULL_NAME_AR' | translate }}</mat-label>
            <input matInput formControlName="ownerFullNameAr">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>{{ 'OWNERS.FULL_NAME_EN' | translate }}</mat-label>
            <input matInput formControlName="ownerFullNameEn">
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>{{ 'OWNERS.NATIONAL_ID' | translate }}</mat-label>
            <input matInput formControlName="ownerNationalId">
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>{{ 'OWNERS.ADDRESS' | translate }}</mat-label>
            <textarea matInput rows="2" formControlName="ownerAddress"></textarea>
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>{{ 'OWNERS.NOTES' | translate }}</mat-label>
            <textarea matInput rows="2" formControlName="ownerNotes"></textarea>
          </mat-form-field>
        </section>

        <section class="linked-registry full" *ngIf="form.get('role')?.value === 'TENANT'">
          <div class="registry-eyebrow">{{ 'PROFILE.LINKED_REGISTRY_TITLE' | translate }}</div>
          <mat-form-field appearance="outline" class="full">
            <mat-label>{{ 'TENANTS.NATIONAL_ID' | translate }}</mat-label>
            <input matInput formControlName="tenantNationalId">
            <mat-hint>{{ 'USER_MGMT.TENANT_NO_UNIT_HINT' | translate }}</mat-hint>
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>{{ 'TENANTS.NOTES' | translate }}</mat-label>
            <textarea matInput rows="2" formControlName="tenantNotes"></textarea>
          </mat-form-field>
        </section>

        <section class="linked-registry full" *ngIf="isEmployeeRole(form.get('role')?.value)">
          <div class="registry-eyebrow">{{ 'PROFILE.LINKED_REGISTRY_TITLE' | translate }}</div>
          <mat-form-field appearance="outline" class="full">
            <mat-label>{{ 'HR.NATIONAL_ID' | translate }}</mat-label>
            <input matInput formControlName="employeeNationalId">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>{{ 'HR.JOB_TITLE_AR' | translate }}</mat-label>
            <input matInput formControlName="employeeJobTitleAr">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>{{ 'HR.JOB_TITLE_EN' | translate }}</mat-label>
            <input matInput formControlName="employeeJobTitleEn">
          </mat-form-field>
        </section>

        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ 'USER_MGMT.ROLE' | translate }}</mat-label>
          <mat-select formControlName="role">
            <mat-option *ngFor="let r of roleOptions" [value]="r">{{ roleLabel(r) }}</mat-option>
          </mat-select>
        </mat-form-field>

        <app-searchable-select
          class="full"
          *ngIf="needsProperty"
          formControlName="propertyId"
          [items]="data.properties"
          [label]="'REQUEST_FORM.PROPERTY'">
        </app-searchable-select>

        <mat-form-field appearance="outline" class="full" *ngIf="showMaintenanceOfficerType">
          <mat-label>{{ 'USER_MGMT.OFFICER_TYPE' | translate }}</mat-label>
          <mat-select formControlName="maintenanceOfficerType">
            <mat-option *ngFor="let t of officerTypeOptions" [value]="t">{{ officerTypeLabel(t) }}</mat-option>
          </mat-select>
        </mat-form-field>

        <app-searchable-select
          class="full"
          *ngIf="needsContractorCompanySelect"
          formControlName="contractorCompanyId"
          [items]="data.contractorCompanies"
          [label]="'USER_MGMT.CONTRACTOR_COMPANY'">
        </app-searchable-select>
      </form>

      <!-- Audit info (edit mode only) -->
      <div class="audit-footer" *ngIf="data.user">
        <mat-icon>history</mat-icon>
        <span>{{ 'AUDIT.CREATED_AT' | translate }}: <strong>{{ data.user.createdAt | date:'dd/MM/yyyy HH:mm' }}</strong></span>
        <span *ngIf="data.user.updatedAt"> · {{ 'AUDIT.UPDATED_AT' | translate }}: <strong>{{ data.user.updatedAt | date:'dd/MM/yyyy HH:mm' }}</strong></span>
        <span *ngIf="data.user.createdByName"> · {{ 'AUDIT.CREATED_BY' | translate }}: <strong>{{ data.user.createdByName }}</strong></span>
        <span *ngIf="data.user.modifiedByName"> · {{ 'AUDIT.MODIFIED_BY' | translate }}: <strong>{{ data.user.modifiedByName }}</strong></span>
      </div>
    </mat-dialog-content>
    <div mat-dialog-actions align="end" class="dialog-actions-row">
      <button mat-stroked-button type="button" (click)="ref.close(false)">{{ 'ACTIONS.CANCEL' | translate }}</button>
      <button mat-flat-button class="navy-btn" type="button" (click)="save()" [disabled]="saving || loadingDetail">
        <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
        <span *ngIf="!saving">{{ 'ACTIONS.SAVE' | translate }}</span>
      </button>
    </div>
  `,
  styles: [`
    .user-dialog-form { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding-top: 10px; }
    .full { grid-column: 1 / -1; }
    .dialog-actions-row { padding: 16px 24px; border-top: 1px solid var(--line); display: flex; gap: 12px; justify-content: flex-end; }
    .navy-btn { background: var(--navy-800) !important; color: white !important; }
    .detail-loading { display: flex; justify-content: center; padding: 48px 0; }
    .identity-wrap {
      padding-bottom: 12px;
      margin-bottom: 4px;
      border-bottom: 1px solid var(--line, rgba(0,0,0,.08));
    }
    .linked-registry {
      grid-column: 1 / -1;
      padding: 12px 0 4px;
      margin-bottom: 4px;
      border-bottom: 1px solid var(--line, rgba(0,0,0,.08));
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 16px;
    }
    .linked-registry .full { grid-column: 1 / -1; }
    .registry-eyebrow {
      grid-column: 1 / -1;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      opacity: 0.72;
      margin-bottom: 4px;
    }
    .audit-footer {
      display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px;
      margin-top: 16px; padding: 10px 12px;
      background: rgba(19, 78, 74, 0.05); border-radius: 8px;
      font-size: 0.8rem; color: var(--text-muted);
    }
    .audit-footer mat-icon { font-size: 15px; width: 15px; height: 15px; vertical-align: middle; opacity: 0.6; }
    .audit-footer strong { color: var(--text-main); }
    @media (max-width: 640px) { .user-dialog-form { grid-template-columns: 1fr; } }
  `]
})
export class UserDialogComponent implements OnInit {
  saving = false;
  loadingDetail = false;
  loadedUser: User | null = null;
  profileImageUrl = '';
  civilIdImageUrl = '';

  readonly roleOptions: UserRole[] = [
    'SUPER_ADMIN',
    'GENERAL_MANAGER',
    'ACCOUNTANT',
    'MAINTENANCE_CONTRACTOR',
    'MAINTENANCE_OFFICER',
    'PROPERTY_GUARD',
    'PROCEDURES_CLERK',
    'OWNER',
    'TENANT'
  ];
  readonly officerTypeOptions: MaintenanceOfficerType[] = ['INTERNAL_PROPERTY', 'CONTRACTOR_COMPANY'];

  readonly form: FormGroup;

  get needsProperty(): boolean {
    const role = this.form.get('role')?.value as UserRole;
    return (
      role === 'GENERAL_MANAGER' ||
      role === 'MAINTENANCE_OFFICER' ||
      role === 'MAINTENANCE_CONTRACTOR' ||
      role === 'ACCOUNTANT' ||
      role === 'PROPERTY_GUARD' ||
      role === 'PROCEDURES_CLERK'
    );
  }

  get showMaintenanceOfficerType(): boolean {
    return this.form.get('role')?.value === 'MAINTENANCE_OFFICER';
  }

  get needsContractorCompanySelect(): boolean {
    const role = this.form.get('role')?.value as UserRole;
    if (role === 'MAINTENANCE_CONTRACTOR') return true;
    return (
      role === 'MAINTENANCE_OFFICER' &&
      this.form.get('maintenanceOfficerType')?.value === 'CONTRACTOR_COMPANY'
    );
  }

  constructor(
    readonly ref: MatDialogRef<UserDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) readonly data: UserDialogData,
    private readonly fb: FormBuilder,
    private readonly userSvc: UserService,
    private readonly snack: SnackService,
    readonly i18n: I18nService
  ) {
    const u = data.user;
    this.form = this.fb.group({
      email: [u?.email ?? '', [Validators.required, Validators.email]],
      password: ['', [Validators.minLength(6)]],
      fullName: [u?.fullName ?? '', [Validators.required, Validators.maxLength(150)]],
      phone: [u?.phone ?? '', [Validators.maxLength(20)]],
      role: [u?.role ?? 'TENANT', Validators.required],
      propertyId: [u?.propertyId ?? null],
      maintenanceOfficerType: [u?.maintenanceOfficerType ?? null],
      maintenanceCompanyName: [u?.maintenanceCompanyName ?? ''],
      contractorCompanyId: [u?.contractorCompanyId ?? null],
      ownerFullNameAr: ['', [Validators.maxLength(150)]],
      ownerFullNameEn: ['', [Validators.maxLength(150)]],
      ownerNationalId: ['', [Validators.maxLength(30)]],
      ownerAddress: ['', [Validators.maxLength(2000)]],
      ownerNotes: ['', [Validators.maxLength(2000)]],
      tenantNationalId: ['', [Validators.maxLength(30)]],
      tenantLeaseStart: [''],
      tenantLeaseEnd: [''],
      tenantNotes: ['', [Validators.maxLength(2000)]],
      employeeNationalId: ['', [Validators.maxLength(30)]],
      employeeJobTitleAr: ['', [Validators.maxLength(120)]],
      employeeJobTitleEn: ['', [Validators.maxLength(120)]]
    });

    this.form.get('role')?.valueChanges.subscribe((role) => {
      this.applyRoleRules(role as UserRole);
      if (!(role === 'OWNER' || role === 'TENANT' || this.isEmployeeRole(role as UserRole))) {
        this.civilIdImageUrl = '';
      }
    });
    this.form.get('maintenanceOfficerType')?.valueChanges.subscribe(() => this.applyCompanyRule());
    this.applyRoleRules(this.form.get('role')?.value as UserRole);
  }

  ngOnInit(): void {
    if (!this.data.user) {
      return;
    }
    this.loadingDetail = true;
    this.userSvc.getById(this.data.user.id).subscribe({
      next: (res) => {
        const u = res.data ?? undefined;
        this.loadedUser = u ?? null;
        if (u) {
          this.profileImageUrl = u.profileImageUrl?.trim() ?? '';
          this.civilIdImageUrl = u.civilIdImageUrl?.trim() ?? '';
          this.form.patchValue(
            {
              fullName: u.fullName ?? '',
              phone: u.phone ?? '',
              ownerFullNameAr: u.ownerLink?.fullNameAr ?? '',
              ownerFullNameEn: u.ownerLink?.fullNameEn ?? '',
              ownerNationalId: u.ownerLink?.nationalId ?? '',
              ownerAddress: u.ownerLink?.address ?? '',
              ownerNotes: u.ownerLink?.notes ?? '',
              tenantNationalId: u.tenantLink?.nationalId ?? '',
              tenantLeaseStart: this.toDateInput(u.tenantLink?.leaseStart),
              tenantLeaseEnd: this.toDateInput(u.tenantLink?.leaseEnd),
              tenantNotes: u.tenantLink?.notes ?? '',
              employeeNationalId: u.employeeLink?.nationalId ?? '',
              employeeJobTitleAr: u.employeeLink?.jobTitleAr ?? '',
              employeeJobTitleEn: u.employeeLink?.jobTitleEn ?? ''
            },
            { emitEvent: false }
          );
        }
        this.loadingDetail = false;
      },
      error: () => {
        this.loadingDetail = false;
        const u = this.data.user;
        if (u) {
          this.profileImageUrl = u.profileImageUrl?.trim() ?? '';
          this.civilIdImageUrl = u.civilIdImageUrl?.trim() ?? '';
        }
      }
    });
  }

  get needsIdentityMedia(): boolean {
    const r = this.form.get('role')?.value as UserRole | undefined;
    return r === 'OWNER' || r === 'TENANT' || (r != null && this.isEmployeeRole(r));
  }

  get showCivilSection(): boolean {
    return this.form.get('role')?.value !== 'TENANT';
  }

  identityValid(): boolean {
    const r = this.form.get('role')?.value as UserRole | undefined;
    if (!this.needsIdentityMedia) return true;
    if (r === 'OWNER') {
      return !!this.profileImageUrl?.trim() && !!this.civilIdImageUrl?.trim();
    }
    if (r === 'TENANT') {
      return !!this.profileImageUrl?.trim();
    }
    return true;
  }

  isEmployeeRole(role: UserRole | string | null | undefined): boolean {
    return (
      role === 'GENERAL_MANAGER' ||
      role === 'MAINTENANCE_OFFICER' ||
      role === 'MAINTENANCE_CONTRACTOR' ||
      role === 'ACCOUNTANT' ||
      role === 'PROPERTY_GUARD' ||
      role === 'PROCEDURES_CLERK'
    );
  }

  private toDateInput(v: string | null | undefined): string {
    if (v == null || v === '') return '';
    return String(v).slice(0, 10);
  }

  roleLabel(role: UserRole): string {
    return this.i18n.instant(`ROLE.${role}`);
  }

  officerTypeLabel(type: MaintenanceOfficerType): string {
    return this.i18n.instant(`MAINTENANCE_OFFICER_TYPE.${type}`);
  }

  contractorLabel(c: ContractorCompany): string {
    const ar = c.nameAr?.trim();
    const en = c.nameEn?.trim();
    const base = c.name?.trim();
    if (this.i18n.currentLang === 'ar' && ar) return ar;
    if (this.i18n.currentLang !== 'ar' && en) return en;
    return ar || en || base || String(c.id);
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.snack.error(this.i18n.instant('COMMON.FILL_REQUIRED_FIELDS'));
      return;
    }
    if (this.saving) return;
    if (!this.identityValid()) {
      const r = this.form.get('role')?.value as string | undefined;
      const key = r === 'OWNER' ? 'COMMON.ATTACH_PROFILE_AND_CIVIL' : 'COMMON.ATTACH_PROFILE_PHOTO';
      this.snack.error(this.i18n.instant(key));
      return;
    }

    this.saving = true;
    const payload = this.buildPayload();
    const req$ = this.data.user
      ? this.userSvc.update(this.data.user.id, payload)
      : this.userSvc.create(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.snack.success(this.i18n.instant(this.data.user ? 'USER_MGMT.UPDATE_SUCCESS' : 'USER_MGMT.CREATE_SUCCESS'));
        this.ref.close(true);
      },
      error: (err: Error) => {
        this.saving = false;
        this.snack.error(err.message || this.i18n.instant('USER_MGMT.SAVE_ERROR'));
      }
    });
  }

  private applyRoleRules(role: UserRole): void {
    const propertyCtrl = this.form.get('propertyId');
    const officerTypeCtrl = this.form.get('maintenanceOfficerType');
    const companyCtrl = this.form.get('maintenanceCompanyName');
    if (!propertyCtrl || !officerTypeCtrl || !companyCtrl) return;

    if (
      role === 'GENERAL_MANAGER' ||
      role === 'MAINTENANCE_OFFICER' ||
      role === 'MAINTENANCE_CONTRACTOR' ||
      role === 'ACCOUNTANT' ||
      role === 'PROPERTY_GUARD' ||
      role === 'PROCEDURES_CLERK'
    ) {
      propertyCtrl.setValidators([Validators.required]);
    } else {
      propertyCtrl.clearValidators();
      propertyCtrl.setValue(null, { emitEvent: false });
    }
    propertyCtrl.updateValueAndValidity({ emitEvent: false });

    if (role === 'MAINTENANCE_OFFICER') {
      officerTypeCtrl.setValidators([Validators.required]);
    } else {
      officerTypeCtrl.clearValidators();
      officerTypeCtrl.setValue(null, { emitEvent: false });
      companyCtrl.setValue('', { emitEvent: false });
      if (role !== 'MAINTENANCE_CONTRACTOR') {
        this.form.get('contractorCompanyId')?.setValue(null, { emitEvent: false });
      }
    }
    officerTypeCtrl.updateValueAndValidity({ emitEvent: false });
    this.applyCompanyRule();
  }

  private applyCompanyRule(): void {
    const role = this.form.get('role')?.value as UserRole;
    const officerType = this.form.get('maintenanceOfficerType')?.value as MaintenanceOfficerType | null;
    const contractorIdCtrl = this.form.get('contractorCompanyId');
    const companyCtrl = this.form.get('maintenanceCompanyName');
    if (!contractorIdCtrl || !companyCtrl) return;

    if (role === 'MAINTENANCE_CONTRACTOR' || (role === 'MAINTENANCE_OFFICER' && officerType === 'CONTRACTOR_COMPANY')) {
      contractorIdCtrl.setValidators([Validators.required]);
    } else {
      contractorIdCtrl.clearValidators();
      contractorIdCtrl.setValue(null, { emitEvent: false });
      companyCtrl.setValue('', { emitEvent: false });
    }
    contractorIdCtrl.updateValueAndValidity({ emitEvent: false });
    companyCtrl.updateValueAndValidity({ emitEvent: false });
  }

  private buildPayload(): UserManageRequest {
    const raw = this.form.getRawValue();
    const backup = this.loadedUser ?? this.data.user ?? undefined;
    const payload: UserManageRequest = {
      username: raw.email,
      email: raw.email,
      fullName: raw.fullName,
      phone: raw.phone || undefined,
      role: raw.role,
      propertyId: raw.propertyId || undefined,
      maintenanceOfficerType: raw.maintenanceOfficerType || undefined,
      maintenanceCompanyName: raw.maintenanceCompanyName || undefined,
      contractorCompanyId: raw.contractorCompanyId || undefined
    };
    if (this.needsIdentityMedia) {
      payload.profileImageUrl = this.profileImageUrl?.trim() ?? '';
      if (this.showCivilSection) {
        payload.civilIdImageUrl = this.civilIdImageUrl?.trim() ?? '';
      }
    } else if (backup) {
      const p = backup.profileImageUrl?.trim();
      if (p) payload.profileImageUrl = p;
    }
    if (raw.password) payload.password = raw.password;
    if (payload.role === 'MAINTENANCE_CONTRACTOR') {
      payload.maintenanceOfficerType = 'CONTRACTOR_COMPANY';
    }
    if (payload.role !== 'MAINTENANCE_OFFICER' && payload.role !== 'MAINTENANCE_CONTRACTOR') {
      payload.maintenanceOfficerType = undefined;
      payload.maintenanceCompanyName = undefined;
      payload.contractorCompanyId = undefined;
    }
    if (payload.maintenanceOfficerType !== 'CONTRACTOR_COMPANY') {
      payload.maintenanceCompanyName = undefined;
      payload.contractorCompanyId = undefined;
    }
    const propertyRoles: UserRole[] = [
      'GENERAL_MANAGER',
      'MAINTENANCE_OFFICER',
      'MAINTENANCE_CONTRACTOR',
      'ACCOUNTANT',
      'PROPERTY_GUARD',
      'PROCEDURES_CLERK'
    ];
    if (!propertyRoles.includes(payload.role)) {
      payload.propertyId = undefined;
    }

    if (raw.role === 'OWNER') {
      payload.ownerLink = {
        fullNameAr: (raw.ownerFullNameAr as string | undefined)?.trim() ?? '',
        fullNameEn: (raw.ownerFullNameEn as string | undefined)?.trim() ?? '',
        nationalId: (raw.ownerNationalId as string | undefined)?.trim() ?? '',
        address: (raw.ownerAddress as string | undefined)?.trim() ?? '',
        notes: (raw.ownerNotes as string | undefined)?.trim() ?? ''
      };
    } else if (raw.role === 'TENANT') {
      payload.tenantLink = {
        nationalId: (raw.tenantNationalId as string | undefined)?.trim() ?? '',
        notes: (raw.tenantNotes as string | undefined)?.trim() ?? ''
      };
    } else if (this.isEmployeeRole(raw.role as UserRole)) {
      payload.employeeLink = {
        nationalId: (raw.employeeNationalId as string | undefined)?.trim() ?? '',
        jobTitleAr: (raw.employeeJobTitleAr as string | undefined)?.trim() ?? '',
        jobTitleEn: (raw.employeeJobTitleEn as string | undefined)?.trim() ?? ''
      };
    }

    return payload;
  }
}
