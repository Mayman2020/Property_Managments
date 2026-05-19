import { Component, Inject, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

import { MaintenanceRequest, MaintenanceService, VisitReport } from '../../../core/services/maintenance.service';
import { I18nService } from '../../../core/i18n/i18n.service';

interface TimelineStep {
  icon: string;
  color: string;
  title: string;
  detail?: string;
  date?: string;
  done: boolean;
}

@Component({
  selector: 'app-request-timeline-dialog',
  standalone: true,
  imports: [NgIf, NgFor, DatePipe, MatDialogModule, MatButtonModule, MatProgressSpinnerModule, TranslateModule],
  template: `
    <h2 mat-dialog-title class="timeline-dialog-title">
      <span class="timeline-req-num">{{ req.requestNumber }}</span>
      {{ req.title }}
    </h2>
    <mat-dialog-content class="timeline-dialog-body">

      <div class="timeline-meta-row">
        <span class="status-badge" [attr.data-status]="req.status">{{ statusLabel(req.status) }}</span>
        <span class="priority-badge" [class]="req.priority">{{ priorityLabel(req.priority) }}</span>
        <span class="timeline-property">{{ req.propertyName || '' }}{{ req.unitNumber ? ' · ' + req.unitNumber : '' }}</span>
      </div>

      <p class="timeline-description" *ngIf="req.description">{{ req.description }}</p>

      <div class="loading-center" *ngIf="loadingReport">
        <mat-spinner diameter="32"></mat-spinner>
      </div>

      <ol class="timeline-list" *ngIf="!loadingReport">
        <li *ngFor="let step of steps" class="timeline-item" [class.done]="step.done">
          <div class="timeline-icon" [style.background]="step.done ? step.color : 'var(--surface-2)'">
            <span class="material-icons">{{ step.icon }}</span>
          </div>
          <div class="timeline-content">
            <div class="timeline-step-title">{{ step.title }}</div>
            <div class="timeline-step-detail" *ngIf="step.detail">{{ step.detail }}</div>
            <div class="timeline-step-date" *ngIf="step.date">{{ step.date | date:'dd/MM/yyyy' }}</div>
          </div>
        </li>
      </ol>

      <div class="timeline-tenant-notes" *ngIf="req.tenantNotes">
        <span class="material-icons">comment</span>
        <span>{{ req.tenantNotes }}</span>
      </div>

    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button (click)="ref.close()">{{ 'ACTIONS.CLOSE' | translate }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .timeline-dialog-title {
      display: flex;
      align-items: baseline;
      gap: 10px;
      font-size: 1.1rem;
    }
    .timeline-req-num {
      font-family: var(--font-mono, monospace);
      font-size: 0.78rem;
      color: var(--text-muted);
      opacity: .8;
    }
    mat-dialog-content.timeline-dialog-body {
      min-width: min(520px, 94vw);
      max-height: 70vh;
      padding-top: 4px;
    }
    .timeline-meta-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }
    .timeline-property {
      font-size: 0.82rem;
      color: var(--text-muted);
    }
    .timeline-description {
      font-size: 0.88rem;
      color: var(--text-muted);
      margin-bottom: 20px;
      line-height: 1.5;
    }
    .timeline-list {
      list-style: none;
      padding: 0;
      margin: 0;
      position: relative;
    }
    .timeline-list::before {
      content: '';
      position: absolute;
      inset-inline-start: 17px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: var(--line);
    }
    .timeline-item {
      display: flex;
      gap: 14px;
      align-items: flex-start;
      padding-bottom: 22px;
      position: relative;
      opacity: .45;
    }
    .timeline-item.done {
      opacity: 1;
    }
    .timeline-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      flex-shrink: 0;
      background: var(--surface-2);
      border: 2px solid var(--card-border);
      z-index: 1;
    }
    .timeline-icon .material-icons {
      font-size: 18px;
      color: #fff;
    }
    .timeline-content {
      padding-top: 6px;
    }
    .timeline-step-title {
      font-weight: 600;
      font-size: 0.9rem;
    }
    .timeline-step-detail {
      font-size: 0.82rem;
      color: var(--text-muted);
      margin-top: 3px;
    }
    .timeline-step-date {
      font-size: 0.76rem;
      color: var(--text-subtle);
      margin-top: 3px;
    }
    .timeline-tenant-notes {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 10px 14px;
      border-radius: 10px;
      background: var(--surface-2);
      margin-top: 16px;
      font-size: 0.84rem;
      color: var(--text-muted);
    }
    .timeline-tenant-notes .material-icons {
      font-size: 16px;
      margin-top: 2px;
      flex-shrink: 0;
    }
    .loading-center {
      display: grid;
      place-items: center;
      padding: 32px;
    }
  `]
})
export class RequestTimelineDialogComponent implements OnInit {
  loadingReport = true;
  visitReport?: VisitReport;
  steps: TimelineStep[] = [];

