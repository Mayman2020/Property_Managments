import { Component, OnInit } from '@angular/core';
import { NgIf, NgFor, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { MaintenanceService, MaintenanceRequest } from '../../../core/services/maintenance.service';
import { AuthService } from '../../../core/services/auth.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-request-detail',
  standalone: true,
  imports: [
    NgIf, NgFor, DatePipe, RouterLink, ReactiveFormsModule, TranslateModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule,
    PageHeaderComponent
  ],
  templateUrl: './request-detail.component.html',
  styleUrl: './request-detail.component.scss'
})
export class RequestDetailComponent implements OnInit {
  request: MaintenanceRequest | null = null;
  loading = true;
  actionLoading = false;

  showAssignPanel = false;
  showSchedulePanel = false;
  showRejectPanel = false;
  showRatingPanel = false;

  officers: { id: number; fullName: string }[] = [];
  assignForm!: FormGroup;
  scheduleForm!: FormGroup;
  rejectForm!: FormGroup;
  ratingForm!: FormGroup;
  ratingStars = [1, 2, 3, 4, 5];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly maintSvc: MaintenanceService,
    private readonly i18n: I18nService,
    private readonly fb: FormBuilder,
    private readonly snack: MatSnackBar,
    readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    this.buildForms();
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.load(id);
    if (this.auth.isAdmin()) {
      this.maintSvc.getOfficers().subscribe({ next: r => this.officers = r.data?.content ?? [] });
    }
  }

  private buildForms(): void {
    this.assignForm = this.fb.group({ officerId: [null, Validators.required] });
    this.scheduleForm = this.fb.group({
      scheduledDate: [null, Validators.required],
      scheduledTimeFrom: ['09:00', Validators.required],
      scheduledTimeTo: ['11:00', Validators.required]
    });
    this.rejectForm = this.fb.group({ rejectionNote: ['', [Validators.required, Validators.minLength(5)]] });
    this.ratingForm = this.fb.group({ rating: [null, [Validators.required, Validators.min(1), Validators.max(5)]], comment: [''] });
  }

  private load(id: number): void {
    this.loading = true;
    this.maintSvc.getById(id).subscribe({
      next: (res) => { this.request = res.data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  assign(): void {
    if (this.assignForm.invalid || !this.request) return;
    this.actionLoading = true;
    this.maintSvc.assign(this.request.id, this.assignForm.value.officerId).subscribe({
      next: (r) => { this.request = r.data; this.showAssignPanel = false; this.actionLoading = false; },
      error: () => { this.actionLoading = false; }
    });
  }

  scheduleVisit(): void {
    if (this.scheduleForm.invalid || !this.request) return;
    const v = this.scheduleForm.value;
    const date = v.scheduledDate instanceof Date
      ? v.scheduledDate.toISOString().split('T')[0]
      : v.scheduledDate;
    this.actionLoading = true;
    this.maintSvc.schedule(this.request.id, {
      scheduledDate: date,
      scheduledTimeFrom: v.scheduledTimeFrom,
      scheduledTimeTo: v.scheduledTimeTo
    }).subscribe({
      next: (r) => { this.request = r.data; this.showSchedulePanel = false; this.actionLoading = false; },
      error: () => { this.actionLoading = false; }
    });
  }

  acceptSchedule(): void {
    if (!this.request) return;
    this.actionLoading = true;
    this.maintSvc.acceptSchedule(this.request.id).subscribe({
      next: (r) => { this.request = r.data; this.actionLoading = false; },
      error: () => { this.actionLoading = false; }
    });
  }

  rejectSchedule(): void {
    if (this.rejectForm.invalid || !this.request) return;
    this.actionLoading = true;
    this.maintSvc.rejectSchedule(this.request.id, this.rejectForm.value.rejectionNote).subscribe({
      next: (r) => { this.request = r.data; this.showRejectPanel = false; this.actionLoading = false; },
      error: () => { this.actionLoading = false; }
    });
  }

  startWork(): void {
    if (!this.request) return;
    this.actionLoading = true;
    this.maintSvc.startWork(this.request.id).subscribe({
      next: (r) => { this.request = r.data; this.actionLoading = false; },
      error: () => { this.actionLoading = false; }
    });
  }

  setRating(star: number): void {
    this.ratingForm.patchValue({ rating: star });
  }

  submitRating(): void {
    if (this.ratingForm.invalid || !this.request) return;
    this.actionLoading = true;
    this.maintSvc.submitRating(this.request.id, this.ratingForm.value).subscribe({
      next: () => {
        this.showRatingPanel = false;
        this.actionLoading = false;
        this.snack.open(this.i18n.instant('RATING.SUBMITTED'), '', { duration: 3000 });
      },
      error: () => { this.actionLoading = false; }
    });
  }

  get canAssign(): boolean { return !!this.request && this.auth.isAdmin() && this.request.status === 'PENDING'; }
  get canSchedule(): boolean { return !!this.request && (this.auth.isAdmin() || this.auth.isOfficer()) && (this.request.status === 'ASSIGNED' || this.request.status === 'NEEDS_REVISIT'); }
  get canAcceptReject(): boolean { return !!this.request && this.auth.isTenant() && this.request.status === 'SCHEDULED' && this.request.scheduleAccepted == null; }
  get canStart(): boolean { return !!this.request && this.auth.isOfficer() && this.request.status === 'SCHEDULED'; }
  get canSubmitReport(): boolean { return !!this.request && this.auth.isOfficer() && this.request.status === 'IN_PROGRESS'; }
  get canRate(): boolean { return !!this.request && this.auth.isTenant() && (this.request.status === 'COMPLETED' || this.request.status === 'NEEDS_REVISIT'); }

  statusLabel(status: string): string { return this.i18n.instant(`STATUS.${status}`); }
  priorityLabel(priority: string): string { return this.i18n.instant(`PRIORITY.${priority}`); }
}
