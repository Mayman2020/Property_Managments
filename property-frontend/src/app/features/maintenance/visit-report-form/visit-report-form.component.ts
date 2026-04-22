import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { UploadZoneComponent } from '../../../shared/components/upload-zone/upload-zone.component';
import { MaintenanceService } from '../../../core/services/maintenance.service';
import { SnackService } from '../../../core/services/snack.service';

@Component({
  selector: 'app-visit-report-form',
  standalone: true,
  imports: [
    NgFor, NgIf, ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatSelectModule,
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
    { value: 'COMPLETED', label: '✅ تمت الصيانة', icon: 'task_alt' },
    { value: 'TENANT_ABSENT', label: '🚪 المستأجر غائب', icon: 'person_off' },
    { value: 'NEEDS_PARTS', label: '🔧 يحتاج قطع غيار', icon: 'hardware' },
    { value: 'NEEDS_REVISIT', label: '🔄 تحتاج زيارة أخرى', icon: 'replay' },
    { value: 'CANCELLED_BY_TENANT', label: '❌ ألغى المستأجر', icon: 'cancel' },
    { value: 'OTHER', label: 'أخرى', icon: 'more_horiz' }
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly maintSvc: MaintenanceService,
    private readonly snack: SnackService,
    private readonly router: Router
  ) {
    this.form = this.fb.group({
      visitDate: ['', Validators.required],
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

  get hasPurchase(): boolean { return !!this.form.get('hasPurchase')?.value; }
  onReceiptUploaded(urls: string[]): void { this.receiptUrl = urls[0] ?? ''; }

  submit(): void {
    if (this.form.invalid || this.submitting) return;
    this.submitting = true;
    const payload = {
      ...this.form.value,
      receiptUrl: this.receiptUrl || undefined
    };
    this.maintSvc.submitVisitReport(this.requestId, payload).subscribe({
      next: () => {
        this.submitting = false;
        this.snack.success('تم حفظ تقرير الزيارة بنجاح');
        void this.router.navigateByUrl('/officer/requests');
      },
      error: (err: Error) => { this.submitting = false; this.snack.error(err.message || 'فشل حفظ التقرير'); }
    });
  }
}
