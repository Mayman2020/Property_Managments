import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { UserProfileService } from '../../../core/services/user-profile.service';
import { SnackService } from '../../../core/services/snack.service';

function passwordsMustMatch(group: FormGroup): { [key: string]: boolean } | null {
  const np = group.get('newPassword')?.value;
  const cp = group.get('confirmPassword')?.value;
  return np && cp && np !== cp ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatProgressSpinnerModule, TranslateModule],
  templateUrl: './change-password.component.html'
})
export class ChangePasswordComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  hideCurrentPw = true;
  hideNewPw = true;
  hideConfirmPw = true;

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly profileService: UserProfileService,
    private readonly snack: SnackService,
    private readonly router: Router,
    readonly translate: TranslateService
  ) {}

  ngOnInit(): void {
    if (this.auth.isAuthenticated() && !this.auth.mustChangePassword()) {
      void this.router.navigateByUrl(this.auth.getDashboardRoute());
      return;
    }
    if (!this.auth.isAuthenticated()) {
      void this.router.navigateByUrl('/auth/login');
      return;
    }
    this.form = this.fb.group(
      {
        currentPassword: ['', [Validators.required]],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]]
      },
      { validators: passwordsMustMatch }
    );
  }

  submit(): void {
    if (this.form.invalid || this.loading) return;
    this.loading = true;
    this.profileService.changeMyPassword(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading = false;
        this.snack.success(this.translate.instant('CHANGE_PW.SUCCESS'));
        this.auth.logout();
      },
      error: (err: { message?: string }) => {
        this.loading = false;
        this.snack.error(err.message || this.translate.instant('CHANGE_PW.ERROR'));
      }
    });
  }

  get currentPassword() { return this.form.get('currentPassword'); }
  get newPassword() { return this.form.get('newPassword'); }
  get confirmPassword() { return this.form.get('confirmPassword'); }
  get passwordMismatch(): boolean {
    return !!(this.form.errors?.['passwordMismatch'] && this.confirmPassword?.touched);
  }
  get isRtl(): boolean { return this.translate.currentLang === 'ar'; }
}
