import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf, DecimalPipe } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { DashboardService, RatingsSummary } from '../../core/services/dashboard.service';

@Component({
  selector: 'app-ratings-dashboard',
  standalone: true,
  imports: [NgFor, NgIf, DecimalPipe, TranslateModule, MatProgressSpinnerModule, MatIconModule, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './ratings-dashboard.component.html',
  styleUrl: './ratings-dashboard.component.scss'
})
export class RatingsDashboardComponent implements OnInit {
  summary: RatingsSummary | null = null;
  loading = true;

  readonly stars = [5, 4, 3, 2, 1];

  constructor(private readonly dashSvc: DashboardService) {}

  ngOnInit(): void {
    this.dashSvc.getRatingsSummary().subscribe({
      next: (r) => { this.summary = r.data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  starCount(star: number): number {
    if (!this.summary) return 0;
    const map: Record<number, number> = {
      1: this.summary.oneStar, 2: this.summary.twoStar,
      3: this.summary.threeStar, 4: this.summary.fourStar, 5: this.summary.fiveStar
    };
    return map[star] ?? 0;
  }

  barWidth(star: number): number {
    if (!this.summary || this.summary.totalRatings === 0) return 0;
    return Math.round((this.starCount(star) / this.summary.totalRatings) * 100);
  }

  starRange(n: number): number[] {
    return Array.from({ length: n }, (_, i) => i);
  }
}
