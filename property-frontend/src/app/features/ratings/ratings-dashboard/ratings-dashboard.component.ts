import { Component, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgFor, NgIf, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, forkJoin, of } from 'rxjs';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EstateLovOption, EstateLovSelectComponent } from '../../../shared/components/estate-lov-select/estate-lov-select.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import {
  ComplaintRatingDashboardItem,
  DashboardService,
  RatingDashboardItem
} from '../../../core/services/dashboard.service';
import { Property, PropertyService } from '../../../core/services/property.service';
import { Unit, UnitService } from '../../../core/services/unit.service';
import { Tenant, TenantService } from '../../../core/services/tenant.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LookupCacheService } from '../../../core/services/lookup-cache.service';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';

interface PropertyFilterOption {
  id: number;
  name: string;
}

interface UnitFilterOption {
  id: number;
  name: string;
}

interface TenantFilterOption {
  id: number;
  nationalId: string;
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
  tenantNameAr?: string;
  tenantNameEn?: string;
  tenantId?: number;
  tenantNationalId?: string;
  categoryNameAr?: string;
  categoryNameEn?: string;
  requestStatus?: string;
}

@Component({
  selector: 'app-ratings-dashboard',
  standalone: true,
  imports: [
    NgFor, NgIf, NgClass, DatePipe, DecimalPipe, FormsModule, TranslateModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule,
    PageHeaderComponent, EmptyStateComponent, EstateLovSelectComponent, TablePagerComponent
  ],
  templateUrl: './ratings-dashboard.component.html',
  styleUrl: './ratings-dashboard.component.scss'
})
export class RatingsDashboardComponent implements OnInit {
  loading = true;
  loadError = false;

  visitRatings: UnifiedRatingItem[] = [];
  complaintRatings: UnifiedRatingItem[] = [];
  filteredRatings: UnifiedRatingItem[] = [];
  propertyOptions: PropertyFilterOption[] = [];
  unitOptions: UnitFilterOption[] = [];
  tenantOptions: TenantFilterOption[] = [];
  loadingUnits = false;
  loadingTenants = false;

  activeTab: RatingTab = 'visits';
  selectedPropertyId: number | null = null;
  selectedUnitId: number | null = null;
  selectedTenantId: number | null = null;
  selectedStars: number | null = null;
  dateFromStr = '';
  dateToStr = '';
  selectedRating: UnifiedRatingItem | null = null;
  pageIndex = 0;

  readonly stars = [4, 3, 2, 1];
  readonly pageSize = 6;

  constructor(
    private readonly dashSvc: DashboardService,
    private readonly propertySvc: PropertyService,
    private readonly unitSvc: UnitService,
    private readonly tenantSvc: TenantService,
    private readonly lookupCache: LookupCacheService,
    private readonly snack: SnackService,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loadError = false;
    forkJoin({
      visits: this.dashSvc.getRatingsDetails().pipe(catchError(() => of({ data: [] as RatingDashboardItem[] }))),
      complaints: this.dashSvc.getComplaintRatingsDetails().pipe(catchError(() => of({ data: [] as ComplaintRatingDashboardItem[] }))),
      properties: this.propertySvc.getAll(0, 500).pipe(catchError(() => of({ data: { content: [] as Property[] } }))),
      tenants: this.tenantSvc.getAll(0, 500).pipe(catchError(() => of({ data: { content: [] as Tenant[] } }))),
      lookups: this.lookupCache.preload(
        'COMPLAINT_TYPE',
        'COMPLAINT_STATUS',
        'COMPLAINT_PRIORITY',
        'MAINTENANCE_REQUEST_STATUS',
        'UNIT_TYPE'
      ).pipe(catchError(() => of(undefined)))
    }).subscribe({
      next: ({ visits, complaints, properties, tenants }) => {
        this.visitRatings = (visits.data ?? []).map((item) => this.mapVisitRating(item));
        this.complaintRatings = (complaints.data ?? []).map((item) => this.mapComplaintRating(item));
        this.propertyOptions = this.buildPropertyOptions(properties.data?.content ?? []);
        this.tenantOptions = this.buildTenantOptions(tenants.data?.content ?? []);
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.loadError = true;
        this.loading = false;
        this.snack.error(this.i18n.instant('RATINGS_DASHBOARD.LOAD_ERROR'));
      }
    });
  }

