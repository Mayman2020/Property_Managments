import { Component, OnInit } from '@angular/core';
import { NgIf, NgFor, DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { Location } from '@angular/common';
import { catchError, of } from 'rxjs';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { ViolationService } from '../../../core/services/violation.service';
import { TenantViolation } from '../../../core/models/contract.model';
import { PropertyService, Property } from '../../../core/services/property.service';
import { LookupCacheService } from '../../../core/services/lookup-cache.service';
import { LookupItem } from '../../../core/services/lookup.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-violations-list',
  standalone: true,
  imports: [
    NgIf, NgFor, DatePipe, DecimalPipe, NgClass, FormsModule,
    MatButtonModule, MatIconModule,
    MatInputModule, MatSelectModule,
    MatProgressSpinnerModule, MatTooltipModule,
    TranslateModule, PageHeaderComponent, TablePagerComponent
  ],
  templateUrl: './violations-list.component.html',
  styleUrl: './violations-list.component.scss'
})
export class ViolationsListComponent implements OnInit {
  loading = true;
  violations: TenantViolation[] = [];
  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;
  filterStatus = '';
  filterPropertyId: number | null = null;

  properties: Property[] = [];
  loadingProperties = false;

  constructor(
    private readonly violationSvc: ViolationService,
    private readonly propertySvc: PropertyService,
    private readonly location: Location,
    readonly lookupCache: LookupCacheService,
    readonly i18n: I18nService
  ) {}

  goBack(): void { this.location.back(); }

  ngOnInit(): void {
    this.loadProperties();
    this.lookupCache.preload('VIOLATION_STATUS', 'VIOLATION_SEVERITY', 'VIOLATION_TYPE').subscribe(() => {
      this.load();
    });
  }

  get statusOptions(): LookupItem[] {
    return this.lookupCache.items('VIOLATION_STATUS');
  }

  load(): void {
    this.loading = true;
    const params: Record<string, string | number> = { page: this.pageIndex, size: this.pageSize };
    if (this.filterStatus) params['status'] = this.filterStatus;
    if (this.filterPropertyId) params['propertyId'] = this.filterPropertyId;

    this.violationSvc.getAll(params).pipe(catchError(() => of(null))).subscribe(res => {
      if (res?.data) {
        const d = res.data;
        this.violations = d.content ?? d ?? [];
        this.totalElements = d.totalElements ?? this.violations.length;
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

  resolve(id: number): void {
    this.violationSvc.resolve(id).subscribe(() => this.load());
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

  getSeverityClass(code: string | undefined): string {
    const m: Record<string, string> = { CRITICAL: 'chip-danger', HIGH: 'chip-danger', MEDIUM: 'chip-warn', LOW: 'chip-default' };
    return m[code ?? ''] ?? 'chip-default';
  }

  getStatusClass(code: string | undefined): string {
    const m: Record<string, string> = { OPEN: 'chip-warn', NOTIFIED: 'chip-info', RESOLVED: 'chip-success', ESCALATED: 'chip-danger' };
    return m[code ?? ''] ?? 'chip-default';
  }
}
