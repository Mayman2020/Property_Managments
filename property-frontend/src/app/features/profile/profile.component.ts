import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SnackService } from '../../core/services/snack.service';
import { UserProfileService } from '../../core/services/user-profile.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    NgIf,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    PageHeaderComponent
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  form: FormGroup;
  loading = false;
  saving = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly profileService: UserProfileService,
    private readonly auth: AuthService,
    private readonly snack: SnackService
  ) {
    this.form = this.fb.group({
      fullName: ['', [Validators.required, Validators.maxLength(150)]],
      phone: ['', [Validators.maxLength(20)]],
      profileImageUrl: ['', [Validators.maxLength(600)]],
      bio: ['', [Validators.maxLength(2000)]]
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
        this.snack.error('Failed to load profile');
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
        this.snack.success('Profile updated successfully');
      },
      error: () => {
        this.saving = false;
        this.snack.error('Failed to update profile');
      }
    });
  }

  private initialsFrom(name: string): string {
    const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return 'U';
    return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  }
}