  setTab(tab: RatingTab): void {
    this.activeTab = tab;
    this.selectedRating = null;
    this.resetFilters();
  }

  applyFilters(): void {
    const fromDate = this.dateFromStr ? new Date(this.dateFromStr) : null;
    const toDate = this.dateToStr ? new Date(this.dateToStr + 'T23:59:59') : null;

    this.filteredRatings = this.activeSource.filter((item) => {
      if (this.selectedPropertyId && item.propertyId !== this.selectedPropertyId) return false;
      if (this.selectedUnitId && item.unitId !== this.selectedUnitId) return false;
      if (this.selectedTenantId && item.tenantId !== this.selectedTenantId) return false;
      if (this.selectedStars && item.rating !== this.selectedStars) return false;

      const ratedAt = item.createdAt ? new Date(item.createdAt) : null;
      if (fromDate && ratedAt && ratedAt < fromDate) return false;
      if (toDate && ratedAt && ratedAt > toDate) return false;

      return true;
    });

    if (this.pageIndex > 0 && this.pageIndex >= Math.ceil(this.filteredRatings.length / this.pageSize)) {
      this.pageIndex = 0;
    }

    if (this.selectedRating && !this.filteredRatings.some((item) => item.id === this.selectedRating?.id)) {
      this.selectedRating = null;
    }
  }

  resetFilters(): void {
    this.selectedRating = null;
    this.selectedPropertyId = null;
    this.selectedUnitId = null;
    this.selectedTenantId = null;
    this.unitOptions = [];
    this.selectedStars = null;
    this.dateFromStr = '';
    this.dateToStr = '';
    this.pageIndex = 0;
    this.reloadTenants();
    this.applyFilters();
  }

  goToPage(pageIndex: number): void {
    this.pageIndex = pageIndex;
    this.selectedRating = null;
  }

  onPropertyChange(propertyId: number | null): void {
    this.selectedPropertyId = propertyId;
    this.selectedUnitId = null;
    this.selectedTenantId = null;
    this.unitOptions = [];
    this.pageIndex = 0;
    if (propertyId) this.loadUnits(propertyId);
    this.reloadTenants(propertyId ?? undefined);
    this.applyFilters();
  }

  onTenantChange(tenantId: number | null): void {
    this.selectedTenantId = tenantId;
    this.pageIndex = 0;
    this.applyFilters();
  }

