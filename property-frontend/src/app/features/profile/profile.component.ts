import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';
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
    PageHeaderComponent,
    UploadZoneComponent
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  form: FormGroup;
  passwordForm: FormGroup;
  loading = false;
  saving = false;
  changingPassword = false;

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
      bio: ['', [Validators.maxLength(2000)]]
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
        const user = res.data;
        this.form.patchValue({
          fullName: user?.fullName ?? '',
          phone: user?.phone ?? '',
          profileImageUrl: user?.profileImageUrl ?? '',
          bio: user?.bio ?? ''
        });
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
    this.saving = true;
    this.profileService.updateMyProfile(this.form.value).subscribe({
      next: (res) => {
        this.saving = false;
        const existing = this.auth.getCurrentUser();
        if (existing && res.data) {
          const updated = {
            ...existing,
            fullName: res.data.fullName,
            profileImageUrl: res.data.profileImageUrl,
            bio: res.data.bio,
            initials: this.initialsFrom(res.data.fullName ?? existing.fullName)
          };
          localStorage.setItem('pm_current_user', JSON.stringify(updated));
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

  private initialsFrom(name: string): string {
    const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return 'U';
    return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  }
}
