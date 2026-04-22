import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { UploadZoneComponent } from '../../../shared/components/upload-zone/upload-zone.component';
import { MaintenanceService } from '../../../core/services/maintenance.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-visit-report-form',
  standalone: true,
  imports: [
    NgFor, NgIf, ReactiveFormsModule, RouterLink, TranslateModule,
    MatDatepickerModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatCheckboxModule, MatProgressSpinnerModule,
    PageHeaderComponent, UploadZoneComponent
  ],
  templateUrl: './visit-report-form.component.html',
  styleUrl: './visit-report-form.component.scss'
})
export class VisitReportFormComponent implements OnInit {
  form: FormGroup;
  submitting = false;
  requestId = 0;
  receiptUrl = '';

  readonly outcomes = [
    { value: 'COMPLETED', labelKey: 'VISIT.OUTCOME_COMPLETED', icon: 'task_alt' },
    { value: 'TENANT_ABSENT', labelKey: 'VISIT.OUTCOME_ABSENT', icon: 'person_off' },
    { value: 'NEEDS_PARTS', labelKey: 'VISIT.OUTCOME_NEEDS_PARTS', icon: 'hardware' },
    { value: 'NEEDS_REVISIT', labelKey: 'VISIT.OUTCOME_REVISIT', icon: 'replay' },
    { value: 'CANCELLED_BY_TENANT', labelKey: 'VISIT.OUTCOME_CANCELLED_BY_TENANT', icon: 'cancel' },
    { value: 'OTHER', labelKey: 'VISIT.OUTCOME_OTHER', icon: 'more_horiz' }
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly maintSvc: MaintenanceService,
    private readonly snack: SnackService,
    private readonly i18n: I18nService,
    private readonly router: Router
  ) {
    this.form = this.fb.group({
      visitDate: [null, Validators.required],
      visitOutcome: ['', Validators.required],
      workDone: [''],
      officerNotes: [''],
      hasPurchase: [false],
      purchaseAmount: [null],
      purchaseNotes: ['']
    });
  }

  ngOnInit(): void {
    this.requestId = Number(this.route.snapshot.paramMap.get('id'));
  }

  get hasPurchase(): boolean {
    return !!this.form.get('hasPurchase')?.value;
  }

  private toDateString(d: Date | string | null): string | undefined {
    if (!d) return undefined;
    if (typeof d === 'string') return d;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  onReceiptUploaded(urls: string[]): void {
    this.receiptUrl = urls[0] ?? '';
  }

  submit(): void {
    if (this.form.invalid || this.submitting) return;
    this.submitting = true;
    const raw = this.form.value;
    const payload = {
      ...raw,
      visitDate: this.toDateString(raw.visitDate),
      receiptUrl: this.receiptUrl || undefined
    };
    this.maintSvc.submitVisitReport(this.requestId, payload).subscribe({
      next: () => {
        this.submitting = false;
        this.snack.success(this.i18n.instant('VISIT.SAVE_SUCCESS'));
        void this.router.navigateByUrl('/officer/requests');
      },
      error: (err: Error) => {
        this.submitting = false;
        this.snack.error(err.message || this.i18n.instant('VISIT.SAVE_ERROR'));
      }
    });
  }
}
