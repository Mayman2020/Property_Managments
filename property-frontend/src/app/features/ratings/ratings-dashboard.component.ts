import { Component, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgFor, NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { DashboardService, RatingDashboardItem } from '../../core/services/dashboard.service';

interface PropertyFilterOption {
  id: number;
  name: string;
}

@Component({
  selector: 'app-ratings-dashboard',
  standalone: true,
  imports: [
    NgFor, NgIf, DatePipe, DecimalPipe, TranslateModule,
    MatButtonModule, MatDatepickerModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule, MatSelectModule,
    PageHeaderComponent, EmptyStateComponent
  ],
  templateUrl: './ratings-dashboard.component.html',
  styleUrl: './ratings-dashboard.component.scss'
})
export class RatingsDashboardComponent implements OnInit {
  loading = true;

  allRatings: RatingDashboardItem[] = [];
  filteredRatings: RatingDashboardItem[] = [];
  propertyOptions: PropertyFilterOption[] = [];

  selectedPropertyId: number | null = null;
  selectedStars: number | null = null;
  searchTerm = '';
  dateFrom: Date | null = null;
  dateTo: Date | null = null;

  readonly stars = [5, 4, 3, 2, 1];

  constructor(private readonly dashSvc: DashboardService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.dashSvc.getRatingsDetails().subscribe({
      next: (res) => {
        this.allRatings = res.data ?? [];
        this.propertyOptions = this.buildPropertyOptions(this.allRatings);
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    const query = this.searchTerm.trim().toLowerCase();
    const fromDate = this.dateFrom
      ? new Date(this.dateFrom.getFullYear(), this.dateFrom.getMonth(), this.dateFrom.getDate())
      : null;
    const toDateExclusive = this.dateTo
      ? new Date(this.dateTo.getFullYear(), this.dateTo.getMonth(), this.dateTo.getDate(), 23, 59, 59)
      : null;

    this.filteredRatings = this.allRatings.filter((item) => {
      if (this.selectedPropertyId && item.propertyId !== this.selectedPropertyId) return false;
      if (this.selectedStars && item.rating !== this.selectedStars) return false;

      const ratedAt = item.createdAt ? new Date(item.createdAt) : null;
      if (fromDate && ratedAt && ratedAt < fromDate) return false;
      if (toDateExclusive && ratedAt && ratedAt > toDateExclusive) return false;

      if (!query) return true;
      const haystack = [
        item.requestNumber ?? '',
        item.requestTitle ?? '',
        item.propertyName ?? '',
        item.unitNumber ?? '',
        item.tenantName ?? '',
        item.comment ?? ''
      ].join(' ').toLowerCase();

      return haystack.includes(query);
    });
  }

  resetFilters(): void {
    this.selectedPropertyId = null;
    this.selectedStars = null;
    this.searchTerm = '';
    this.dateFrom = null;
    this.dateTo = null;
    this.applyFilters();
  }

  starCount(star: number): number {
    return this.filteredRatings.filter((r) => r.rating === star).length;
  }

  barWidth(star: number): number {
    if (this.totalRatings === 0) return 0;
    return Math.round((this.starCount(star) / this.totalRatings) * 100);
  }

  starRange(n: number): number[] {
    return Array.from({ length: n }, (_, i) => i);
  }

  trackByRatingId(_: number, item: RatingDashboardItem): number {
    return item.id;
  }

  get totalRatings(): number {
    return this.filteredRatings.length;
  }

  get averageRating(): number {
    if (this.totalRatings === 0) return 0;
    const sum = this.filteredRatings.reduce((acc, item) => acc + (item.rating || 0), 0);
    return sum / this.totalRatings;
  }

  get satisfactionRate(): number {
    if (this.totalRatings === 0) return 0;
    const satisfied = this.filteredRatings.filter((r) => r.rating >= 4).length;
    return Math.round((satisfied / this.totalRatings) * 100);
  }

  get lowRatingsCount(): number {
    return this.filteredRatings.filter((r) => r.rating <= 2).length;
  }

  get recentRatings(): RatingDashboardItem[] {
    return this.filteredRatings.slice(0, 12);
  }

  private buildPropertyOptions(items: RatingDashboardItem[]): PropertyFilterOption[] {
    const map = new Map<number, string>();
    items.forEach((item) => {
      if (item.propertyId == null) return;
      if (!map.has(item.propertyId)) {
        map.set(item.propertyId, item.propertyName || `#${item.propertyId}`);
      }
    });

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}
