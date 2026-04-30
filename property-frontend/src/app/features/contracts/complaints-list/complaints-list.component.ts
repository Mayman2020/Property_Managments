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
import { ComplaintService } from '../../../core/services/complaint.service';
import { TenantComplaint } from '../../../core/models/contract.model';
import { PropertyService, Property } from '../../../core/services/property.service';
import { LookupCacheService } from '../../../core/services/lookup-cache.service';
import { LookupItem } from '../../../core/services/lookup.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-complaints-list',
  standalone: true,
  imports: [
    NgIf, NgFor, DatePipe, NgClass, FormsModule,
    MatButtonModule, MatIconModule,
    MatInputModule, MatSelectModule,
    MatProgressSpinnerModule,
    TranslateModule, PageHeaderComponent, TablePagerComponent
  ],
  templateUrl: './complaints-list.component.html',
  styleUrl: './complaints-list.component.scss'
})
export class ComplaintsListComponent implements OnInit {
  loading = true;
  complaints: TenantComplaint[] = [];
  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;
  filterStatus = '';
  filterPropertyId: number | null = null;

  properties: Property[] = [];
  loadingProperties = false;

  constructor(
    private readonly complaintSvc: ComplaintService,
    private readonly propertySvc: PropertyService,
    readonly lookupCache: LookupCacheService,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.loadProperties();
    this.lookupCache.preload('COMPLAINT_STATUS', 'COMPLAINT_PRIORITY', 'COMPLAINT_TYPE').subscribe(() => {
      this.load();
    });
  }

  get statusOptions(): LookupItem[] {
    return this.lookupCache.items('COMPLAINT_STATUS');
  }

  load(): void {
    this.loading = true;
    const params: Record<string, string | number> = { page: this.pageIndex, size: this.pageSize };
    if (this.filterStatus) params['status'] = this.filterStatus;
    if (this.filterPropertyId) params['propertyId'] = this.filterPropertyId;

    this.complaintSvc.getAll(params).pipe(catchError(() => of(null))).subscribe(res => {
      if (res?.data) {
        const d = res.data;
        this.complaints = d.content ?? d ?? [];
        this.totalElements = d.totalElements ?? this.complaints.length;
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
    this.complaintSvc.resolve(id).subscribe(() => this.load());
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

  getPriorityClass(code: string): string {
    const m: Record<string, string> = { URGENT: 'chip-danger', HIGH: 'chip-warn', NORMAL: 'chip-info', LOW: 'chip-default' };
    return m[code] ?? 'chip-default';
  }

  getStatusClass(code: string): string {
    const m: Record<string, string> = { OPEN: 'chip-warn', IN_REVIEW: 'chip-info', RESOLVED: 'chip-success', CLOSED: 'chip-default' };
    return m[code] ?? 'chip-default';
  }
}
