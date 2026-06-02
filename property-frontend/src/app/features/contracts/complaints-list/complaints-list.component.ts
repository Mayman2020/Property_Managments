import { Component, OnInit } from '@angular/core';
import { NgIf, NgFor, DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { catchError, of } from 'rxjs';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { FilterBarComponent, FilterSpec } from '../../../shared/components/filter-bar/filter-bar.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TableRowIndexPipe } from '../../../shared/pipes/table-row-index.pipe';
import { ComplaintService } from '../../../core/services/complaint.service';
import { TenantComplaint } from '../../../core/models/contract.model';
import { PropertyService, Property } from '../../../core/services/property.service';
import { LookupCacheService } from '../../../core/services/lookup-cache.service';
import { LookupItem, LookupType } from '../../../core/services/lookup.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { PermissionService } from '../../../core/services/permission.service';
import { ComplaintDetailDialogComponent } from '../complaint-detail-dialog/complaint-detail-dialog.component';
import { ListLoadController } from '../../../shared/utils/list-load.util';
import { SnackService } from '../../../core/services/snack.service';

@Component({
  selector: 'app-complaints-list',
  standalone: true,
  imports: [
    NgIf, NgFor, DatePipe, NgClass, FormsModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule, MatDialogModule,
    TranslateModule, PageHeaderComponent, TablePagerComponent, FilterBarComponent,
    EmptyStateComponent,
    TableRowIndexPipe
  ],
  templateUrl: './complaints-list.component.html',
  styleUrl: './complaints-list.component.scss'
})
export class ComplaintsListComponent implements OnInit {
  listLoad = new ListLoadController();
  complaints: TenantComplaint[] = [];
  totalElements = 0;
  creatingRequestId: number | null = null;
  pageSize = 5;
  pageIndex = 0;
  filterStatus = '';
  filterPropertyId: number | null = null;
  searchTerm = '';

  properties: Property[] = [];
  loadingProperties = false;
  pageFilters: FilterSpec[] = [];
  private pendingComplaintId: number | null = null;

  constructor(
    private readonly complaintSvc: ComplaintService,
    private readonly propertySvc: PropertyService,
    private readonly location: Location,
    private readonly route: ActivatedRoute,
    private readonly dialog: MatDialog,
    readonly lookupCache: LookupCacheService,
    readonly i18n: I18nService,
    private readonly permissions: PermissionService,
    private readonly snack: SnackService
  ) {}

  canResolveComplaint(): boolean {
    return this.permissions.can('contracts', 'approve') || this.permissions.can('contracts', 'edit');
  }

  goBack(): void { this.location.back(); }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const id = Number(params.get('complaintId'));
      this.pendingComplaintId = Number.isFinite(id) && id > 0 ? id : null;
      this.tryOpenPendingComplaint();
    });
    this.loadProperties();
    this.lookupCache.preload('COMPLAINT_STATUS', 'COMPLAINT_PRIORITY', 'COMPLAINT_TYPE').subscribe(() => {
      this.setupFilters();
      this.load();
    });
  }

  get statusOptions(): LookupItem[] {
    return this.lookupCache.items('COMPLAINT_STATUS');
  }

  load(): void {
    this.listLoad.begin();
    const params: Record<string, string | number> = { page: this.pageIndex, size: this.pageSize };
    if (this.filterStatus) params['status'] = this.filterStatus;
    if (this.filterPropertyId) params['propertyId'] = this.filterPropertyId;

    this.complaintSvc.getAll(params).pipe(catchError(() => of(null))).subscribe(res => {
      if (res?.data) {
        const d = res.data;
        this.complaints = d.content ?? d ?? [];
        this.totalElements = d.totalElements ?? this.complaints.length;
      } else {
        this.snack.error(this.i18n.instant('COMMON.ERROR'));
      }
      this.listLoad.end();
      this.tryOpenPendingComplaint();
    });
  }

  private tryOpenPendingComplaint(): void {
    if (this.pendingComplaintId == null || this.listLoad.loading) return;
    const onPage = this.complaints.find((c) => c.id === this.pendingComplaintId);
    if (onPage) {
      this.openDetails(onPage);
      this.pendingComplaintId = null;
      return;
    }
    const id = this.pendingComplaintId;
    this.complaintSvc.getById(id).pipe(catchError(() => of(null))).subscribe((res) => {
      const complaint = res?.data ?? res;
      if (complaint?.id) {
        this.openDetails(complaint as TenantComplaint);
      }
      this.pendingComplaintId = null;
    });
  }

  private loadProperties(): void {
    this.loadingProperties = true;
    this.propertySvc.getAll(0, 200).subscribe({
      next: (res) => {
        this.properties = (res.data?.content ?? []).filter(p => p.isActive);
        this.loadingProperties = false;
        this.setupFilters();
      },
      error: () => { this.loadingProperties = false; }
    });
  }

  private setupFilters(): void {
    this.pageFilters = [
      {
        key: 'filterPropertyId',
        label: 'REQUEST_FORM.PROPERTY',
        type: 'select',
        options: this.properties.map(p => ({
          value: p.id,
          label: this.i18n.currentLang === 'ar' ? (p.propertyNameAr || p.propertyName) : (p.propertyNameEn || p.propertyName)
        }))
      },
      {
        key: 'filterStatus',
        label: 'CONTRACTS.STATUS',
        type: 'select',
        options: this.lookupCache.items('COMPLAINT_STATUS').map(s => ({
          value: s.code,
          label: this.i18n.currentLang === 'ar' ? s.nameAr : s.nameEn
        }))
      }
    ];
  }

  onFilterBarChange(values: any): void {
    if (values?.filterPropertyId !== undefined) this.filterPropertyId = values.filterPropertyId;
    if (values?.filterStatus !== undefined) this.filterStatus = values.filterStatus ?? '';
    this.pageIndex = 0;
    this.load();
  }

  clearFiltersFromBar(): void {
    this.filterPropertyId = null;
    this.filterStatus = '';
    this.pageIndex = 0;
    this.load();
  }

  onSearch(value: string): void {
    this.searchTerm = value;
  }

  get filteredComplaints(): TenantComplaint[] {
    const q = this.searchTerm.trim().toLowerCase();
    if (!q) return this.complaints;
    return this.complaints.filter(c =>
      [
        c.title,
        c.tenantName,
        c.tenantNameAr,
        c.tenantNameEn,
        c.propertyName,
        c.propertyNameAr,
        c.propertyNameEn,
        c.unitNumber,
        this.tenantDisplayName(c),
        this.propertyUnitDisplay(c),
        this.complaintDisplayTitle(c),
        this.lookupLabel('COMPLAINT_TYPE', c.complaintType),
        this.lookupLabel('COMPLAINT_STATUS', c.status),
        this.lookupLabel('COMPLAINT_PRIORITY', c.priority)
      ]
        .join(' ').toLowerCase().includes(q)
    );
  }

  hasFiltersBar(): boolean {
    return !!(this.filterPropertyId || this.filterStatus);
  }

  get filterValues(): Record<string, unknown> {
    return {
      filterPropertyId: this.filterPropertyId,
      filterStatus: this.filterStatus || null
    };
  }

  onFilterChange(): void {
    this.pageIndex = 0;
    this.load();
  }

  resolve(id: number): void {
    this.complaintSvc.resolve(id).subscribe(() => this.load());
  }

  createMaintenanceRequest(complaint: TenantComplaint): void {
    if (this.creatingRequestId) return;
    this.creatingRequestId = complaint.id;
    this.complaintSvc.createMaintenanceRequest(complaint.id).subscribe({
      next: () => {
        this.creatingRequestId = null;
        this.load();
      },
      error: () => { this.creatingRequestId = null; },
    });
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

  complaintTypeLabel(code: string | null | undefined): string {
    return this.lookupLabel('COMPLAINT_TYPE', code);
  }

  tenantDisplayName(c: TenantComplaint): string {
    const ar = this.i18n.currentLang === 'ar';
    const name = ar
      ? (c.tenantNameAr || c.tenantNameEn || c.tenantName)
      : (c.tenantNameEn || c.tenantNameAr || c.tenantName);
    return name || '—';
  }

  propertyDisplayName(c: TenantComplaint): string {
    const ar = this.i18n.currentLang === 'ar';
    const name = ar
      ? (c.propertyNameAr || c.propertyNameEn || c.propertyName)
      : (c.propertyNameEn || c.propertyNameAr || c.propertyName);
    return name || '';
  }

  propertyUnitDisplay(c: TenantComplaint): string {
    const property = this.propertyDisplayName(c);
    const unit = (c.unitNumber || '').trim();
    if (property && unit) return `${property} — ${unit}`;
    if (property) return property;
    if (unit) return unit;
    return '—';
  }

  complaintDisplayTitle(c: TenantComplaint): string {
    const title = (c.title || '').trim();
    if (title && !/^Complaint\s[A-Z]+-\d/i.test(title)) {
      return title;
    }
    return this.complaintTypeLabel(c.complaintType);
  }

  openDetails(c: TenantComplaint): void {
    this.dialog.open(ComplaintDetailDialogComponent, {
      width: '760px',
      maxWidth: '95vw',
      maxHeight: '92vh',
      panelClass: 'app-dialog-panel',
      data: { complaintId: c.id }
    }).afterClosed().subscribe(changed => {
      if (changed) this.load();
    });
  }

  private lookupLabel(type: LookupType, code: string | null | undefined): string {
    return this.lookupCache.label(type, code) || '-';
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
