import { Component, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgFor, NgIf, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import {
  ComplaintRatingDashboardItem,
  DashboardService,
  RatingDashboardItem
} from '../../../core/services/dashboard.service';
import { Property, PropertyService } from '../../../core/services/property.service';
import { Unit, UnitService } from '../../../core/services/unit.service';
import { I18nService } from '../../../core/i18n/i18n.service';

interface PropertyFilterOption {
  id: number;
  name: string;
}

interface UnitFilterOption {
  id: number;
  name: string;
}

type RatingTab = 'visits' | 'complaints';

interface UnifiedRatingItem {
  id: number;
  sourceId: number;
  rating: number;
  ratingKey?: string;
  comment?: string;
  createdAt: string;
  number?: string;
  title?: string;
  type?: string;
  status?: string;
  priority?: string;
  propertyId?: number;
  propertyName?: string;
  propertyNameAr?: string;
  propertyNameEn?: string;
  unitId?: number;
  unitNumber?: string;
  tenantName?: string;
}

@Component({
  selector: 'app-ratings-dashboard',
  standalone: true,
  imports: [
    NgFor, NgIf, NgClass, DatePipe, DecimalPipe, FormsModule, TranslateModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule,
    PageHeaderComponent, EmptyStateComponent
  ],
  templateUrl: './ratings-dashboard.component.html',
  styleUrl: './ratings-dashboard.component.scss'
})
export class RatingsDashboardComponent implements OnInit {
  loading = true;

  visitRatings: UnifiedRatingItem[] = [];
  complaintRatings: UnifiedRatingItem[] = [];
  filteredRatings: UnifiedRatingItem[] = [];
  propertyOptions: PropertyFilterOption[] = [];
  unitOptions: UnitFilterOption[] = [];
  loadingUnits = false;

  activeTab: RatingTab = 'visits';
  selectedPropertyId: number | null = null;
  selectedUnitId: number | null = null;
  selectedStars: number | null = null;
  searchTerm = '';
  dateFromStr = '';
  dateToStr = '';

  readonly stars = [4, 3, 2, 1];

  constructor(
    private readonly dashSvc: DashboardService,
    private readonly propertySvc: PropertyService,
    private readonly unitSvc: UnitService,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    forkJoin({
      visits: this.dashSvc.getRatingsDetails(),
      complaints: this.dashSvc.getComplaintRatingsDetails(),
      properties: this.propertySvc.getAll(0, 500)
    }).subscribe({
      next: ({ visits, complaints, properties }) => {
        this.visitRatings = (visits.data ?? []).map((item) => this.mapVisitRating(item));
        this.complaintRatings = (complaints.data ?? []).map((item) => this.mapComplaintRating(item));
        this.propertyOptions = this.buildPropertyOptions(properties.data?.content ?? []);
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  setTab(tab: RatingTab): void {
    this.activeTab = tab;
    this.resetFilters();
  }

  applyFilters(): void {
    const query = this.searchTerm.trim().toLowerCase();
    const fromDate = this.dateFromStr ? new Date(this.dateFromStr) : null;
    const toDate = this.dateToStr ? new Date(this.dateToStr + 'T23:59:59') : null;

    this.filteredRatings = this.activeSource.filter((item) => {
      if (this.selectedPropertyId && item.propertyId !== this.selectedPropertyId) return false;
      if (this.selectedUnitId && item.unitId !== this.selectedUnitId) return false;
      if (this.selectedStars && item.rating !== this.selectedStars) return false;

      const ratedAt = item.createdAt ? new Date(item.createdAt) : null;
      if (fromDate && ratedAt && ratedAt < fromDate) return false;
      if (toDate && ratedAt && ratedAt > toDate) return false;

      if (!query) return true;
      const haystack = [
        item.number,
        item.title,
        item.type,
        item.status,
        item.priority,
        item.propertyName,
        item.propertyNameAr,
        item.propertyNameEn,
        item.unitNumber,
        item.tenantName,
        item.comment,
        item.ratingKey
      ].join(' ').toLowerCase();

      return haystack.includes(query);
    });
  }

  resetFilters(): void {
    this.selectedPropertyId = null;
    this.selectedUnitId = null;
    this.unitOptions = [];
    this.selectedStars = null;
    this.searchTerm = '';
    this.dateFromStr = '';
    this.dateToStr = '';
    this.applyFilters();
  }

  onPropertyChange(propertyId: number | null): void {
    this.selectedPropertyId = propertyId;
    this.selectedUnitId = null;
    this.unitOptions = [];
    if (propertyId) this.loadUnits(propertyId);
    this.applyFilters();
  }

  starCount(star: number): number {
    return this.filteredRatings.filter((r) => r.rating === star).length;
  }

  barWidth(star: number): number {
    if (this.totalRatings === 0) return 0;
    return Math.round((this.starCount(star) / this.totalRatings) * 100);
  }

  trackByRatingId(_: number, item: UnifiedRatingItem): number {
    return item.id;
  }

  get activeSource(): UnifiedRatingItem[] {
    return this.activeTab === 'visits' ? this.visitRatings : this.complaintRatings;
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
    const satisfied = this.filteredRatings.filter((r) => r.rating >= 3).length;
    return Math.round((satisfied / this.totalRatings) * 100);
  }

  get lowRatingsCount(): number {
    return this.filteredRatings.filter((r) => r.rating <= 2).length;
  }

  get recentRatings(): UnifiedRatingItem[] {
    return this.filteredRatings.slice(0, 20);
  }

  ratingLabel(item: UnifiedRatingItem): string {
    if (this.activeTab === 'complaints') {
      return this.complaintRatingLabel(item.ratingKey || '');
    }
    return `${item.rating} / 4`;
  }

  complaintRatingLabel(value: string): string {
    const ar = this.i18n.currentLang === 'ar';
    const map: Record<string, string> = {
      VERY_SATISFIED: this.i18n.instant('INLINE_TEXT.VERY_SATISFIED'),
      SATISFIED: this.i18n.instant('INLINE_TEXT.SATISFIED'),
      DISSATISFIED: this.i18n.instant('INLINE_TEXT.DISSATISFIED'),
      VERY_DISSATISFIED: this.i18n.instant('INLINE_TEXT.VERY_DISSATISFIED')
    };
    return map[value] ?? value;
  }

  tabTitle(): string {
    if (this.activeTab === 'complaints') {
      return this.i18n.instant('INLINE_TEXT.COMPLAINT_RATINGS');
    }
    return this.i18n.instant('INLINE_TEXT.VISIT_RATINGS');
  }

  private loadUnits(propertyId: number): void {
    this.loadingUnits = true;
    this.unitSvc.getByProperty(propertyId, 0, 500).subscribe({
      next: (res) => {
        this.unitOptions = (res.data?.content ?? [])
          .map((u) => ({ id: u.id, name: this.unitLabel(u) }))
          .sort((a, b) => a.name.localeCompare(b.name));
        this.loadingUnits = false;
      },
      error: () => {
        this.unitOptions = [];
        this.loadingUnits = false;
      }
    });
  }

  private buildPropertyOptions(items: Property[]): PropertyFilterOption[] {
    return items
      .map((p) => ({ id: p.id, name: this.propertyLabel(p) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private propertyLabel(p: Property): string {
    const ar = (p.propertyNameAr ?? '').trim();
    const en = (p.propertyNameEn ?? '').trim();
    const fallback = (p.propertyName ?? '').trim();
    return this.i18n.currentLang === 'ar'
      ? (ar || en || fallback || `#${p.id}`)
      : (en || ar || fallback || `#${p.id}`);
  }

  private unitLabel(u: Unit): string {
    const type = (u.unitType ?? '').trim();
    return type ? `${u.unitNumber} - ${type}` : u.unitNumber;
  }

  private mapVisitRating(item: RatingDashboardItem): UnifiedRatingItem {
    return {
      id: item.id,
      sourceId: item.requestId,
      rating: item.rating,
      comment: item.comment,
      createdAt: item.createdAt,
      number: item.requestNumber,
      title: item.requestTitle,
      propertyId: item.propertyId,
      propertyName: item.propertyName,
      propertyNameAr: item.propertyNameAr,
      propertyNameEn: item.propertyNameEn,
      unitId: item.unitId,
      unitNumber: item.unitNumber,
      tenantName: item.tenantName
    };
  }

  private mapComplaintRating(item: ComplaintRatingDashboardItem): UnifiedRatingItem {
    return {
      id: item.id,
      sourceId: item.complaintId,
      rating: this.complaintRatingScore(item.rating),
      ratingKey: item.rating,
      createdAt: item.ratedAt,
      number: `CMP-${String(item.complaintId).padStart(5, '0')}`,
      title: item.complaintTitle,
      type: item.complaintType,
      status: item.status,
      priority: item.priority,
      propertyId: item.propertyId,
      propertyName: item.propertyName,
      propertyNameAr: item.propertyNameAr,
      propertyNameEn: item.propertyNameEn,
      unitId: item.unitId,
      unitNumber: item.unitNumber,
      tenantName: item.tenantName
    };
  }

  private complaintRatingScore(value: string): number {
    const map: Record<string, number> = {
      VERY_SATISFIED: 4,
      SATISFIED: 3,
      DISSATISFIED: 2,
      VERY_DISSATISFIED: 1
    };
    return map[value] ?? 0;
  }
}
