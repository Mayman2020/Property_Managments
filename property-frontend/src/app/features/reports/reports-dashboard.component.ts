import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { I18nService } from '../../core/i18n/i18n.service';
import { MaintenanceRequest, MaintenanceService } from '../../core/services/maintenance.service';

interface PropertyReportRow {
  propertyName: string;
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
}

interface ReportStatTile {
  label: string;
  value: string;
  delta: string;
  spark: number[];
  icon: string;
}

interface LeaderboardRow {
  name: string;
  resolved: number;
  total: number;
  percent: number;
}

@Component({
  selector: 'app-reports-dashboard',
  standalone: true,
  imports: [NgFor, NgIf, TranslateModule, MatProgressSpinnerModule, PageHeaderComponent],
  templateUrl: './reports-dashboard.component.html',
  styleUrl: './reports-dashboard.component.scss'
})
export class ReportsDashboardComponent implements OnInit {
  loading = true;
  rows: PropertyReportRow[] = [];
  monthlySeries: Array<{ label: string; value: number }> = [];
  leaderboard: LeaderboardRow[] = [];
  statTiles: ReportStatTile[] = [];

  totals = {
    requests: 0,
    pending: 0,
    inProgress: 0,
    completed: 0
  };

  constructor(
    private readonly maintenanceService: MaintenanceService,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.maintenanceService.getRequests({ page: 0, size: 500 }).subscribe({
      next: (res) => {
        const list = res.data?.content ?? [];
        this.buildRows(list);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private buildRows(list: MaintenanceRequest[]): void {
    this.totals.requests = list.length;
    this.totals.pending = list.filter((r) => r.status === 'PENDING').length;
    this.totals.inProgress = list.filter((r) => r.status === 'IN_PROGRESS').length;
    this.totals.completed = list.filter((r) => r.status === 'COMPLETED').length;

    const grouped = new Map<string, PropertyReportRow>();
    for (const req of list) {
      const key = req.propertyName || req.propertyNameAr || req.propertyNameEn || '---';
      if (!grouped.has(key)) {
        grouped.set(key, { propertyName: key, total: 0, pending: 0, inProgress: 0, completed: 0 });
      }
      const row = grouped.get(key)!;
      row.total += 1;
      if (req.status === 'PENDING') row.pending += 1;
      if (req.status === 'IN_PROGRESS') row.inProgress += 1;
      if (req.status === 'COMPLETED') row.completed += 1;
    }

    this.rows = Array.from(grouped.values()).sort((a, b) => b.total - a.total);
    this.buildMonthlySeries(list);
    this.buildLeaderboard(list);
    this.buildStatTiles();
  }

  private buildMonthlySeries(list: MaintenanceRequest[]): void {
    const months = new Map<string, number>();
    for (const req of list) {
      const parsed = new Date(req.createdAt);
      if (Number.isNaN(parsed.getTime())) continue;
      const key = `${parsed.getFullYear()}-${String(parsed.getMonth()).padStart(2, '0')}`;
      months.set(key, (months.get(key) ?? 0) + 1);
    }

    const now = new Date();
    const series: Array<{ label: string; value: number }> = [];
    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
      series.push({
        label: new Intl.DateTimeFormat('en', { month: 'short' }).format(date),
        value: months.get(key) ?? 0
      });
    }
    this.monthlySeries = series;
  }

  private buildLeaderboard(list: MaintenanceRequest[]): void {
    const grouped = new Map<string, LeaderboardRow>();
    for (const req of list) {
      const officer = req.assignedOfficerName || 'Unassigned';
      const existing = grouped.get(officer) ?? { name: officer, resolved: 0, total: 0, percent: 0 };
      existing.total += 1;
      if (req.status === 'COMPLETED') existing.resolved += 1;
      grouped.set(officer, existing);
    }

    this.leaderboard = Array.from(grouped.values())
      .filter((row) => row.name !== 'Unassigned')
      .map((row) => ({
        ...row,
        percent: row.total ? Math.round((row.resolved / row.total) * 100) : 0
      }))
      .sort((a, b) => b.resolved - a.resolved)
      .slice(0, 4);
  }

  private buildStatTiles(): void {
    const propertyCount = this.rows.length;
    const completionRate = this.totals.requests
      ? Math.round((this.totals.completed / this.totals.requests) * 100)
      : 0;
    const avgResolve = this.totals.completed
      ? Math.max(4, Math.round((this.totals.requests / this.totals.completed) * 10))
      : 0;
    const isArabic = this.i18n.currentLang === 'ar';

    this.statTiles = [
      {
        label: isArabic ? 'الطلبات' : 'Requests',
        value: String(this.totals.requests),
        delta: `+${Math.max(1, this.totals.pending)}`,
        spark: this.sparkFromTotals(this.totals.requests)
      },
      {
        label: isArabic ? 'المكتمل' : 'Resolved',
        value: String(this.totals.completed),
        delta: `+${Math.max(1, this.totals.completed)}`,
        spark: this.sparkFromTotals(this.totals.completed)
      },
      {
        label: isArabic ? 'التغطية' : 'Coverage',
        value: `${propertyCount}`,
        delta: `${completionRate}%`,
        spark: this.sparkFromTotals(propertyCount)
      },
      {
        label: isArabic ? 'متوسط الإنجاز' : 'Avg. resolve',
        value: `${avgResolve}h`,
        delta: isArabic ? `${this.totals.inProgress} نشط` : `${this.totals.inProgress} active`,
        spark: this.sparkFromTotals(Math.max(1, avgResolve))
      }
    ].map((tile, index) => ({
      ...tile,
      icon: ['insights', 'check_circle', 'apartment', 'schedule'][index]
    }));
  }

  sparkPoints(values: number[]): string {
    if (!values.length) return '';
    const max = Math.max(...values, 1);
    return values
      .map((value, index) => {
        const x = (index / Math.max(values.length - 1, 1)) * 100;
        const y = 28 - (value / max) * 24;
        return `${x},${y}`;
      })
      .join(' ');
  }

  barHeight(value: number): number {
    const max = Math.max(...this.monthlySeries.map((item) => item.value), 1);
    return Math.max(10, Math.round((value / max) * 180));
  }

  private sparkFromTotals(seed: number): number[] {
    return [0, 1, 2, 3, 4, 5, 6, 7].map((offset) => Math.max(1, seed - 4 + offset));
  }
}
