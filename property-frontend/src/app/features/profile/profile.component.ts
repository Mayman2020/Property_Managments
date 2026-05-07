import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import { IdentityMediaFieldsComponent } from '../../shared/components/identity-media-fields/identity-media-fields.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
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
    ReactiveFormsModule,
    RouterLink,
    TranslateModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    IdentityMediaFieldsComponent,
    PageHeaderComponent
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit, OnDestroy {
  private static readonly PORTAL_EMPLOYEE_ROLES: UserRole[] = [
    'GENERAL_MANAGER',
    'MAINTENANCE_OFFICER_INTERNAL',
    'MAINTENANCE_OFFICER_COMPANY',
    'MAINTENANCE_COMPANY',
    'ACCOUNTANT',
    'PROPERTY_GUARD',
    'PROCEDURES_CLERK'
  ];

  form: FormGroup;
  passwordForm: FormGroup;
  loading = false;
  saving = false;
  changingPassword = false;
  /** From owner / employee row (read-only on profile). */
  civilIdImageUrl = '';
  /** Shown in hero (read-only; login identifier). */
  accountEmail = '';
  accountUsername = '';
  dashboardHomeRoute = '/';
  private loadedUser: User | null = null;
  private roleSub?: Subscription;

  constructor(
    private readonly fb: FormBuilder,
    private readonly profileService: UserProfileService,
    readonly auth: AuthService,
    private readonly snack: SnackService,
    readonly i18n: I18nService,
    private readonly location: Location,
    private readonly router: Router
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
    this.roleSub = this.auth.activeRoleChanged.subscribe(() => {
      this.dashboardHomeRoute = this.resolveDashboardRoute();
      this.loadProfile();
    });
    this.dashboardHomeRoute = this.resolveDashboardRoute();
    this.loadProfile();
  }

  ngOnDestroy(): void {
    this.roleSub?.unsubscribe();
  }

  private loadProfile(): void {
    this.loading = true;
    this.profileService.getMyProfile().subscribe({
      next: (res) => {
        const user = res.data as User | undefined;
        this.loadedUser = user ?? null;
        this.accountEmail = (user?.email ?? this.auth.getCurrentUser()?.email ?? '').trim();
        this.accountUsername = (user?.username ?? '').trim();
        this.form.patchValue({
          fullName: this.localizedName(user),
          phone: user?.phone ?? '',
          profileImageUrl: user?.profileImageUrl ?? '',
          bio: user?.bio ?? ''
        });
        if (user) {
          this.patchLinkedRegistryForm(user);
        }
        this.civilIdImageUrl = user?.civilIdImageUrl?.trim() ?? '';
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.error(this.i18n.instant('PROFILE.LOAD_ERROR'));
      }
    });
  }

  goBack(): void {
    this.location.back();
  }

  roleLabel(): string {
    const r = this.auth.getRole() as UserRole | null;
    if (!r) return '';
    return this.i18n.instant(`ROLE.${r}`);
  }

  heroInitials(): string {
    const name = (this.form.get('fullName')?.value as string)?.trim()
      || this.localizedName(this.loadedUser)
      || this.localizedCurrentUserName()
      || '';
    const words = name.split(/\s+/).filter(Boolean);
    if (!words.length) return 'U';
    return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  }

  /** Hero preview: trimmed profile image URL or null when empty. */
  get heroProfileImageUrl(): string | null {
    const v = (this.form.get('profileImageUrl')?.value as string | undefined)?.trim();
    return v || null;
  }

  private resolveDashboardRoute(): string {
    const path = this.router.url.split('?')[0];
    if (path.includes('/admin/')) return '/admin/dashboard';
    if (path.includes('/officer/')) return '/officer/schedule';
    if (path.includes('/tenant/')) return '/tenant/my-unit';
    return '/';
  }

  private localizedName(user: User | undefined | null): string {
    if (!user) return '';
    const ar = (user.fullNameAr ?? user.tenantLink?.fullNameAr ?? user.ownerLink?.fullNameAr ?? '').trim();
    const en = (user.fullNameEn ?? user.tenantLink?.fullNameEn ?? user.ownerLink?.fullNameEn ?? '').trim();
    const fallback = (user.fullName ?? '').trim();
    return this.i18n.currentLang === 'ar'
      ? (ar || en || fallback)
      : (en || ar || fallback);
  }

  private localizedCurrentUserName(): string {
    const u = this.auth.getCurrentUser();
    if (!u) return '';
    const ar = (u.fullNameAr ?? '').trim();
    const en = (u.fullNameEn ?? '').trim();
    const fallback = (u.fullName ?? '').trim();
    return this.i18n.currentLang === 'ar'
      ? (ar || en || fallback)
      : (en || ar || fallback);
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
            fullNameAr: d.fullNameAr ?? d.tenantLink?.fullNameAr ?? d.ownerLink?.fullNameAr ?? existing.fullNameAr,
            fullNameEn: d.fullNameEn ?? d.tenantLink?.fullNameEn ?? d.ownerLink?.fullNameEn ?? existing.fullNameEn,
            phone: d.phone ?? existing.phone,
            profileImageUrl: d.profileImageUrl,
            bio: d.bio,
            civilIdImageUrl: d.civilIdImageUrl,
            leaseContractFiles: d.leaseContractFiles,
            initials: this.initialsFrom(this.localizedName(d) || d.fullName || existing.fullName)
          };
          localStorage.setItem('pm_current_user', JSON.stringify(updated));
          this.civilIdImageUrl = d.civilIdImageUrl?.trim() ?? '';
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

  onProfileImageUrlChange(url: string): void {
    this.form.patchValue({ profileImageUrl: url ?? '' });
  }

  get needsIdentityMedia(): boolean {
    const r = this.auth.getRole() as UserRole | null;
    if (!r) return false;
    return r === 'OWNER' || r === 'TENANT' || ProfileComponent.PORTAL_EMPLOYEE_ROLES.includes(r);
  }

  get showCivilSection(): boolean {
    return this.roleKey !== 'TENANT';
  }

  get roleKey(): string {
    return (this.auth.getRole() as UserRole | null) ?? 'TENANT';
  }

  get showLinkedRegistry(): boolean {
    const r = this.auth.getRole() as UserRole | null;
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
    const role = this.auth.getRole() as UserRole | null;
    const base: UserProfileUpdateRequest = {
      fullName: v['fullName'],
      phone: v['phone']?.trim() ? v['phone'].trim() : undefined,
      profileImageUrl: v['profileImageUrl']?.trim() ? v['profileImageUrl'].trim() : undefined,
      bio: v['bio']?.trim() ? v['bio'].trim() : undefined
    };
    if (this.needsIdentityMedia && this.showCivilSection) {
      base.civilIdImageUrl = this.civilIdImageUrl?.trim() ?? '';
    }
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

  private initialsFrom(name: string): string {
    const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return 'U';
    return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  }
}
