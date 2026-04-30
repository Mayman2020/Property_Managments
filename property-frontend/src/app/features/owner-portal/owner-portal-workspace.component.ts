import { Component, OnInit } from '@angular/core';
import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { OwnerDashboardDto, OwnerPortalService, OwnerPropertyItem, OwnerStatementItem } from '../../core/services/owner-portal.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-owner-portal-workspace',
  standalone: true,
  imports: [NgIf, NgFor, DecimalPipe, TranslateModule, PageHeaderComponent],
  template: `
    <div class="app-page">
      <app-page-header
        [eyebrow]="'OWNER_PORTAL.EYEBROW' | translate"
        [title]="title"
        [subtitle]="'OWNER_PORTAL.SUBTITLE' | translate">
      </app-page-header>

      <section class="stat-grid" *ngIf="section === 'dashboard' && dashboard">
        <article class="stat-card surface-glow">
          <div class="stat-content">
            <div class="stat-label">{{ 'OWNER_PORTAL.PROPERTIES_LABEL' | translate }}</div>
            <div class="stat-value">{{ dashboard.totalProperties }}</div>
          </div>
        </article>
        <article class="stat-card surface-glow">
          <div class="stat-content">
            <div class="stat-label">{{ 'OWNER_PORTAL.REVENUE_LABEL' | translate }}</div>
            <div class="stat-value">{{ dashboard.totalRevenue | number:'1.0-0' }}</div>
          </div>
        </article>
        <article class="stat-card surface-glow">
          <div class="stat-content">
            <div class="stat-label">{{ 'OWNER_PORTAL.EXPENSES_LABEL' | translate }}</div>
            <div class="stat-value">{{ dashboard.totalExpenses | number:'1.0-0' }}</div>
          </div>
        </article>
        <article class="stat-card surface-glow">
          <div class="stat-content">
            <div class="stat-label">{{ 'OWNER_PORTAL.OWNER_NET_LABEL' | translate }}</div>
            <div class="stat-value">{{ dashboard.ownerNetAmount | number:'1.0-0' }}</div>
          </div>
        </article>
      </section>

      <div class="app-card" *ngIf="section === 'statements'">
        <div class="app-table-wrap" *ngIf="statements.length; else emptyTpl">
          <table class="app-data-table">
            <thead>
              <tr>
                <th>{{ 'OWNER_PORTAL.PROPERTY_COL' | translate }}</th>
                <th>{{ 'OWNER_PORTAL.PERIOD_COL' | translate }}</th>
                <th>{{ 'OWNER_PORTAL.REVENUE_COL' | translate }}</th>
                <th>{{ 'OWNER_PORTAL.EXPENSE_COL' | translate }}</th>
                <th>{{ 'OWNER_PORTAL.OWNER_NET_LABEL' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of statements">
                <td>{{ item.propertyName || '-' }}</td>
                <td>{{ item.statementMonth }}/{{ item.statementYear }}</td>
                <td>{{ item.totalRevenue | number:'1.0-2' }}</td>
                <td>{{ item.totalExpenses | number:'1.0-2' }}</td>
                <td>{{ item.ownerNetAmount | number:'1.0-2' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="app-card" *ngIf="section === 'properties'">
        <div class="app-table-wrap" *ngIf="properties.length; else emptyTpl">
          <table class="app-data-table">
            <thead>
              <tr>
                <th>{{ 'OWNER_PORTAL.PROPERTY_COL' | translate }}</th>
                <th>{{ 'OWNER_PORTAL.CODE_COL' | translate }}</th>
                <th>{{ 'OWNER_PORTAL.UNITS_COL' | translate }}</th>
                <th>{{ 'OWNER_PORTAL.OCCUPIED_COL' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of properties">
                <td>{{ item.propertyName }}</td>
                <td>{{ item.propertyCode || '-' }}</td>
                <td>{{ item.totalUnits || 0 }}</td>
                <td>{{ item.occupiedUnits || 0 }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <ng-template #emptyTpl>
        <div class="app-empty-state">
          <span class="material-icons empty-icon">apartment</span>
          <h4>{{ 'OWNER_PORTAL.NO_DATA' | translate }}</h4>
          <p>{{ 'OWNER_PORTAL.NO_DATA_DESC' | translate }}</p>
        </div>
      </ng-template>
    </div>
  `
})
export class OwnerPortalWorkspaceComponent implements OnInit {
  section = 'dashboard';
  dashboard?: OwnerDashboardDto;
  statements: OwnerStatementItem[] = [];
  properties: OwnerPropertyItem[] = [];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly service: OwnerPortalService,
    private readonly translate: TranslateService
  ) {}

  get title(): string {
    if (this.section === 'statements') return this.translate.instant('OWNER_PORTAL.STATEMENTS_TITLE');
    if (this.section === 'properties') return this.translate.instant('OWNER_PORTAL.MY_PROPERTIES_TITLE');
    return this.translate.instant('OWNER_PORTAL.DASHBOARD_TITLE');
  }

  ngOnInit(): void {
    this.section = this.route.snapshot.data['section'] ?? 'dashboard';
    if (this.section === 'dashboard') this.service.getDashboard().subscribe({ next: (res) => { this.dashboard = res.data; }, error: () => { this.dashboard = undefined; } });
    if (this.section === 'statements') this.service.getStatements().subscribe({ next: (res) => { this.statements = res.data ?? []; }, error: () => { this.statements = []; } });
    if (this.section === 'properties') this.service.getProperties().subscribe({ next: (res) => { this.properties = res.data ?? []; }, error: () => { this.properties = []; } });
  }
}
