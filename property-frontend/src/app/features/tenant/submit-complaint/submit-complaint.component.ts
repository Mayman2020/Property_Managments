import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ComplaintService } from '../../../core/services/complaint.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-submit-complaint',
  standalone: true,
  imports: [
    NgIf, FormsModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    TranslateModule, PageHeaderComponent
  ],
  template: `
    <div class="app-page">
      <app-page-header
        [title]="'COMPLAINT.SUBMIT_TITLE' | translate"
        [subtitle]="'COMPLAINT.SUBMIT_SUBTITLE' | translate"
        [breadcrumbs]="[
          { label: ('NAV.MY_UNIT' | translate), route: '/tenant/my-unit' },
          { label: ('COMPLAINT.SUBMIT_TITLE' | translate) }
        ]">
      </app-page-header>

      <div class="app-card" style="max-width: 680px;">
        <form #complaintForm="ngForm" (ngSubmit)="submit(complaintForm)" novalidate>
          <div class="form-row">
            <label class="form-label">{{ 'COMPLAINT.SUBJECT_LABEL' | translate }} <span class="required">*</span></label>
            <input
              class="form-input"
              name="subject"
              [(ngModel)]="model.subject"
              required
              maxlength="200"
              [placeholder]="'COMPLAINT.SUBJECT_PLACEHOLDER' | translate">
            <div class="field-error" *ngIf="complaintForm.submitted && complaintForm.controls['subject']?.invalid">
              {{ 'COMMON.REQUIRED' | translate }}
            </div>
          </div>

          <div class="form-row">
            <label class="form-label">{{ 'COMPLAINT.CATEGORY_LABEL' | translate }}</label>
            <select class="form-select" name="category" [(ngModel)]="model.category">
              <option value="">—</option>
              <option value="MAINTENANCE">{{ 'COMPLAINT.CAT_MAINTENANCE' | translate }}</option>
              <option value="NOISE">{{ 'COMPLAINT.CAT_NOISE' | translate }}</option>
              <option value="CLEANLINESS">{{ 'COMPLAINT.CAT_CLEANLINESS' | translate }}</option>
              <option value="BILLING">{{ 'COMPLAINT.CAT_BILLING' | translate }}</option>
              <option value="MANAGEMENT">{{ 'COMPLAINT.CAT_MANAGEMENT' | translate }}</option>
              <option value="OTHER">{{ 'COMPLAINT.CAT_OTHER' | translate }}</option>
            </select>
          </div>

          <div class="form-row">
            <label class="form-label">{{ 'COMPLAINT.DESCRIPTION_LABEL' | translate }} <span class="required">*</span></label>
            <textarea
              class="form-textarea"
              name="description"
              [(ngModel)]="model.description"
              required
              minlength="10"
              maxlength="2000"
              rows="6"
              [placeholder]="'COMPLAINT.DESCRIPTION_PLACEHOLDER' | translate">
            </textarea>
            <div class="field-error" *ngIf="complaintForm.submitted && complaintForm.controls['description']?.invalid">
              {{ 'COMMON.REQUIRED' | translate }}
            </div>
          </div>

          <div class="success-banner" *ngIf="submitted">
            <mat-icon>check_circle</mat-icon>
            {{ 'COMPLAINT.SUBMITTED_SUCCESS' | translate }}
          </div>

          <div class="form-actions">
            <button mat-stroked-button type="button" (click)="goBack()" [disabled]="loading">
              {{ 'ACTIONS.CANCEL' | translate }}
            </button>
            <button mat-flat-button type="submit" class="navy-btn" [disabled]="loading || submitted">
              <mat-spinner *ngIf="loading" diameter="18" style="display:inline-block;vertical-align:middle;margin-inline-end:6px;"></mat-spinner>
              <mat-icon *ngIf="!loading">send</mat-icon>
              {{ 'COMPLAINT.SUBMIT_BTN' | translate }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .form-row { display: flex; flex-direction: column; gap: 6px; margin-bottom: 20px; }
    .form-label { font-size: 0.875rem; font-weight: 500; color: var(--text-secondary, #555); }
    .required { color: var(--error, #d32f2f); }
    .form-input, .form-select, .form-textarea {
      width: 100%; padding: 10px 14px; border: 1px solid var(--line, #ddd);
      border-radius: 8px; font-size: 0.95rem; background: var(--surface, #fff);
      color: var(--text-primary, #222); box-sizing: border-box;
      transition: border-color 0.2s;
    }
    .form-input:focus, .form-select:focus, .form-textarea:focus {
      outline: none; border-color: var(--navy-800, #1a2744);
    }
    .form-textarea { resize: vertical; min-height: 120px; }
    .field-error { font-size: 0.8rem; color: var(--error, #d32f2f); margin-top: 2px; }
    .form-actions { display: flex; gap: 12px; justify-content: flex-end; padding-top: 8px; }
    .navy-btn { background: var(--navy-800, #1a2744) !important; color: white !important; }
    .navy-btn mat-icon { margin-inline-end: 6px; font-size: 18px; }
    .success-banner {
      display: flex; align-items: center; gap: 10px;
      background: #e8f5e9; color: #2e7d32; border-radius: 8px;
      padding: 12px 16px; margin-bottom: 16px; font-weight: 500;
    }
    .success-banner mat-icon { color: #2e7d32; }
  `]
})
export class SubmitComplaintComponent {
  model = { subject: '', category: '', description: '' };
  loading = false;
  submitted = false;

  constructor(
    private readonly complaintSvc: ComplaintService,
    private readonly snack: SnackService,
    private readonly router: Router,
    readonly i18n: I18nService
  ) {}

  submit(form: NgForm): void {
    if (form.invalid || this.loading) return;
    this.loading = true;
    this.complaintSvc.create({
      subject: this.model.subject,
      category: this.model.category || null,
      description: this.model.description
    }).subscribe({
      next: () => {
        this.loading = false;
        this.submitted = true;
        this.snack.success(this.i18n.instant('COMPLAINT.SUBMITTED_SUCCESS'));
        setTimeout(() => this.router.navigate(['/tenant/my-unit']), 2000);
      },
      error: () => {
        this.loading = false;
        this.snack.error(this.i18n.instant('COMMON.ERROR'));
      }
    });
  }

  goBack(): void {
    void this.router.navigate(['/tenant/my-unit']);
  }
}
