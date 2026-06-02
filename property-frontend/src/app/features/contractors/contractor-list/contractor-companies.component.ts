import { Component, OnInit } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EstateLovOption, EstateLovSelectComponent } from '../../../shared/components/estate-lov-select/estate-lov-select.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { TableEntityCellComponent } from '../../../shared/components/table-entity-cell/table-entity-cell.component';
import { TableRowIndexPipe } from '../../../shared/pipes/table-row-index.pipe';
import { ExportColumn, TableExportToolbarComponent } from '../../../shared/components/table-export-toolbar/table-export-toolbar.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { ContractorCompany, ContractorCompanyService } from '../../../core/services/contractor-company.service';
import { Property, PropertyService } from '../../../core/services/property.service';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionService } from '../../../core/services/permission.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { SnackService } from '../../../core/services/snack.service';
import { DeleteConfirmService } from '../../../core/services/delete-confirm.service';
import {
  ContractorCompanyDialogComponent,
  ContractorCompanyDialogData
} from '../contractor-company-dialog/contractor-company-dialog.component';
import { MaintenanceContractDialogComponent } from '../../contracts/maintenance-contract-dialog/maintenance-contract-dialog.component';
import { ContractorCompanyStaffDialogComponent } from '../contractor-company-staff-dialog.component';
import { ListLoadController } from '../../../shared/utils/list-load.util';

@Component({
  selector: 'app-contractor-companies',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    NgClass,
    FormsModule,
    TranslateModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatTooltipModule,
    PageHeaderComponent,
    EmptyStateComponent,
    TablePagerComponent,
    TableExportToolbarComponent,
    TableEntityCellComponent,
    TableRowIndexPipe,
    HasPermissionDirective,
    EstateLovSelectComponent
  ],
  templateUrl: './contractor-companies.component.html',
  styleUrl: './contractor-companies.component.scss'
})
export class ContractorCompaniesComponent implements OnInit {
  companies: ContractorCompany[] = [];
  properties: Property[] = [];
  readonly pageSize = 5;
  pageIndex = 0;
  totalElements = 0;
  listLoad = new ListLoadController();
  searchTerm = '';
  filterActive: boolean | null = null;
  filterPropertyId: number | null = null;

  get propertyLovOptions(): EstateLovOption[] {
    return this.properties.map((p) => ({
      value: p.id,
      label: this.propertyLovLabel(p)
    }));
  }

  get activeStatusLovOptions(): EstateLovOption[] {
    return [
      { value: true, label: this.i18n.instant('COMMON.ACTIVE') },
      { value: false, label: this.i18n.instant('COMMON.INACTIVE') }
    ];
  }

  constructor(
    private readonly svc: ContractorCompanyService,
    private readonly propertySvc: PropertyService,
    private readonly dialog: MatDialog,
    private readonly router: Router,
    private readonly snack: SnackService,
    private readonly deleteConfirm: DeleteConfirmService,
    readonly auth: AuthService,
    readonly permissions: PermissionService,
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
      { header: this.i18n.instant('CONTRACTORS.CONTRACT_START'), value: (row) => this.formatDate(row.latestContractStart || row.contractStart) },
      { header: this.i18n.instant('CONTRACTORS.CONTRACT_END'), value: (row) => this.formatDate(row.latestContractEnd || row.contractEnd) },
      { header: this.i18n.instant('CONTRACTORS.PHONE'), value: (row) => row.phone || '-' },
      { header: this.i18n.instant('CONTRACTORS.EMAIL'), value: (row) => row.email || '-' },
      { header: this.i18n.instant('CONTRACTORS.CONTRACT_STATUS'), value: (row) => this.companyStatusLabel(row) }
    ];
  }

  ngOnInit(): void {
    this.loadProperties();
  }

  onPropertyChange(): void {
    this.pageIndex = 0;
    this.load();
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.pageIndex = 0;
    this.load();
  }

  onStatusChange(): void {
    this.pageIndex = 0;
    this.load();
  }

  clearFiltersFromBar(): void {
    this.searchTerm = '';
    this.filterActive = null;
    this.filterPropertyId = null;
    this.pageIndex = 0;
    this.load();
  }

  hasFiltersBar(): boolean {
    return !!(this.searchTerm || this.filterActive !== null || (this.properties.length > 0 && this.filterPropertyId !== null));
  }

  private load(): void {
    this.listLoad.begin();
    const q = this.searchTerm.trim() || undefined;
    this.svc.listPaged(this.pageIndex, this.pageSize, q, this.filterPropertyId, this.filterActive, true).subscribe({
      next: (res) => {
        this.companies = res.data?.content ?? [];
        this.totalElements = res.data?.totalElements ?? this.companies.length;
        this.listLoad.end();
      },
      error: () => {
        this.listLoad.end();
      }
    });
  }

  onPageChange(index: number): void {
    this.pageIndex = index;
    this.load();
  }

  private loadProperties(): void {
    this.propertySvc.getAll(0, 500).subscribe({
      next: (res) => {
        this.properties = res.data?.content ?? [];
        this.load();
      },
      error: () => {
        this.properties = [];
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
    this.router.navigate(['/admin/contractors', company.id]);
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

  openStaffDialog(company: ContractorCompany): void {
    this.dialog.open(ContractorCompanyStaffDialogComponent, {
      width: '820px',
      maxWidth: '95vw',
      panelClass: 'app-dialog-panel',
      data: { company }
    });
  }

  remove(c: ContractorCompany): void {
    if (!this.canHardDelete) return;
    const ar = this.isArabic;
    const name = this.companyName(c);
    const hasUser = !!c.email;
    const baseLine = ar ? `هل تريد حذف شركة الصيانة "${name}"؟` : `Delete maintenance company "${name}"?`;
    const userLine = hasUser
      ? (this.i18n.instant('INLINE_TEXT.THIS_WILL_ALSO_DELETE_THE_LINKED_USER_ACCOUNT'))
      : '';
    const warningLine = this.i18n.instant('INLINE_TEXT.DELETION_WILL_BE_BLOCKED_IF_AN_ACTIVE_MAINTENANCE_CONTR');
    this.deleteConfirm.openDeleteConfirm({
      message: [baseLine, userLine, warningLine].filter(Boolean).join('\n')
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
    return this.companies;
  }

  changePage(step: number): void {
    const totalPages = Math.max(1, Math.ceil(this.totalElements / this.pageSize));
    const next = this.pageIndex + step;
    this.onPageChange(Math.max(0, Math.min(next, totalPages - 1)));
  }

  companyName(company: ContractorCompany): string {
    return (this.isArabic ? company.nameAr : company.nameEn) || company.name || '-';
  }

  companySubtitle(company: ContractorCompany): string | undefined {
    const primary = this.companyName(company);
    const secondary = (this.isArabic ? company.nameEn : company.nameAr)?.trim();
    return secondary && secondary !== primary ? secondary : undefined;
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

  private propertyLovLabel(p: Property): string {
    const name = this.i18n.currentLang === 'ar'
      ? (p.propertyNameAr || p.propertyName)
      : (p.propertyNameEn || p.propertyName);
    return p.propertyCode ? `${p.propertyCode} — ${name}` : name;
  }
}
