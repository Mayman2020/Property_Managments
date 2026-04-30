import { Component, OnInit } from '@angular/core';
import { NgIf, NgFor, DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, of } from 'rxjs';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { InspectionService } from '../../../core/services/inspection.service';
import { UnitInspection } from '../../../core/models/contract.model';
import { PropertyService, Property } from '../../../core/services/property.service';
import { LookupCacheService } from '../../../core/services/lookup-cache.service';
import { LookupItem } from '../../../core/services/lookup.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-inspections-list',
  standalone: true,
  imports: [
    NgIf, NgFor, DatePipe, NgClass, FormsModule,
    MatButtonModule, MatIconModule,
    MatInputModule, MatSelectModule,
    MatProgressSpinnerModule,
    TranslateModule, PageHeaderComponent, TablePagerComponent
  ],
  templateUrl: './inspections-list.component.html',
  styleUrl: './inspections-list.component.scss'
})
export class InspectionsListComponent implements OnInit {
  loading = true;
  inspections: UnitInspection[] = [];
  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;
  filterPropertyId: number | null = null;
  filterType = '';

  properties: Property[] = [];
  loadingProperties = false;

  constructor(
    private readonly inspectionSvc: InspectionService,
    private readonly propertySvc: PropertyService,
    readonly lookupCache: LookupCacheService,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.loadProperties();
    this.lookupCache.preload('INSPECTION_TYPE', 'INSPECTION_CONDITION').subscribe(() => {
      this.load();
    });
  }

  get typeOptions(): LookupItem[] {
    return this.lookupCache.items('INSPECTION_TYPE');
  }

  load(): void {
    this.loading = true;
    const params: Record<string, string | number> = { page: this.pageIndex, size: this.pageSize };
    if (this.filterPropertyId) params['propertyId'] = this.filterPropertyId;
    if (this.filterType) params['inspectionType'] = this.filterType;

    this.inspectionSvc.getAll(params)
      .pipe(catchError(() => of(null)))
      .subscribe(res => {
        if (res?.data) {
          const d = res.data;
          this.inspections = d.content ?? d ?? [];
          this.totalElements = d.totalElements ?? this.inspections.length;
        }
        this.loading = false;
      });
  }

  private loadProperties(): void {
    this.loadingProperties = true;
    this.propertySvc.getAll(0, 200).subscribe({
      next: (res) => { this.properties = (res.data?.content ?? []).filter(p => p.isActive); this.loadingProperties = false; },
      error: () => { this.loadingProperties = false; }
    });
  }

  onFilterChange(): void {
    this.pageIndex = 0;
    this.load();
  }

  goToPage(pageIndex: number): void {
    this.pageIndex = pageIndex;
    this.load();
  }

  propertyLabel(p: Property): string {
    return this.i18n.currentLang === 'ar'
      ? (p.propertyNameAr || p.propertyName)
      : (p.propertyNameEn || p.propertyName);
  }

  getRatingClass(rating: number | undefined): string {
    if (!rating) return '';
    if (rating >= 4) return 'good';
    if (rating === 3) return 'fair';
    return 'poor';
  }

  getOverallClass(code: string | undefined): string {
    const m: Record<string, string> = { EXCELLENT: 'chip-success', GOOD: 'chip-info', FAIR: 'chip-warn', POOR: 'chip-danger' };
    return m[code ?? ''] ?? 'chip-default';
  }
}