  onUnitChange(unitId: number | null): void {
    this.selectedUnitId = unitId;
    this.pageIndex = 0;
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

  openDetails(item: UnifiedRatingItem): void {
    this.selectedRating = item;
  }

  closeDetails(): void {
    this.selectedRating = null;
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

  get pagedRatings(): UnifiedRatingItem[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredRatings.slice(start, start + this.pageSize);
  }

  get emptyMessageKey(): string {
    return this.activeTab === 'complaints'
      ? 'RATINGS_DASHBOARD.NO_COMPLAINT_RATINGS_MSG'
      : 'RATINGS_DASHBOARD.NO_VISIT_RATINGS_MSG';
  }

  ratingLabel(item: UnifiedRatingItem): string {
    if (this.activeTab === 'complaints') {
      return this.complaintRatingLabel(item.ratingKey || '');
    }
    return this.visitRatingLabel(this.visitRatingScore(item.rating));
  }

  visitRatingLabel(score: number): string {
    const map: Record<number, string> = {
      4: this.i18n.instant('INLINE_TEXT.VERY_SATISFIED'),
      3: this.i18n.instant('INLINE_TEXT.SATISFIED'),
      2: this.i18n.instant('INLINE_TEXT.DISSATISFIED'),
      1: this.i18n.instant('INLINE_TEXT.VERY_DISSATISFIED')
    };
    return map[score] ?? '-';
  }

  complaintRatingLabel(value: string): string {
    const map: Record<string, string> = {
      VERY_SATISFIED: this.i18n.instant('INLINE_TEXT.VERY_SATISFIED'),
      SATISFIED: this.i18n.instant('INLINE_TEXT.SATISFIED'),
      DISSATISFIED: this.i18n.instant('INLINE_TEXT.DISSATISFIED'),
      VERY_DISSATISFIED: this.i18n.instant('INLINE_TEXT.VERY_DISSATISFIED'),
      EXCELLENT: this.i18n.instant('RATINGS_DASHBOARD.RATING_EXCELLENT'),
      VERY_GOOD: this.i18n.instant('RATINGS_DASHBOARD.RATING_VERY_GOOD'),
      GOOD: this.i18n.instant('RATINGS_DASHBOARD.RATING_GOOD'),
      FAIR: this.i18n.instant('RATINGS_DASHBOARD.RATING_FAIR'),
      POOR: this.i18n.instant('RATINGS_DASHBOARD.RATING_POOR')
    };
    return map[value] ?? value;
  }

  tenantDisplayName(item: UnifiedRatingItem): string {
    const ar = (item.tenantNameAr ?? '').trim();
    const en = (item.tenantNameEn ?? '').trim();
    const fallback = (item.tenantName ?? '').trim();
    return this.i18n.currentLang === 'ar'
      ? (ar || en || fallback || '-')
      : (en || ar || fallback || '-');
  }

  categoryDisplayName(item: UnifiedRatingItem): string {
    const ar = (item.categoryNameAr ?? '').trim();
    const en = (item.categoryNameEn ?? '').trim();
    return this.i18n.currentLang === 'ar'
      ? (ar || en || '-')
      : (en || ar || '-');
  }

  statusLabel(item: UnifiedRatingItem): string {
    if (!item.status && !item.requestStatus) return '-';
    if (this.activeTab === 'complaints' && item.status) {
      return this.lookupCache.label('COMPLAINT_STATUS', item.status) || item.status;
    }
    if (item.requestStatus) {
      return this.lookupCache.label('MAINTENANCE_REQUEST_STATUS', item.requestStatus) || item.requestStatus;
    }
    return '-';
  }

  priorityLabel(value?: string | null): string {
    if (!value) return '-';
    return this.lookupCache.label('COMPLAINT_PRIORITY', value) || value;
  }

  detailCategoryLabel(): string {
    return this.activeTab === 'complaints'
      ? this.i18n.instant('COMPLAINT.COL_TYPE')
      : this.i18n.instant('RATINGS_DASHBOARD.CATEGORY');
  }

  detailCategoryValue(item: UnifiedRatingItem): string {
    if (this.activeTab === 'complaints') {
      return this.complaintTypeLabel(item.type);
    }
    return this.categoryDisplayName(item);
  }

  propertyDisplayName(item: UnifiedRatingItem): string {
    const ar = (item.propertyNameAr ?? '').trim();
    const en = (item.propertyNameEn ?? '').trim();
    const fallback = (item.propertyName ?? '').trim();
    return this.i18n.currentLang === 'ar'
      ? (ar || en || fallback || '-')
      : (en || ar || fallback || '-');
  }

  detailTypeLabel(): string {
    return this.activeTab === 'complaints'
      ? this.i18n.instant('INLINE_TEXT.COMPLAINTS')
      : this.i18n.instant('INLINE_TEXT.VISITS');
  }

  displayValue(value?: string | number | null): string {
    const normalized = value === null || value === undefined ? '' : String(value).trim();
    return normalized || '-';
  }

  complaintTypeLabel(value?: string | null): string {
    if (!value) return '-';
    return this.lookupCache.label('COMPLAINT_TYPE', value) || value;
  }

  ratingDescription(item: UnifiedRatingItem): string {
    return item.comment || (item.type ? this.complaintTypeLabel(item.type) : '');
  }

  tabTitle(): string {
    if (this.activeTab === 'complaints') {
      return this.i18n.instant('INLINE_TEXT.COMPLAINT_RATINGS');
    }
    return this.i18n.instant('INLINE_TEXT.VISIT_RATINGS');
  }

  private reloadTenants(propertyId?: number): void {
    this.loadingTenants = true;
    this.tenantSvc.getAll(0, 500, undefined, propertyId).subscribe({
      next: (res) => {
        this.tenantOptions = this.buildTenantOptions(res.data?.content ?? []);
        this.loadingTenants = false;
      },
      error: () => {
        this.tenantOptions = [];
        this.loadingTenants = false;
      }
    });
  }

  private buildTenantOptions(items: Tenant[]): TenantFilterOption[] {
    return items
      .map((t) => ({
        id: t.id,
        nationalId: (t.nationalId ?? '').trim(),
        name: this.tenantOptionName(t)
      }))
      .filter((t) => t.nationalId || t.name)
      .sort((a, b) => (a.nationalId || a.name).localeCompare(b.nationalId || b.name));
  }

  private tenantOptionName(t: Tenant): string {
    const ar = (t.fullNameAr ?? '').trim();
    const en = (t.fullNameEn ?? '').trim();
    const fallback = (t.fullName ?? '').trim();
    return this.i18n.currentLang === 'ar'
      ? (ar || en || fallback || `#${t.id}`)
      : (en || ar || fallback || `#${t.id}`);
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

  get propertyLovOptions(): EstateLovOption[] {
    return this.propertyOptions.map((p) => ({ value: p.id, label: p.name }));
  }

  get unitLovOptions(): EstateLovOption[] {
    if (this.loadingUnits) {
      return [{ value: null, label: this.i18n.instant('REQUEST_FORM.LOADING_UNITS') }];
    }
    if (this.unitOptions.length) {
      return this.unitOptions.map((u) => ({ value: u.id, label: u.name }));
    }
    const map = new Map<number, string>();
    for (const item of this.activeSource) {
      if (item.unitId != null) {
        map.set(item.unitId, item.unitNumber || `#${item.unitId}`);
      }
    }
    return Array.from(map.entries())
      .map(([id, label]) => ({ value: id, label }))
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));
  }

  get tenantLovOptions(): EstateLovOption[] {
    if (this.loadingTenants) {
      return [{ value: null, label: this.i18n.instant('COMMON.LOADING') }];
    }
    return this.tenantOptions.map((t) => ({
      value: t.id,
      label: t.nationalId ? `${t.nationalId} — ${t.name}` : t.name
    }));
  }

  private buildPropertyOptions(items: Property[]): PropertyFilterOption[] {
    return items
      .map((p) => ({ id: p.id, name: this.propertyLovLabel(p) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private propertyLovLabel(p: Property): string {
    const ar = (p.propertyNameAr ?? '').trim();
    const en = (p.propertyNameEn ?? '').trim();
    const fallback = (p.propertyName ?? '').trim();
    const name = this.i18n.currentLang === 'ar'
      ? (ar || en || fallback || `#${p.id}`)
      : (en || ar || fallback || `#${p.id}`);
    return p.propertyCode ? `${p.propertyCode} — ${name}` : name;
  }

  private unitLabel(u: Unit): string {
    const typeCode = (u.unitType ?? '').trim();
    const typeLabel = typeCode ? this.lookupCache.label('UNIT_TYPE', typeCode) : '';
    return typeLabel ? `${u.unitNumber} - ${typeLabel}` : u.unitNumber;
  }

  private mapVisitRating(item: RatingDashboardItem): UnifiedRatingItem {
    return {
      id: item.id,
      sourceId: item.requestId,
      rating: this.visitRatingScore(item.rating),
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
      tenantName: item.tenantName,
      tenantNameAr: item.tenantNameAr,
      tenantNameEn: item.tenantNameEn,
      tenantId: item.tenantId,
      tenantNationalId: item.tenantNationalId,
      categoryNameAr: item.categoryNameAr,
      categoryNameEn: item.categoryNameEn,
      requestStatus: item.requestStatus
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
      tenantName: item.tenantName,
      tenantNameAr: item.tenantNameAr,
      tenantNameEn: item.tenantNameEn,
      tenantId: item.tenantId,
      tenantNationalId: item.tenantNationalId
    };
  }

  private complaintRatingScore(value: string): number {
    const map: Record<string, number> = {
      VERY_SATISFIED: 4,
      SATISFIED: 3,
      DISSATISFIED: 2,
      VERY_DISSATISFIED: 1,
      EXCELLENT: 4,
      VERY_GOOD: 4,
      GOOD: 3,
      FAIR: 2,
      POOR: 1
    };
    return map[value] ?? 0;
  }

  private visitRatingScore(value: number | null | undefined): number {
    return Math.max(0, Math.min(4, Number(value ?? 0)));
  }
}
