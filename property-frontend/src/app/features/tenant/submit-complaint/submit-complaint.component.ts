import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ComplaintService } from '../../../core/services/complaint.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LookupCacheService } from '../../../core/services/lookup-cache.service';
import { LookupItem } from '../../../core/services/lookup.service';

@Component({
  selector: 'app-submit-complaint',
  standalone: true,
  imports: [
    NgIf, NgFor, FormsModule,
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

      <div class="complaint-shell">
        <form class="complaint-card app-card" #complaintForm="ngForm" (ngSubmit)="submit(complaintForm)" novalidate>
          <div class="complaint-card-header">
            <span class="material-icons">report_problem</span>
            <div>
              <h3>{{ 'COMPLAINT.SUBMIT_TITLE' | translate }}</h3>
              <p>{{ 'COMPLAINT.SUBMIT_SUBTITLE' | translate }}</p>
            </div>
          </div>

          <div class="form-row">
            <label class="field-shell">
              <span>{{ 'COMPLAINT.SUBJECT_LABEL' | translate }} <b class="required">*</b></span>
              <input
                class="form-input"
                name="subject"
                [(ngModel)]="model.subject"
                required
                maxlength="200"
                [placeholder]="'COMPLAINT.SUBJECT_PLACEHOLDER' | translate">
            </label>
            <div class="field-error" *ngIf="complaintForm.submitted && complaintForm.controls['subject']?.invalid">
              {{ 'COMMON.REQUIRED' | translate }}
            </div>
          </div>

          <div class="form-row">
            <label class="field-shell">
              <span>{{ 'COMPLAINT.CATEGORY_LABEL' | translate }}</span>
              <select class="form-select" name="category" [(ngModel)]="model.category">
                <option value="">-</option>
                <option *ngFor="let type of complaintTypes" [value]="type.code">{{ lookupItemLabel(type) }}</option>
              </select>
            </label>
          </div>

          <div class="form-row">
            <label class="field-shell">
              <span>{{ 'COMPLAINT.DESCRIPTION_LABEL' | translate }} <b class="required">*</b></span>
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
            </label>
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
              <mat-spinner *ngIf="loading" diameter="18"></mat-spinner>
              <mat-icon *ngIf="!loading">send</mat-icon>
              {{ 'COMPLAINT.SUBMIT_BTN' | translate }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .complaint-shell { max-width: 880px; }
    .complaint-card {
      display: grid;
      gap: 20px;
      padding: 24px;
      animation: fadeUp 320ms ease both;
    }
    .complaint-card-header {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--line-2, #edf0f3);
    }
    .complaint-card-header > .material-icons {
      padding: 10px;
      border-radius: 10px;
      background: rgba(200, 154, 61, 0.1);
      color: var(--accent, #c89a3d);
      font-size: 28px;
    }
    .complaint-card-header h3 {
      margin: 0 0 4px;
      color: var(--text-main, #111827);
      font-size: 1.05rem;
      font-weight: 700;
    }
    .complaint-card-header p {
      margin: 0;
      color: var(--text-muted, #667085);
      font-size: 0.84rem;
    }
    .form-row { display: grid; gap: 6px; }
    .field-shell { display: grid; gap: 8px; }
    .field-shell span {
      color: var(--text-muted, #667085);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .required { color: var(--error, #d32f2f); }
    .form-input, .form-select, .form-textarea {
      width: 100%;
      min-height: 50px;
      padding: 12px 14px;
      border: 1px solid var(--line, #ddd);
      border-radius: 12px;
      font-size: 0.95rem;
      background: var(--surface-2, #fff);
      color: var(--text-primary, #222);
      box-sizing: border-box;
      transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
    }
    .form-input:focus, .form-select:focus, .form-textarea:focus {
      outline: none;
      border-color: var(--amber-500, #c89a3d);
      box-shadow: 0 0 0 3px rgba(200, 154, 61, 0.12);
      background: var(--surface, #fff);
    }
    .form-textarea { resize: vertical; min-height: 128px; }
    .field-error { font-size: 0.8rem; color: var(--error, #d32f2f); margin-top: 2px; }
    .form-actions { display: flex; gap: 12px; justify-content: flex-end; padding-top: 4px; }
    .navy-btn { background: var(--navy-800, #1a2744) !important; color: white !important; }
    .navy-btn mat-icon { margin-inline-end: 6px; font-size: 18px; }
    .navy-btn mat-spinner { display: inline-block; vertical-align: middle; margin-inline-end: 6px; }
    .success-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #e8f5e9;
      color: #2e7d32;
      border-radius: 8px;
      padding: 12px 16px;
      font-weight: 500;
    }
    .success-banner mat-icon { color: #2e7d32; }
    @media (max-width: 640px) {
      .complaint-card { padding: 18px; }
      .form-actions { flex-direction: column-reverse; align-items: stretch; }
    }
  `]
})
export class SubmitComplaintComponent implements OnInit {
  model = { subject: '', category: '', description: '' };
  loading = false;
  submitted = false;

  constructor(
    private readonly complaintSvc: ComplaintService,
    private readonly snack: SnackService,
    private readonly router: Router,
    readonly i18n: I18nService,
    private readonly lookupCache: LookupCacheService
  ) {}

  ngOnInit(): void {
    this.lookupCache.preload('COMPLAINT_TYPE').subscribe();
  }

  get complaintTypes(): LookupItem[] {
    return this.lookupCache.items('COMPLAINT_TYPE');
  }

  lookupItemLabel(item: LookupItem): string {
    return this.i18n.currentLang === 'ar' ? item.nameAr : item.nameEn;
  }

  submit(form: NgForm): void {
    if (form.invalid || this.loading) return;
    this.loading = true;
    this.complaintSvc.create({
      title: this.model.subject,
      complaintType: this.model.category || null,
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
