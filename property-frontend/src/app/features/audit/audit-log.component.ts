import { Component, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { AuditLogItem, AuditService } from '../../core/services/audit.service';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [NgIf, NgFor, DatePipe, TranslateModule, PageHeaderComponent],
  template: `
    <div class="app-page">
      <app-page-header
        [eyebrow]="'NAV.AUDIT_LOG' | translate"
        [title]="'AUDIT.TITLE' | translate"
        [subtitle]="'AUDIT.SUBTITLE' | translate">
      </app-page-header>

      <div class="app-card">
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
                <td>{{ item.createdAt | date:'dd/MM/yyyy' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <ng-template #emptyTpl>
        <div class="app-empty-state">
          <span class="material-icons empty-icon">history</span>
          <h4>{{ 'AUDIT.EMPTY_TITLE' | translate }}</h4>
          <p>{{ 'AUDIT.EMPTY_MSG' | translate }}</p>
        </div>
      </ng-template>
    </div>
  `
})
export class AuditLogComponent implements OnInit {
  logs: AuditLogItem[] = [];

  constructor(private readonly service: AuditService) {}

  ngOnInit(): void {
    this.service.getLogs({ page: 0, size: 50 }).subscribe({
      next: (res) => { this.logs = res.data?.content ?? []; },
      error: () => { this.logs = []; }
    });
  }
}
