import { Component, OnInit } from '@angular/core';
import { Location, NgIf, NgFor, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';

import { MaintenanceService, MaintenanceRequest } from '../../../core/services/maintenance.service';
import { AuthService } from '../../../core/services/auth.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { PermissionService } from '../../../core/services/permission.service';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-request-detail',
  standalone: true,
  imports: [
    NgIf, NgFor, DatePipe, RouterLink, ReactiveFormsModule, TranslateModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule, MatMenuModule, MatTooltipModule
  ],
  templateUrl: './request-detail.component.html',
  styleUrl: './request-detail.component.scss'
})
export class RequestDetailComponent implements OnInit {
  request: MaintenanceRequest | null = null;
  visitReport: {
    visitDate: string;
    visitOutcome: string;
    workDone?: string;
    officerNotes?: string;
    hasPurchase: boolean;
    purchaseAmount?: number;
    purchaseNotes?: string;
  } | null = null;
  loading = true;
  actionLoading = false;

  showAssignPanel = false;
  showSchedulePanel = false;
  showRejectPanel = false;
  showRatingPanel = false;
  showContactDialog = false;

  officers: { id: number; fullName: string }[] = [];
  assignForm!: FormGroup;
  scheduleForm!: FormGroup;
  rejectForm!: FormGroup;
  ratingForm!: FormGroup;
  readonly ratingOptions = [
    { value: 1, icon: 'sentiment_very_dissatisfied', colorClass: 'very-unsatisfied', labelKey: 'RATING.SCALE.VERY_UNSATISFIED' },
    { value: 2, icon: 'sentiment_dissatisfied', colorClass: 'unsatisfied', labelKey: 'RATING.SCALE.UNSATISFIED' },
    { value: 3, icon: 'sentiment_satisfied', colorClass: 'satisfied', labelKey: 'RATING.SCALE.SATISFIED' },
    { value: 4, icon: 'sentiment_very_satisfied', colorClass: 'very-satisfied', labelKey: 'RATING.SCALE.VERY_SATISFIED' }
  ] as const;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly maintSvc: MaintenanceService,
    readonly i18n: I18nService,
    private readonly fb: FormBuilder,
    private readonly snack: MatSnackBar,
    readonly auth: AuthService,
    readonly permissions: PermissionService,
    private readonly userSvc: UserService,
    private readonly location: Location
  ) {}

  goBack(): void { this.location.back(); }

  ngOnInit(): void {
    this.buildForms();
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.load(id);
  }

  private buildForms(): void {
    this.assignForm = this.fb.group({ officerId: [null, Validators.required] });
    this.scheduleForm = this.fb.group({
      scheduledDate: [null, Validators.required],
      scheduledTimeFrom: ['09:00', Validators.required],
      scheduledTimeTo: ['11:00', Validators.required]
    });
    this.rejectForm = this.fb.group({ rejectionNote: ['', [Validators.required, Validators.minLength(5)]] });
    this.ratingForm = this.fb.group({ rating: [null, [Validators.required, Validators.min(1), Validators.max(4)]], comment: [''] });
  }

  private load(id: number): void {
    this.loading = true;
    this.maintSvc.getById(id).subscribe({
      next: (res) => {
        this.request = res.data;
        this.loading = false;
        this.assignForm.patchValue({ officerId: null }, { emitEvent: false });
        this.hydrateAssignableOfficers();
        this.loadVisitReport(id);
      },
      error: () => { this.loading = false; }
    });
  }

  private hydrateAssignableOfficers(): void {
    this.officers = [];
    const req = this.request;
    if (!req || req.status !== 'PENDING') return;

    const companyId = req.contractorCompanyId;
    if (companyId != null && req.assignedTo == null && req.propertyId != null) {
      this.userSvc.getMaintenanceAssignableContractors(req.propertyId, companyId).subscribe({
        next: (res) => {
          const list = res.data ?? [];
          this.officers = list.map((u: User) => ({ id: u.id, fullName: u.fullName }));
        },
        error: () => {
          this.officers = [];
        }
      });
      return;
    }

    if (this.auth.isAdmin()) {
      this.maintSvc.getOfficers().subscribe({
        next: (r) => {
          this.officers = (r.data?.content ?? []).map((o) => ({ id: o.id, fullName: o.fullName }));
        },
        error: () => {
          this.officers = [];
        }
      });
    }
  }

  private loadVisitReport(id: number): void {
    this.maintSvc.getVisitReport(id).subscribe({
      next: (res) => {
        this.visitReport = res.data ?? null;
      },
      error: () => {
        this.visitReport = null;
      }
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

  setRating(value: number): void {
    this.ratingForm.patchValue({ rating: value });
  }

  isRatingSelected(value: number): boolean {
    return Number(this.ratingForm.value.rating ?? 0) === value;
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

  openWhatsApp(phone: string | null | undefined): void {
    const normalized = this.whatsAppPhone(phone);
    if (!normalized) return;
    window.open(`https://web.whatsapp.com/send?phone=${normalized}`, '_blank', 'noopener');
    this.showContactDialog = false;
  }

  callOfficer(phone: string | null | undefined): void {
    const tel = this.cleanPhone(phone);
    if (!tel) return;
    window.location.href = `tel:${tel}`;
    this.showContactDialog = false;
  }

  get canAssign(): boolean {
    const req = this.request;
    if (!req || req.status !== 'PENDING') return false;
    if (this.auth.isAdmin() && this.permissions.can('maintenance', 'assign')) return true;
    if (this.auth.isOfficer() && req.contractorCompanyId != null && req.assignedTo == null) {
      const u = this.auth.getCurrentUser();
      if (!u?.contractorCompanyId || !u.propertyId) return false;
      return u.maintenanceOfficerType === 'CONTRACTOR_COMPANY'
        && u.contractorCompanyId === req.contractorCompanyId
        && u.propertyId === req.propertyId;
    }
    return false;
  }

  get canSchedule(): boolean {
    const hasPermission = this.auth.isAdmin()
      ? this.permissions.can('maintenance', 'schedule')
      : this.permissions.can('my_requests', 'schedule');

    return !!this.request
      && (this.auth.isAdmin() || this.auth.isOfficer())
      && hasPermission
      && (this.request.status === 'ASSIGNED' || this.request.status === 'NEEDS_REVISIT');
  }

  get canAcceptReject(): boolean {
    return !!this.request
      && this.auth.isTenant()
      && (this.permissions.can('my_requests', 'approve') || this.permissions.can('my_requests', 'reject'))
      && this.request.status === 'SCHEDULED'
      && this.request.scheduleAccepted == null;
  }

  get canStart(): boolean {
    return !!this.request
      && this.auth.isOfficer()
      && this.permissions.can('my_requests', 'start')
      && this.request.status === 'SCHEDULED';
  }

  get canSubmitReport(): boolean {
    return !!this.request
      && this.auth.isOfficer()
      && this.permissions.can('my_requests', 'submit')
      && this.request.status === 'IN_PROGRESS';
  }

  get canRate(): boolean {
    return !!this.request
      && this.auth.isTenant()
      && this.permissions.can('my_requests', 'rate')
      && (this.request.status === 'COMPLETED' || this.request.status === 'NEEDS_REVISIT');
  }

  get detailEyebrow(): string {
    return this.i18n.instant('INLINE_TEXT.OPERATIONS_2');
  }

  /** Visual for each dot: complete = green + check, current = spinner, upcoming = dim + index */
  get timelineSteps(): Array<{
    label: string;
    date: string;
    visual: 'complete' | 'current' | 'upcoming';
  }> {
    if (!this.request) return [];
    const request = this.request;
    const ar = this.i18n.currentLang === 'ar';
    const st = request.status;
    const cancelled = st === 'CANCELLED';

    const createdAt = request.createdAt ? this.formatDateTime(request.createdAt) : '—';
    const scheduledAt = request.scheduledDate
      ? `${this.formatDate(request.scheduledDate)}${request.scheduledTimeFrom ? ` · ${request.scheduledTimeFrom}` : ''}`
      : '—';
    const startedAt = st === 'IN_PROGRESS' || st === 'COMPLETED'
      ? (request.updatedAt ? this.formatDateTime(request.updatedAt) : (this.i18n.instant('INLINE_TEXT.IN_PROGRESS_2')))
      : '—';
    const completedAt = request.closedAt ? this.formatDateTime(request.closedAt) : '—';

    const assigned =
      (request.assignedTo != null && request.assignedTo > 0)
      || ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'NEEDS_REVISIT', 'TENANT_ABSENT'].includes(st);

    const stepDone = cancelled
      ? [false, false, false, false, false]
      : [
          st !== 'PENDING',
          assigned,
          !!request.scheduledDate,
          st === 'IN_PROGRESS' || st === 'COMPLETED',
          st === 'COMPLETED'
        ];

    const labels = [
      this.i18n.instant('INLINE_TEXT.SUBMITTED'),
      this.i18n.instant('INLINE_TEXT.REVIEWED_ASSIGNED'),
      this.i18n.instant('INLINE_TEXT.SCHEDULED'),
      this.i18n.instant('INLINE_TEXT.VISIT'),
      this.i18n.instant('INLINE_TEXT.COMPLETED_2')
    ];

    const dates = [
      createdAt,
      request.assignedOfficerName || '—',
      scheduledAt,
      startedAt,
      completedAt
    ];

    let firstOpen = stepDone.findIndex((d) => !d);
    if (firstOpen === -1) {
      firstOpen = 5;
    }

    return labels.map((label, i) => {
      let visual: 'complete' | 'current' | 'upcoming';
      if (cancelled) {
        visual = 'upcoming';
      } else if (stepDone[i]) {
        visual = 'complete';
      } else if (i === firstOpen) {
        visual = 'current';
      } else {
        visual = 'upcoming';
      }
      return { label, date: dates[i], visual };
    });
  }

  /** 0–100: how much of the spine between steps should appear completed (4 segments). */
  get timelineRailPercent(): number {
    if (!this.request) return 0;
    const st = this.request.status;
    if (st === 'CANCELLED') return 0;
    const assigned =
      (this.request.assignedTo != null && this.request.assignedTo > 0)
      || ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'NEEDS_REVISIT', 'TENANT_ABSENT'].includes(st);
    const segments = [
      st !== 'PENDING',
      assigned,
      !!this.request.scheduledDate,
      st === 'IN_PROGRESS' || st === 'COMPLETED'
    ];
    const n = segments.filter(Boolean).length;
    return (n / 4) * 100;
  }

  formatDate(date: string | null | undefined): string {
    if (!date) return '—';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return date;
    return this.i18n.formatDateTime(parsed, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatDateTime(date: string | null | undefined): string {
    if (!date) return '—';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return date;
    return this.i18n.formatDateTime(parsed, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  statusLabel(status: string): string { return this.i18n.instant(`STATUS.${status}`); }
  priorityLabel(priority: string): string { return this.i18n.instant(`PRIORITY.${priority}`); }

  private whatsAppPhone(phone: string | null | undefined): string {
    let digits = this.cleanPhone(phone).replace(/^\+/, '');
    if (digits.startsWith('00')) digits = digits.slice(2);
    if (digits.startsWith('0')) digits = digits.replace(/^0+/, '');
    if (digits.length === 8) digits = `966${digits}`;
    return digits;
  }

  private cleanPhone(phone: string | null | undefined): string {
    return (phone ?? '').replace(/[^\d+]/g, '');
  }
}
