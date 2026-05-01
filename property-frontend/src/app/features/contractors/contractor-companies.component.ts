import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';

import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { FilterBarComponent, FilterSpec } from '../../shared/components/filter-bar/filter-bar.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { TablePagerComponent } from '../../shared/components/table-pager/table-pager.component';
import { ExportColumn, TableExportToolbarComponent } from '../../shared/components/table-export-toolbar/table-export-toolbar.component';
import { ContractorCompany, ContractorCompanyService } from '../../core/services/contractor-company.service';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import {
  ContractorCompanyDialogComponent,
  ContractorCompanyDialogData
} from './contractor-company-dialog.component';

@Component({
  selector: 'app-contractor-companies',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    TranslateModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatTooltipModule,
    PageHeaderComponent,
    EmptyStateComponent,
    TablePagerComponent,
    TableExportToolbarComponent,
    FilterBarComponent
  ],
  templateUrl: './contractor-companies.component.html',
  styleUrl: './contractor-companies.component.scss'
})
export class ContractorCompaniesComponent implements OnInit {
  companies: ContractorCompany[] = [];
  filteredCompanies: ContractorCompany[] = [];
  readonly pageSize = 5;
  pageIndex = 0;
  loading = true;
  searchTerm = '';
  filterActive: boolean | null = null;
  pageFilters: FilterSpec[] = [];

  constructor(
    private readonly svc: ContractorCompanyService,
    private readonly dialog: MatDialog,
    readonly auth: AuthService,
    readonly i18n: I18nService
  ) {}

  get canHardDelete(): boolean {
    return this.auth.isSuperAdmin();
  }

  get isArabic(): boolean {
    return this.i18n.currentLang === 'ar';
  }

  get exportColumns(): ExportColumn<ContractorCompany>[] {
    return [
      { header: this.i18n.instant('CONTRACTORS.NAME'), value: (row) => this.companyName(row) },
      { header: this.i18n.instant('CONTRACTORS.CONTRACT_START'), value: (row) => this.formatDate(row.contractStart) },
      { header: this.i18n.instant('CONTRACTORS.CONTRACT_END'), value: (row) => this.formatDate(row.contractEnd) },
      { header: this.i18n.instant('CONTRACTORS.PHONE'), value: (row) => row.phone || '-' },
      { header: this.i18n.instant('CONTRACTORS.EMAIL'), value: (row) => row.email || '-' },
      { header: this.i18n.instant('COMMON.ACTIVE'), value: (row) => this.i18n.instant(row.active ? 'COMMON.ACTIVE' : 'COMMON.INACTIVE') }
    ];
  }

  ngOnInit(): void {
    this.setupFilters();
    this.load();
  }

  private setupFilters(): void {
    this.pageFilters = [
      {
        key: 'searchTerm',
        label: 'ACTIONS.SEARCH',
        type: 'text'
      },
      {
        key: 'filterActive',
        label: 'MAINTENANCE.STATUS',
        type: 'select',
        options: [
          { value: true, label: this.i18n.instant('COMMON.ACTIVE') },
          { value: false, label: this.i18n.instant('COMMON.INACTIVE') }
        ]
      }
    ];
  }

  onFilterBarChange(values: any): void {
    if (values?.searchTerm !== undefined) this.searchTerm = values.searchTerm ?? '';
    if (values?.filterActive !== undefined) this.filterActive = values.filterActive;
    this.pageIndex = 0;
    this.applyFilters();
  }

  clearFiltersFromBar(): void {
    this.searchTerm = '';
    this.filterActive = null;
    this.pageIndex = 0;
    this.applyFilters();
  }

  hasFiltersBar(): boolean {
    return !!(this.searchTerm || this.filterActive !== null);
  }

  private applyFilters(): void {
    const q = this.searchTerm.trim().toLowerCase();
    this.filteredCompanies = this.companies.filter(c => {
      if (this.filterActive !== null && c.active !== this.filterActive) return false;
      if (q) {
        const name = this.companyName(c).toLowerCase();
        return name.includes(q) || (c.email ?? '').toLowerCase().includes(q) || (c.phone ?? '').toLowerCase().includes(q);
      }
      return true;
    });
  }

  load(): void {
    this.loading = true;
    this.svc.list(true).subscribe({
      next: (res) => {
        this.companies = res.data ?? [];
        this.applyFilters();
        this.pageIndex = 0;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  openDialog(company: ContractorCompany | null): void {
    this.dialog
      .open<ContractorCompanyDialogComponent, ContractorCompanyDialogData, boolean>(ContractorCompanyDialogComponent, {
        width: '560px',
        maxWidth: '95vw',
        panelClass: 'app-dialog-panel',
        data: { company }
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.load();
      });
  }

  remove(c: ContractorCompany): void {
    if (!this.canHardDelete || !confirm(`Delete ${c.name}?`)) return;
    this.svc.delete(c.id).subscribe({
      next: () => this.load(),
      error: () => {}
    });
  }

  get pagedCompanies(): ContractorCompany[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredCompanies.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredCompanies.length / this.pageSize));
  }

  changePage(step: number): void {
    this.pageIndex = Math.max(0, Math.min(this.pageIndex + step, this.totalPages - 1));
  }

  companyName(company: ContractorCompany): string {
    return (this.isArabic ? company.nameAr : company.nameEn) || company.name || '-';
  }

  formatDate(value?: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()}`;
  }
}
