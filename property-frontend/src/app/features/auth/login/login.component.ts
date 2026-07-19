import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIf, AsyncPipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { AuthService } from '../../../core/services/auth.service';
import { PermissionService } from '../../../core/services/permission.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { of, switchMap } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    NgIf, AsyncPipe, ReactiveFormsModule, TranslateModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  form: FormGroup;
  loading = false;
  showPassword = false;
  error = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly permissions: PermissionService,
    private readonly router: Router,
    private readonly snack: SnackService,
    readonly i18n: I18nService
  ) {
    this.form = this.fb.group({
      email: ['admin', Validators.required],
      password: ['', Validators.required]
    });

    if (this.auth.isAuthenticated()) {
      void this.router.navigateByUrl(this.auth.getDashboardRoute());
    }
  }

  get emailCtrl() { return this.form.get('email')!; }
  get passwordCtrl() { return this.form.get('password')!; }

  submit(): void {
    if (this.form.invalid || this.loading) return;
    this.loading = true;
    this.error = '';

    this.auth.login(this.form.value).pipe(
      switchMap(() => {
        if (this.auth.mustChangePassword()) return of(null);
        return this.permissions.loadMine();
      })
    ).subscribe({
      next: () => {
        this.loading = false;
        if (this.auth.mustChangePassword()) {
          void this.router.navigateByUrl('/change-password');
        } else {
          void this.router.navigateByUrl(this.auth.getDashboardRoute());
        }
      },
      error: (err: any) => {
        this.loading = false;
        const isAuthError = err?.status === 401 || err?.status === 400;
        this.error = isAuthError
          ? this.i18n.instant('AUTH.INVALID_CREDENTIALS')
          : err.message || this.i18n.instant('AUTH.LOGIN_FAILED');
        this.snack.error(this.error);
      }
    });
  }
}
