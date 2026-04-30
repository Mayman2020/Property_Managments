import { Component, Inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
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

export interface UserDialogData {
  user: User | null;
  properties: Property[];
  contractorCompanies: ContractorCompany[];
}

@Component({
  selector: 'app-user-dialog',
  standalone: true,
  imports: [
    NgIf, NgFor, ReactiveFormsModule,
    MatDialogModule, MatButtonModule,
    MatFormFieldModule, MatInputModule,
    MatProgressSpinnerModule, MatSelectModule,
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title>{{ (data.user ? 'USER_MGMT.EDIT_USER' : 'USER_MGMT.NEW_USER') | translate }}</h2>
    <mat-dialog-content class="dialog-body">
      <form [formGroup]="form" class="user-dialog-form">
        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ 'USER_MGMT.USERNAME' | translate }}</mat-label>
          <input matInput formControlName="username">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ 'AUTH.EMAIL' | translate }}</mat-label>
          <input matInput formControlName="email" type="email">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ 'AUTH.PASSWORD' | translate }}</mat-label>
          <input matInput formControlName="password" type="password">
          <mat-hint *ngIf="data.user">{{ 'USER_MGMT.PASSWORD_HINT' | translate }}</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'PROFILE.FULL_NAME' | translate }}</mat-label>
          <input matInput formControlName="fullName">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'PROFILE.PHONE' | translate }}</mat-label>
          <input matInput formControlName="phone">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ 'USER_MGMT.ROLE' | translate }}</mat-label>
          <mat-select formControlName="role">
            <mat-option *ngFor="let r of roleOptions" [value]="r">{{ roleLabel(r) }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full"
          *ngIf="needsProperty">
          <mat-label>{{ 'REQUEST_FORM.PROPERTY' | translate }}</mat-label>
          <mat-select formControlName="propertyId">
            <mat-option *ngFor="let p of data.properties" [value]="p.id">
              {{ p.propertyName }} ({{ p.propertyCode }})
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full" *ngIf="isMaintenanceOfficer">
          <mat-label>{{ 'USER_MGMT.OFFICER_TYPE' | translate }}</mat-label>
          <mat-select formControlName="maintenanceOfficerType">
            <mat-option *ngFor="let t of officerTypeOptions" [value]="t">{{ officerTypeLabel(t) }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full"
          *ngIf="isMaintenanceOfficer && form.get('maintenanceOfficerType')?.value === 'CONTRACTOR_COMPANY'">
          <mat-label>{{ 'USER_MGMT.CONTRACTOR_COMPANY' | translate }}</mat-label>
          <mat-select formControlName="contractorCompanyId">
            <mat-option [value]="null" disabled>{{ 'USER_MGMT.SELECT_CONTRACTOR' | translate }}</mat-option>
            <mat-option *ngFor="let c of data.contractorCompanies" [value]="c.id">{{ contractorLabel(c) }}</mat-option>
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-stroked-button type="button" (click)="ref.close(false)">{{ 'ACTIONS.CANCEL' | translate }}</button>
      <button mat-flat-button type="button" (click)="save()" [disabled]="form.invalid || saving">
        <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
        <span *ngIf="!saving">{{ 'ACTIONS.SAVE' | translate }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-body { min-width: min(640px, 94vw); padding-top: 8px; }
    .user-dialog-form { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .full { grid-column: 1 / -1; }
    .dialog-actions { gap: 10px; padding: 8px 16px 16px; }
    @media (max-width: 640px) { .user-dialog-form { grid-template-columns: 1fr; } }
  `]
})
export class UserDialogComponent {
  saving = false;

  readonly roleOptions: UserRole[] = [
    'SUPER_ADMIN', 'PROPERTY_ADMIN', 'CONTRACTS_OFFICER',
    'ACCOUNTANT', 'HR_OFFICER', 'OWNER', 'MAINTENANCE_OFFICER', 'TENANT'
  ];
  readonly officerTypeOptions: MaintenanceOfficerType[] = ['INTERNAL_PROPERTY', 'CONTRACTOR_COMPANY'];

  readonly form: FormGroup;

  get needsProperty(): boolean {
    const role = this.form.get('role')?.value as UserRole;
    return role === 'TENANT' || role === 'PROPERTY_ADMIN' || role === 'MAINTENANCE_OFFICER';
  }

  get isMaintenanceOfficer(): boolean {
    return this.form.get('role')?.value === 'MAINTENANCE_OFFICER';
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
    const isEdit = !!u;
    this.form = this.fb.group({
      username: [u?.username ?? '', [Validators.required, Validators.maxLength(100)]],
      email: [u?.email ?? '', [Validators.required, Validators.email]],
      password: ['', isEdit ? [Validators.minLength(6)] : [Validators.required, Validators.minLength(6)]],
      fullName: [u?.fullName ?? '', [Validators.required, Validators.maxLength(150)]],
      phone: [u?.phone ?? '', [Validators.maxLength(20)]],
      role: [u?.role ?? 'TENANT', Validators.required],
      propertyId: [u?.propertyId ?? null],
      maintenanceOfficerType: [u?.maintenanceOfficerType ?? null],
      maintenanceCompanyName: [u?.maintenanceCompanyName ?? ''],
      contractorCompanyId: [u?.contractorCompanyId ?? null]
    });

    this.form.get('role')?.valueChanges.subscribe(role => this.applyRoleRules(role as UserRole));
    this.form.get('maintenanceOfficerType')?.valueChanges.subscribe(() => this.applyCompanyRule());
    this.applyRoleRules(this.form.get('role')?.value as UserRole);
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
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
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

    if (role === 'TENANT' || role === 'PROPERTY_ADMIN' || role === 'MAINTENANCE_OFFICER') {
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
      this.form.get('contractorCompanyId')?.setValue(null, { emitEvent: false });
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

    if (role === 'MAINTENANCE_OFFICER' && officerType === 'CONTRACTOR_COMPANY') {
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
    const payload: UserManageRequest = {
      username: raw.username,
      email: raw.email,
      fullName: raw.fullName,
      phone: raw.phone || undefined,
      role: raw.role,
      propertyId: raw.propertyId || undefined,
      maintenanceOfficerType: raw.maintenanceOfficerType || undefined,
      maintenanceCompanyName: raw.maintenanceCompanyName || undefined,
      contractorCompanyId: raw.contractorCompanyId || undefined
    };
    if (raw.password) payload.password = raw.password;
    if (payload.role !== 'MAINTENANCE_OFFICER') {
      payload.maintenanceOfficerType = undefined;
      payload.maintenanceCompanyName = undefined;
      payload.contractorCompanyId = undefined;
    }
    if (payload.maintenanceOfficerType !== 'CONTRACTOR_COMPANY') {
      payload.maintenanceCompanyName = undefined;
      payload.contractorCompanyId = undefined;
    }
    if (payload.role !== 'TENANT' && payload.role !== 'PROPERTY_ADMIN' && payload.role !== 'MAINTENANCE_OFFICER') {
      payload.propertyId = undefined;
    }
    return payload;
  }
}
