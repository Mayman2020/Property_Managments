import { Component, OnInit } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { FilterBarComponent, FilterSpec } from '../../../shared/components/filter-bar/filter-bar.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { ExportColumn, TableExportToolbarComponent } from '../../../shared/components/table-export-toolbar/table-export-toolbar.component';
import { ContractorCompany, ContractorCompanyService } from '../../../core/services/contractor-company.service';
import { Property, PropertyService } from '../../../core/services/property.service';
import { AuthService } from '../../../core/services/auth.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { SnackService } from '../../../core/services/snack.service';
import { DeleteConfirmService } from '../../../core/services/delete-confirm.service';
import {
  ContractorCompanyDialogComponent,
  ContractorCompanyDialogData
} from '../contractor-company-dialog/contractor-company-dialog.component';
import { MaintenanceContractDialogComponent } from '../../contracts/maintenance-contract-dialog/maintenance-contract-dialog.component';

@Component({
  selector: 'app-contractor-companies',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    NgClass,
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
  properties: Property[] = [];
  readonly pageSize = 10;
  pageIndex = 0;
  loading = true;
  searchTerm = '';
  filterActive: boolean | null = null;
  filterPropertyId: number | null = null;
  pageFilters: FilterSpec[] = [];

  constructor(
    private readonly svc: ContractorCompanyService,
    private readonly propertySvc: PropertyService,
    private readonly dialog: MatDialog,
    private readonly snack: SnackService,
    private readonly deleteConfirm: DeleteConfirmService,
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
      { header: this.i18n.instant('CONTRACTORS.CONTRACT_STATUS'), value: (row) => this.companyStatusLabel(row) }
    ];
  }

  ngOnInit(): void {
    this.loadProperties();
  }

  private setupFilters(): void {
    const filters: FilterSpec[] = [];
    if (this.properties.length > 1) {
      filters.push({
        key: 'filterPropertyId',
        label: 'REQUEST_FORM.PROPERTY',
        type: 'select',
        options: this.properties.map((p) => ({
          value: p.id,
          label: this.i18n.currentLang === 'ar' ? (p.propertyNameAr || p.propertyName) : (p.propertyNameEn || p.propertyName)
        }))
      });
    }
    filters.push(
      {
        key: 'filterActive',
        label: 'MAINTENANCE.STATUS',
        type: 'select',
        options: [
          { value: true, label: this.i18n.instant('COMMON.ACTIVE') },
          { value: false, label: this.i18n.instant('COMMON.INACTIVE') }
        ]
      }
    );
    this.pageFilters = filters;
  }

  onFilterBarChange(values: any): void {
    const previousPropertyId = this.filterPropertyId;
    if (values?.filterPropertyId !== undefined) {
      this.filterPropertyId = values.filterPropertyId;
    }
    if (values?.filterActive !== undefined) this.filterActive = values.filterActive;
    this.pageIndex = 0;
    if (previousPropertyId !== this.filterPropertyId) {
      this.load();
    } else {
      this.applyFilters();
    }
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.pageIndex = 0;
    this.applyFilters();
  }

  clearFiltersFromBar(): void {
    this.searchTerm = '';
    this.filterActive = null;
    this.filterPropertyId = this.properties.length === 1 ? this.properties[0].id : null;
    this.pageIndex = 0;
    this.load();
  }

  hasFiltersBar(): boolean {
    return !!(this.searchTerm || this.filterActive !== null || (this.properties.length > 1 && this.filterPropertyId !== null));
  }

  get filterValues(): Record<string, unknown> {
    return {
      filterPropertyId: this.filterPropertyId,
      filterActive: this.filterActive
    };
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
    this.svc.list(true, undefined, this.filterPropertyId).subscribe({
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

  private loadProperties(): void {
    this.propertySvc.getAll(0, 500).subscribe({
      next: (res) => {
        this.properties = res.data?.content ?? [];
        if (this.properties.length === 1) {
          this.filterPropertyId = this.properties[0].id;
        }
        this.setupFilters();
        this.load();
      },
      error: () => {
        this.properties = [];
        this.setupFilters();
        this.load();
      }
    });
  }

  openDialog(company: ContractorCompany | null): void {
    if (!company) {
      this.openCompanyDialog(null, false);
      return;
    }
    this.svc.getById(company.id).subscribe({
      next: (res) => {
        this.openCompanyDialog(res.data ?? company, false);
      },
      error: () => this.snack.error(this.i18n.instant('COMMON.ERROR'))
    });
  }

  private openCompanyDialog(company: ContractorCompany | null, readOnly: boolean): void {
    this.dialog
      .open<ContractorCompanyDialogComponent, ContractorCompanyDialogData, boolean>(ContractorCompanyDialogComponent, {
        width: '560px',
        maxWidth: '95vw',
        panelClass: 'app-dialog-panel',
        data: { company, readOnly }
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.load();
      });
  }

  openView(company: ContractorCompany): void {
    this.svc.getById(company.id).subscribe({
      next: (res) => {
        this.openCompanyDialog(res.data ?? company, true);
      },
      error: () => this.snack.error(this.i18n.instant('COMMON.ERROR'))
    });
  }

  openContractDialog(company: ContractorCompany): void {
    this.dialog.open(MaintenanceContractDialogComponent, {
      width: '640px',
      maxWidth: '95vw',
      panelClass: 'app-dialog-panel',
      data: {
        contractorCompanyId: company.id,
        mode: 'create'
      }
    }).afterClosed().subscribe(saved => {
      if (saved) this.load();
    });
  }

  remove(c: ContractorCompany): void {
    if (!this.canHardDelete) return;
    this.deleteConfirm.openDeleteConfirm({
      messageKey: 'DIALOG.DELETE_NAMED',
      messageParams: { name: this.companyName(c) }
    }).subscribe((ok) => {
      if (!ok) return;
      this.svc.delete(c.id).subscribe({
        next: () => {
        this.snack.success(this.i18n.instant('COMMON.SUCCESS'));
          this.load();
        },
        error: (err: Error) => this.deleteConfirm.handleDeleteError(err, this.snack)
      });
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

  companyStatusKey(company: ContractorCompany): string {
    const status = company.latestMaintenanceContractStatus;
    if (status === 'DRAFT' || status === 'PENDING_OWNER_APPROVAL') {
      return 'CONTRACTORS.STATUS_PENDING_OWNER_APPROVAL';
    }
    if (status === 'ACTIVE') return 'COMMON.ACTIVE';
    if (status === 'CANCELLED') return 'MAINTENANCE_CONTRACT.STATUS_CANCELLED';
    if (status === 'ENDED') return 'MAINTENANCE_ASSIGNMENT.STATUS_ENDED';
    return company.active ? 'CONTRACTORS.STATUS_COMPANY_READY' : 'COMMON.INACTIVE';
  }

  companyStatusLabel(company: ContractorCompany): string {
    return this.i18n.instant(this.companyStatusKey(company));
  }

  companyStatusIcon(company: ContractorCompany): string {
    const status = company.latestMaintenanceContractStatus;
    if (status === 'DRAFT' || status === 'PENDING_OWNER_APPROVAL') return 'hourglass_top';
    if (status === 'ACTIVE') return 'check_circle';
    if (status === 'CANCELLED' || status === 'ENDED') return 'cancel';
    return company.active ? 'verified' : 'cancel';
  }

  companyStatusClass(company: ContractorCompany): string {
    const status = company.latestMaintenanceContractStatus;
    if (status === 'DRAFT' || status === 'PENDING_OWNER_APPROVAL') return 'badge-warn';
    if (status === 'ACTIVE') return 'badge-success';
    if (status === 'CANCELLED' || status === 'ENDED' || !company.active) return 'badge-muted';
    return 'badge-info';
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
