import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { UploadZoneComponent } from '../../shared/components/upload-zone/upload-zone.component';
import { SnackService } from '../../core/services/snack.service';
import { UserProfileService } from '../../core/services/user-profile.service';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { User, UserRole } from '../../core/models/user.model';
import { UserProfileUpdateRequest } from '../../core/services/user-profile.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    NgClass,
    NgStyle,
    ReactiveFormsModule,
    RouterLink,
    TranslateModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
    UploadZoneComponent
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  private static readonly PORTAL_EMPLOYEE_ROLES: UserRole[] = [
    'PROPERTY_ADMIN',
    'MAINTENANCE_OFFICER',
    'CONTRACTS_OFFICER',
    'ACCOUNTANT',
    'HR_OFFICER'
  ];

  form: FormGroup;
  passwordForm: FormGroup;
  loading = false;
  saving = false;
  changingPassword = false;
  /** From owner / employee row (read-only on profile). */
  civilIdImageUrl = '';
  /** From tenant row: lease PDFs/images. */
  leaseContractFiles: string[] = [];

  constructor(
    private readonly fb: FormBuilder,
    private readonly profileService: UserProfileService,
    readonly auth: AuthService,
    private readonly snack: SnackService,
    readonly i18n: I18nService
  ) {
    this.form = this.fb.group({
      fullName: ['', [Validators.required, Validators.maxLength(150)]],
      phone: ['', [Validators.maxLength(20)]],
      profileImageUrl: ['', [Validators.maxLength(600)]],
      bio: ['', [Validators.maxLength(2000)]],
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

    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.loading = true;
    this.profileService.getMyProfile().subscribe({
      next: (res) => {
        const user = res.data as User | undefined;
        this.form.patchValue({
          fullName: user?.fullName ?? '',
          phone: user?.phone ?? '',
          profileImageUrl: user?.profileImageUrl ?? '',
          bio: user?.bio ?? ''
        });
        if (user) {
          this.patchLinkedRegistryForm(user);
        }
        this.civilIdImageUrl = user?.civilIdImageUrl?.trim() ?? '';
        this.leaseContractFiles = [...(user?.leaseContractFiles ?? [])];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.error(this.i18n.instant('PROFILE.LOAD_ERROR'));
      }
    });
  }

  save(): void {
    if (this.form.invalid || this.saving) return;
    if (this.roleKey === 'OWNER') {
      const ar = (this.form.get('ownerFullNameAr')?.value as string)?.trim();
      const en = (this.form.get('ownerFullNameEn')?.value as string)?.trim();
      if (!ar || !en) {
        this.snack.error(this.i18n.instant('PROFILE.OWNER_NAMES_REQUIRED'));
        return;
      }
    }
    this.saving = true;
    this.profileService.updateMyProfile(this.buildProfilePayload()).subscribe({
      next: (res) => {
        this.saving = false;
        const existing = this.auth.getCurrentUser();
        if (existing && res.data) {
          const d = res.data as User;
          const updated = {
            ...existing,
            fullName: d.fullName,
            phone: d.phone ?? existing.phone,
            profileImageUrl: d.profileImageUrl,
            bio: d.bio,
            civilIdImageUrl: d.civilIdImageUrl,
            leaseContractFiles: d.leaseContractFiles,
            initials: this.initialsFrom(d.fullName ?? existing.fullName)
          };
          localStorage.setItem('pm_current_user', JSON.stringify(updated));
          this.civilIdImageUrl = d.civilIdImageUrl?.trim() ?? '';
          this.leaseContractFiles = [...(d.leaseContractFiles ?? [])];
          this.patchLinkedRegistryForm(d);
        }
        this.snack.success(this.i18n.instant('PROFILE.SAVE_SUCCESS'));
      },
      error: () => {
        this.saving = false;
        this.snack.error(this.i18n.instant('PROFILE.SAVE_ERROR'));
      }
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid || this.changingPassword) return;

    const { newPassword, confirmPassword } = this.passwordForm.getRawValue();
    if (newPassword !== confirmPassword) {
      this.snack.error(this.i18n.instant('PROFILE.PASSWORD_MISMATCH'));
      return;
    }

    this.changingPassword = true;
    this.profileService.changeMyPassword(this.passwordForm.getRawValue()).subscribe({
      next: () => {
        this.changingPassword = false;
        this.passwordForm.reset();
        this.snack.success(this.i18n.instant('PROFILE.PASSWORD_CHANGED'));
      },
      error: (err: Error) => {
        this.changingPassword = false;
        this.snack.error(err.message || this.i18n.instant('PROFILE.PASSWORD_CHANGE_ERROR'));
      }
    });
  }

  onImageUploaded(urls: string[]): void {
    if (urls.length > 0) {
      this.form.patchValue({ profileImageUrl: urls[0] });
    }
  }

  get avatarText(): string {
    return this.form.get('fullName')?.value
      ? this.initialsFrom(this.form.get('fullName')?.value)
      : (this.auth.getCurrentUser()?.initials ?? 'U');
  }

  get roleKey(): string {
    return this.auth.getCurrentUser()?.role ?? 'TENANT';
  }

  get showLinkedRegistry(): boolean {
    const r = this.auth.getCurrentUser()?.role as UserRole | undefined;
    if (!r) return false;
    return r === 'OWNER' || r === 'TENANT' || ProfileComponent.PORTAL_EMPLOYEE_ROLES.includes(r);
  }

  private patchLinkedRegistryForm(user: User): void {
    const o = user.ownerLink;
    const t = user.tenantLink;
    const e = user.employeeLink;
    this.form.patchValue(
      {
        ownerFullNameAr: o?.fullNameAr ?? '',
        ownerFullNameEn: o?.fullNameEn ?? '',
        ownerNationalId: o?.nationalId ?? '',
        ownerAddress: o?.address ?? '',
        ownerNotes: o?.notes ?? '',
        tenantNationalId: t?.nationalId ?? '',
        tenantLeaseStart: this.toDateInput(t?.leaseStart),
        tenantLeaseEnd: this.toDateInput(t?.leaseEnd),
        tenantNotes: t?.notes ?? '',
        employeeNationalId: e?.nationalId ?? '',
        employeeJobTitleAr: e?.jobTitleAr ?? '',
        employeeJobTitleEn: e?.jobTitleEn ?? ''
      },
      { emitEvent: false }
    );
  }

  private toDateInput(v: string | null | undefined): string {
    if (v == null || v === '') return '';
    return String(v).slice(0, 10);
  }

  private buildProfilePayload(): UserProfileUpdateRequest {
    const v = this.form.getRawValue() as Record<string, string>;
    const role = this.auth.getCurrentUser()?.role as UserRole | undefined;
    const base: UserProfileUpdateRequest = {
      fullName: v['fullName'],
      phone: v['phone']?.trim() ? v['phone'].trim() : undefined,
      profileImageUrl: v['profileImageUrl']?.trim() ? v['profileImageUrl'].trim() : undefined,
      bio: v['bio']?.trim() ? v['bio'].trim() : undefined
    };
    if (role === 'OWNER') {
      base.ownerLink = {
        fullNameAr: (v['ownerFullNameAr'] ?? '').trim(),
        fullNameEn: (v['ownerFullNameEn'] ?? '').trim(),
        nationalId: (v['ownerNationalId'] ?? '').trim(),
        address: (v['ownerAddress'] ?? '').trim(),
        notes: (v['ownerNotes'] ?? '').trim()
      };
    } else if (role === 'TENANT') {
      base.tenantLink = {
        nationalId: (v['tenantNationalId'] ?? '').trim(),
        leaseStart: v['tenantLeaseStart'] ? v['tenantLeaseStart'] : null,
        leaseEnd: v['tenantLeaseEnd'] ? v['tenantLeaseEnd'] : null,
        notes: (v['tenantNotes'] ?? '').trim()
      };
    } else if (role && ProfileComponent.PORTAL_EMPLOYEE_ROLES.includes(role)) {
      base.employeeLink = {
        nationalId: (v['employeeNationalId'] ?? '').trim(),
        jobTitleAr: (v['employeeJobTitleAr'] ?? '').trim(),
        jobTitleEn: (v['employeeJobTitleEn'] ?? '').trim()
      };
    }
    return base;
  }

  get heroBannerStyle(): Record<string, string> | null {
    const u = this.form.get('profileImageUrl')?.value?.trim();
    if (!u) return null;
    return { 'background-image': `linear-gradient(120deg, rgba(15,23,42,.72), rgba(15,23,42,.35)), url(${u})` };
  }

  private initialsFrom(name: string): string {
    const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return 'U';
    return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  }
}
