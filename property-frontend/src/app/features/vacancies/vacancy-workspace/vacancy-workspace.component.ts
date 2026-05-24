import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PageHeaderComponent, BreadcrumbItem } from '../../../shared/components/page-header/page-header.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { VacancyInquiryItem, VacancyItem, VacancyService } from '../../../core/services/vacancy.service';
import { Property, PropertyService } from '../../../core/services/property.service';
import { Owner, OwnerService, ownerDisplayName } from '../../../core/services/owner.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { SnackService } from '../../../core/services/snack.service';

@Component({
  selector: 'app-vacancy-workspace',
  standalone: true,
  imports: [
    NgIf, NgFor, FormsModule, TranslateModule,
    MatIconModule, MatButtonModule, MatTooltipModule,
    PageHeaderComponent, TablePagerComponent
  ],
  templateUrl: './vacancy-workspace.component.html',
  styleUrl: './vacancy-workspace.component.scss'
})
export class VacancyWorkspaceComponent implements OnInit {
  section = 'list';
  listings: VacancyItem[] = [];
  totalListings = 0;
  inquiries: VacancyInquiryItem[] = [];
  properties: Property[] = [];
  owners: Owner[] = [];
  listingId = 0;
  actionLoadingId: number | null = null;
  filterPropertyId: number | null = null;
  filterOwnerId: number | null = null;
  readonly pageSize = 6;
  pageIndex = 0;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly service: VacancyService,
    private readonly propertySvc: PropertyService,
    private readonly ownerSvc: OwnerService,
    private readonly translate: TranslateService,
    private readonly snack: SnackService,
    readonly i18n: I18nService
  ) {}

  get title(): string {
    return this.section === 'inquiries'
      ? this.translate.instant('VACANCIES.INQUIRIES_TITLE')
      : this.translate.instant('VACANCIES.LISTINGS_TITLE');
  }

  get subtitle(): string {
    return this.translate.instant('VACANCIES.SUBTITLE');
  }

  get isArabic(): boolean {
    return this.i18n.currentLang === 'ar';
  }

  get breadcrumbs(): BreadcrumbItem[] {
    return [
      { label: this.translate.instant('NAV.DASHBOARD'), route: '/admin/dashboard' },
      { label: this.translate.instant('NAV.VACANCIES'), route: '/admin/vacancies/list' },
      { label: this.title }
    ];
  }

  ngOnInit(): void {
    this.section = this.route.snapshot.data['section'] ?? 'list';
    if (this.section === 'list') {
      this.propertySvc.getAll(0, 500).subscribe({
        next: (res) => { this.properties = res.data?.content ?? []; }
      });
      this.ownerSvc.getAll(0, 500).subscribe({
        next: (res) => { this.owners = res.data?.content ?? []; }
      });
      this.loadListings();
      return;
    }
    this.listingId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.listingId) {
      this.reloadInquiries();
    }
  }

  loadListings(): void {
    const params: Record<string, string | number> = {
      page: this.pageIndex,
      size: this.pageSize
    };
    if (this.filterPropertyId != null) params['propertyId'] = this.filterPropertyId;
    if (this.filterOwnerId != null) params['ownerId'] = this.filterOwnerId;
    this.service.getListings(params).subscribe({
      next: (res) => {
        this.listings = res.data?.content ?? [];
        this.totalListings = res.data?.totalElements ?? this.listings.length;
      },
      error: () => {
        this.listings = [];
        this.totalListings = 0;
      }
    });
  }

  onPropertyFilterChange(): void {
    this.pageIndex = 0;
    this.loadListings();
  }

  onOwnerFilterChange(): void {
    this.pageIndex = 0;
    this.loadListings();
  }

  clearFilters(): void {
    this.filterPropertyId = null;
    this.filterOwnerId = null;
    this.pageIndex = 0;
    this.loadListings();
  }

  hasFilters(): boolean {
    return this.filterPropertyId != null || this.filterOwnerId != null;
  }

  ownerLabel(item: VacancyItem): string {
    if (this.isArabic) {
      return item.ownerNameAr || item.ownerNameEn || '-';
    }
    return item.ownerNameEn || item.ownerNameAr || '-';
  }

  ownerOptionLabel(o: Owner): string {
    return ownerDisplayName(o, this.i18n.currentLang);
  }

  reloadInquiries(): void {
    this.service.getInquiries(this.listingId).subscribe({
      next: (res) => { this.inquiries = res.data ?? []; },
      error: () => { this.inquiries = []; }
    });
  }

  setStatus(item: VacancyInquiryItem, status: string): void {
    this.actionLoadingId = item.id;
    this.service.updateInquiryStatus(item.id, status).subscribe({
      next: () => {
        this.snack.success(this.translate.instant('VACANCIES.STATUS_UPDATED'));
        this.reloadInquiries();
        this.actionLoadingId = null;
      },
      error: () => {
        this.snack.error(this.translate.instant('COMMON.ERROR'));
        this.actionLoadingId = null;
      }
    });
  }

  convert(item: VacancyInquiryItem): void {
    this.actionLoadingId = item.id;
    this.service.convertInquiry(item.id).subscribe({
      next: (res) => {
        const contractId = res.data?.contractId;
        this.snack.success(
          this.translate.instant('VACANCIES.CONVERT_SUCCESS', { contractId: contractId ?? '' })
        );
        this.reloadInquiries();
        this.actionLoadingId = null;
      },
      error: (err) => {
        const msg = (err as Error)?.message ?? this.translate.instant('COMMON.ERROR');
        this.snack.error(msg);
        this.actionLoadingId = null;
      }
    });
  }
}