  constructor(
    readonly ref: MatDialogRef<RequestTimelineDialogComponent>,
    @Inject(MAT_DIALOG_DATA) readonly req: MaintenanceRequest,
    private readonly maintSvc: MaintenanceService,
    private readonly i18n: I18nService
  ) {}

  get isAr(): boolean { return this.i18n.currentLang === 'ar'; }

  ngOnInit(): void {
    this.maintSvc.getVisitReport(this.req.id).subscribe({
      next: (res) => { this.visitReport = res.data; this.buildSteps(); this.loadingReport = false; },
      error: () => { this.buildSteps(); this.loadingReport = false; }
    });
  }

  statusLabel(status: string): string { return this.i18n.instant(`STATUS.${status}`); }
  priorityLabel(priority: string): string { return this.i18n.instant(`PRIORITY.${priority}`); }

  private buildSteps(): void {
    const r = this.req;
    const ar = this.isAr;
    const reached = (s: string) => this.hasReached(r.status, s);

    this.steps = [
      {
        icon: 'report_problem',
        color: '#6366f1',
        title: this.i18n.instant('INLINE_TEXT.REQUEST_SUBMITTED'),
        detail: r.tenantName ? (ar ? `بواسطة: ${r.tenantName}` : `By: ${r.tenantName}`) : undefined,
        date: r.createdAt,
        done: true
      },
      {
        icon: 'assignment_ind',
        color: '#0ea5e9',
        title: this.i18n.instant('INLINE_TEXT.ASSIGNED_TO_OFFICER'),
        detail: r.assignedOfficerName ? (ar ? `المسؤول: ${r.assignedOfficerName}` : `Officer: ${r.assignedOfficerName}`) : undefined,
        done: !!r.assignedTo
      },
      {
        icon: 'event',
        color: '#f59e0b',
        title: this.i18n.instant('INLINE_TEXT.VISIT_SCHEDULED'),
        detail: r.scheduledDate ? `${r.scheduledDate}${r.scheduledTimeFrom ? ' · ' + r.scheduledTimeFrom : ''}` : undefined,
        done: !!r.scheduledDate
      },
      {
        icon: r.scheduleAccepted === false ? 'event_busy' : 'event_available',
        color: r.scheduleAccepted === false ? '#ef4444' : '#10b981',
        title: r.scheduleAccepted === false
          ? (this.i18n.instant('INLINE_TEXT.TENANT_REJECTED_SCHEDULE'))
          : (this.i18n.instant('INLINE_TEXT.TENANT_ACCEPTED_SCHEDULE')),
        detail: r.scheduleRejectionNote || undefined,
        done: r.scheduleAccepted !== undefined && r.scheduleAccepted !== null
      },
      {
        icon: 'construction',
        color: '#f97316',
        title: this.i18n.instant('INLINE_TEXT.WORK_IN_PROGRESS'),
        done: reached('IN_PROGRESS')
      },
      {
        icon: 'task_alt',
        color: '#22c55e',
        title: this.i18n.instant('INLINE_TEXT.WORK_COMPLETED'),
        detail: this.visitReport?.workDone || undefined,
        date: this.visitReport?.visitDate,
        done: reached('COMPLETED')
      },
      {
        icon: 'lock',
        color: '#8b5cf6',
        title: this.i18n.instant('INLINE_TEXT.REQUEST_CLOSED'),
        date: r.closedAt || undefined,
        done: !!r.closedAt
      }
    ];
  }

  private hasReached(current: string, target: string): boolean {
    const order = ['PENDING', 'ASSIGNED', 'SCHEDULED', 'IN_PROGRESS', 'NEEDS_REVISIT', 'COMPLETED', 'CANCELLED'];
    const ci = order.indexOf(current);
    const ti = order.indexOf(target);
    return ci >= ti && ti !== -1;
  }
}
