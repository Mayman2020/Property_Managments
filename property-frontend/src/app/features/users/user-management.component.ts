import { Component, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';

import { I18nService } from '../../core/i18n/i18n.service';
import { MaintenanceOfficerType, User, UserRole } from '../../core/models/user.model';
import { Property, PropertyService } from '../../core/services/property.service';
import { SnackService } from '../../core/services/snack.service';
import { UserManageRequest, UserService } from '../../core/services/user.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    DatePipe,
    ReactiveFormsModule,
    TranslateModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    PageHeaderComponent
  ],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss'
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  properties: Property[] = [];
  searchTerm = '';

  loading = true;
  saving = false;
  showForm = false;
  editingId: number | null = null;
  togglingIds = new Set<number>();

  readonly roleOptions: UserRole[] = ['TENANT', 'MAINTENANCE_OFFICER', 'SUPER_ADMIN', 'PROPERTY_ADMIN'];
  readonly officerTypeOptions: MaintenanceOfficerType[] = ['INTERNAL_PROPERTY', 'CONTRACTOR_COMPANY'];

  form: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly userService: UserService,
    private readonly propertyService: PropertyService,
    private readonly snack: SnackService,
    private readonly i18n: I18nService
  ) {
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.minLength(6)]],
      fullName: ['', [Validators.required, Validators.maxLength(150)]],
      phone: ['', [Validators.maxLength(20)]],
      role: ['TENANT', Validators.required],
      propertyId: [null],
      maintenanceOfficerType: [null],
      maintenanceCompanyName: ['', [Validators.maxLength(180)]]
    });
  }

  ngOnInit(): void {
    this.form.get('role')?.valueChanges.subscribe((role) => this.applyRoleRules(role as UserRole));
    this.form.get('maintenanceOfficerType')?.valueChanges.subscribe(() => this.applyCompanyRule());
    this.applyRoleRules(this.form.get('role')?.value as UserRole);
    this.loadData();
  }

  loadData(): void {
    this.loadUsers();
    this.propertyService.getAll(0, 200).subscribe({
      next: (res) => {
        this.properties = res.data?.content ?? [];
      },
      error: () => {
        this.properties = [];
      }
    });
  }

  private loadUsers(): void {
    this.loading = true;
    this.userService.getAll(0, 200, this.searchTerm).subscribe({
      next: (res) => {
        this.users = res.data?.content ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.error(this.i18n.instant('USER_MGMT.LOAD_ERROR'));
      }
    });
  }

  startCreate(): void {
    this.showForm = true;
    this.editingId = null;
    this.form.reset({
      username: '',
      email: '',
      password: '',
      fullName: '',
      phone: '',
      role: 'TENANT',
      propertyId: null,
      maintenanceOfficerType: null,
      maintenanceCompanyName: ''
    });
    this.applyRoleRules('TENANT');
  }

  startEdit(user: User): void {
    this.showForm = true;
    this.editingId = user.id;
    this.form.reset({
      username: user.username ?? '',
      email: user.email ?? '',
      password: '',
      fullName: user.fullName ?? '',
      phone: user.phone ?? '',
      role: user.role,
      propertyId: user.propertyId ?? null,
      maintenanceOfficerType: user.maintenanceOfficerType ?? null,
      maintenanceCompanyName: user.maintenanceCompanyName ?? ''
    });
    this.applyRoleRules(user.role);
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.form.reset();
  }

  save(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildPayload();
    const isEdit = this.isEditing();
    this.saving = true;

    const req$ = this.editingId
      ? this.userService.update(this.editingId, payload)
      : this.userService.create(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.editingId = null;
        this.snack.success(this.i18n.instant(isEdit ? 'USER_MGMT.UPDATE_SUCCESS' : 'USER_MGMT.CREATE_SUCCESS'));
        this.loadData();
      },
      error: (err: Error) => {
        this.saving = false;
        this.snack.error(err.message || this.i18n.instant('USER_MGMT.SAVE_ERROR'));
      }
    });
  }

  toggleActive(user: User): void {
    if (this.togglingIds.has(user.id)) return;

    this.togglingIds.add(user.id);
    this.userService.toggleActive(user.id).subscribe({
      next: (res) => {
        this.togglingIds.delete(user.id);
        const idx = this.users.findIndex((u) => u.id === user.id);
        if (idx >= 0 && res.data) {
          this.users[idx] = res.data;
        }
        this.snack.success(this.i18n.instant('USER_MGMT.STATUS_UPDATED'));
      },
      error: (err: Error) => {
        this.togglingIds.delete(user.id);
        this.snack.error(err.message || this.i18n.instant('USER_MGMT.SAVE_ERROR'));
      }
    });
  }

  roleLabel(role: UserRole): string {
    return this.i18n.instant(`ROLE.${role}`);
  }

  officerTypeLabel(type?: MaintenanceOfficerType): string {
    if (!type) return '—';
    return this.i18n.instant(`MAINTENANCE_OFFICER_TYPE.${type}`);
  }

  propertyName(propertyId?: number): string {
    if (!propertyId) return '—';
    const prop = this.properties.find((p) => p.id === propertyId);
    return prop ? `${prop.propertyName} (${prop.propertyCode})` : '—';
  }

  isEditing(): boolean {
    return this.editingId !== null;
  }

  onSearch(value: string): void {
    this.searchTerm = value;
    this.loadUsers();
  }

  private applyRoleRules(role: UserRole): void {
    const propertyCtrl = this.form.get('propertyId');
    const officerTypeCtrl = this.form.get('maintenanceOfficerType');
    const companyCtrl = this.form.get('maintenanceCompanyName');

    if (!propertyCtrl || !officerTypeCtrl || !companyCtrl) return;

    if (role === 'TENANT' || role === 'PROPERTY_ADMIN') {
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
    }
    officerTypeCtrl.updateValueAndValidity({ emitEvent: false });
    this.applyCompanyRule();

    const passwordCtrl = this.form.get('password');
    if (!passwordCtrl) return;
    if (this.isEditing()) {
      passwordCtrl.setValidators([Validators.minLength(6)]);
    } else {
      passwordCtrl.setValidators([Validators.required, Validators.minLength(6)]);
    }
    passwordCtrl.updateValueAndValidity({ emitEvent: false });
  }

  private applyCompanyRule(): void {
    const role = this.form.get('role')?.value as UserRole;
    const officerType = this.form.get('maintenanceOfficerType')?.value as MaintenanceOfficerType | null;
    const companyCtrl = this.form.get('maintenanceCompanyName');
    if (!companyCtrl) return;

    if (role === 'MAINTENANCE_OFFICER' && officerType === 'CONTRACTOR_COMPANY') {
      companyCtrl.setValidators([Validators.required, Validators.maxLength(180)]);
    } else {
      companyCtrl.clearValidators();
      companyCtrl.setValue('', { emitEvent: false });
    }
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
      maintenanceCompanyName: raw.maintenanceCompanyName || undefined
    };

    if (raw.password) {
      payload.password = raw.password;
    }

    if (payload.role !== 'MAINTENANCE_OFFICER') {
      payload.maintenanceOfficerType = undefined;
      payload.maintenanceCompanyName = undefined;
    }
    if (payload.maintenanceOfficerType !== 'CONTRACTOR_COMPANY') {
      payload.maintenanceCompanyName = undefined;
    }
    if (payload.role !== 'TENANT' && payload.role !== 'PROPERTY_ADMIN') {
      payload.propertyId = undefined;
    }

    return payload;
  }

}
