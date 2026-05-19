import { Component, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { AuditLogItem, AuditService } from '../../../core/services/audit.service';

const ACTION_TYPES = [
  'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT',
  'ACTIVATE', 'DEACTIVATE', 'APPROVE', 'REJECT',
  'PAYMENT_RECORD', 'STATUS_CHANGE', 'EXPORT', 'PRINT'
];

const ENTITY_TYPES = [
  'EMPLOYEE', 'CONTRACT', 'UNIT', 'PROPERTY', 'TENANT',
  'USER', 'PAYMENT', 'MAINTENANCE', 'PAYROLL', 'LEAVE'
];

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [NgIf, NgFor, DatePipe, FormsModule, TranslateModule, MatProgressSpinnerModule, PageHeaderComponent, EmptyStateComponent],
  template: `
    <div class="app-page">
      <app-page-header
        [eyebrow]="'NAV.AUDIT_LOG' | translate"
        [title]="'AUDIT.TITLE' | translate"
        [subtitle]="'AUDIT.SUBTITLE' | translate">
      </app-page-header>

      <div class="finance-filter-strip">
        <label>{{ 'AUDIT.ACTION' | translate }}</label>
        <select [(ngModel)]="filterAction" (change)="load()" class="estate-property-select">
          <option value="">{{ 'COMMON.ALL' | translate }}</option>
          <option *ngFor="let a of actionTypes" [value]="a">{{ ('AUDIT.ACTION_TYPES.' + a) | translate }}</option>
        </select>
        <label>{{ 'AUDIT.ENTITY' | translate }}</label>
        <select [(ngModel)]="filterEntityType" (change)="load()" class="estate-property-select">
          <option value="">{{ 'COMMON.ALL' | translate }}</option>
          <option *ngFor="let e of entityTypes" [value]="e">{{ ('AUDIT.ENTITY_TYPES.' + e) | translate }}</option>
        </select>
      </div>

      <div class="loading-center" *ngIf="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div class="app-card" *ngIf="!loading">
        <div class="app-table-wrap" *ngIf="logs.length; else emptyTpl">
          <table class="app-data-table">
            <thead>
              <tr>
                <th>{{ 'AUDIT.USER' | translate }}</th>
                <th>{{ 'AUDIT.ACTION' | translate }}</th>
                <th>{{ 'AUDIT.ENTITY' | translate }}</th>
                <th>{{ 'AUDIT.DETAILS' | translate }}</th>
                <th>{{ 'AUDIT.TIMESTAMP' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of logs">
                <td>{{ item.userName || 'System' }}</td>
                <td><span class="status-badge" data-status="INFO">{{ item.action }}</span></td>
                <td>{{ item.entityType }} <span class="td-mono" *ngIf="item.entityId">#{{ item.entityId }}</span></td>
                <td>{{ item.entityLabel || item.notes || '—' }}</td>
                <td>{{ item.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ng-template #emptyTpl>
          <app-empty-state icon="history" [message]="'AUDIT.EMPTY_TITLE' | translate"></app-empty-state>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .finance-filter-strip {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
      margin: 0 0 16px; padding: 12px 16px;
      border: 1px solid var(--line, #e4d8c8); background: var(--surface, #fffdf8); border-radius: 8px;
    }
    .finance-filter-strip label { font-size: 13px; color: var(--text-muted, #888); white-space: nowrap; }
    .loading-center { display: flex; justify-content: center; padding: 60px 0; }
  `]
})
export class AuditLogComponent implements OnInit {
  logs: AuditLogItem[] = [];
  loading = false;
  filterAction = '';
  filterEntityType = '';

  readonly actionTypes = ACTION_TYPES;
  readonly entityTypes = ENTITY_TYPES;

  constructor(private readonly service: AuditService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    const params: Record<string, string | number> = { page: 0, size: 100 };
    if (this.filterAction) params['action'] = this.filterAction;
    if (this.filterEntityType) params['entityType'] = this.filterEntityType;
    this.service.getLogs(params).subscribe({
      next: (res) => { this.logs = res.data?.content ?? []; this.loading = false; },
      error: () => { this.logs = []; this.loading = false; }
    });
  }
}
