import { Component, OnInit } from '@angular/core';
import { DatePipe, NgClass, NgFor, NgIf, Location } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';

import { I18nService } from '../../../core/i18n/i18n.service';
import { OwnerPropertyBrief, User, UserRole } from '../../../core/models/user.model';
import { Property, PropertyService } from '../../../core/services/property.service';
import { ContractorCompany, ContractorCompanyService } from '../../../core/services/contractor-company.service';
import { DeleteConfirmService } from '../../../core/services/delete-confirm.service';
import { PermissionService } from '../../../core/services/permission.service';
import { SnackService } from '../../../core/services/snack.service';
import { UserService } from '../../../core/services/user.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { ExportColumn, TableExportToolbarComponent } from '../../../shared/components/table-export-toolbar/table-export-toolbar.component';
import { FilterBarComponent, FilterSpec } from '../../../shared/components/filter-bar/filter-bar.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TableEntityCellComponent } from '../../../shared/components/table-entity-cell/table-entity-cell.component';
import { TableRowIndexPipe } from '../../../shared/pipes/table-row-index.pipe';
import { UserDialogComponent, UserDialogData } from '../user-dialog/user-dialog.component';
import { ListLoadController } from '../../../shared/utils/list-load.util';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    NgClass,
    DatePipe,
    TranslateModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    PageHeaderComponent,
    TablePagerComponent,
    TableExportToolbarComponent,
    FilterBarComponent,
    EmptyStateComponent,
    TableEntityCellComponent,
    TableRowIndexPipe
  ],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss'
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  properties: Property[] = [];
  contractorCompanies: ContractorCompany[] = [];
  searchTerm = '';
  filterPropertyId: number | null = null;
  filterRole: string | null = null;
  filterStatus: boolean | null = null;
  pageFilters: FilterSpec[] = [];

  listLoad = new ListLoadController();
  togglingIds = new Set<number>();

  readonly pageSize = 5;
  pageIndex = 0;
  totalElements = 0;

  constructor(
    private readonly dialog: MatDialog,
    private readonly userService: UserService,
    private readonly propertyService: PropertyService,
    private readonly contractorCompanyService: ContractorCompanyService,
    private readonly deleteConfirm: DeleteConfirmService,
    private readonly location: Location,
    readonly permissions: PermissionService,
    private readonly snack: SnackService,
    readonly i18n: I18nService
  ) {}

  goBack(): void { this.location.back(); }

  ngOnInit(): void {
    this.setupFilters();
    this.loadData();
  }

  private setupFilters(): void {
    const filters: FilterSpec[] = [
      { key: 'searchTerm', label: 'ACTIONS.SEARCH', type: 'text' }
    ];

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

    filters.push({
      key: 'filterRole',
      label: 'USER_MGMT.ROLE',
      type: 'select',
      options: [
        { value: 'SUPER_ADMIN', label: this.i18n.instant('ROLE.SUPER_ADMIN') },
        { value: 'MAINTENANCE_OFFICER_INTERNAL', label: this.i18n.instant('ROLE.MAINTENANCE_OFFICER_INTERNAL') },
        { value: 'MAINTENANCE_OFFICER_COMPANY', label: this.i18n.instant('ROLE.MAINTENANCE_OFFICER_COMPANY') },
        { value: 'MAINTENANCE_COMPANY', label: this.i18n.instant('ROLE.MAINTENANCE_COMPANY') },
        { value: 'TENANT', label: this.i18n.instant('ROLE.TENANT') },
        { value: 'OWNER', label: this.i18n.instant('ROLE.OWNER') }
      ]
    });

    filters.push({
      key: 'filterStatus',
      label: 'MAINTENANCE.STATUS',
      type: 'select',
      options: [
        { value: true, label: this.i18n.instant('COMMON.ACTIVE') },
        { value: false, label: this.i18n.instant('COMMON.INACTIVE') }
      ]
    });

    this.pageFilters = filters;
  }

  onFilterBarChange(values: any): void {
    const needReload =
      values?.searchTerm !== undefined || values?.filterRole !== undefined;
    if (values?.searchTerm !== undefined) this.searchTerm = values.searchTerm ?? '';
    if (values?.filterPropertyId !== undefined) this.filterPropertyId = values.filterPropertyId;
    if (values?.filterRole !== undefined) this.filterRole = values.filterRole;
    if (values?.filterStatus !== undefined) this.filterStatus = values.filterStatus;
    this.pageIndex = 0;
    if (needReload) {
      this.loadUsers();
    }
  }

  clearFiltersFromBar(): void {
    this.searchTerm = '';
    this.filterPropertyId = null;
    this.filterRole = null;
    this.filterStatus = null;
    this.pageIndex = 0;
    this.loadUsers();
  }

  hasFiltersBar(): boolean {
    return !!(this.searchTerm || this.filterPropertyId !== null || this.filterRole || this.filterStatus !== null);
  }

  get filterValues(): Record<string, unknown> {
    return {
      searchTerm: this.searchTerm,
      filterPropertyId: this.filterPropertyId,
      filterRole: this.filterRole,
      filterStatus: this.filterStatus
    };
  }

  get filteredUsers(): User[] {
    return this.users.filter(u => {
      if (this.filterPropertyId !== null && !this.userMatchesProperty(u, this.filterPropertyId)) return false;
      if (this.filterRole && u.role !== this.filterRole) return false;
      if (this.filterStatus !== null && u.isActive !== this.filterStatus) return false;
      const q = this.searchTerm.trim().toLowerCase();
      if (q) {
        return (u.fullName ?? '').toLowerCase().includes(q) ||
          (u.username ?? '').toLowerCase().includes(q) ||
          (u.email ?? '').toLowerCase().includes(q);
      }
      return true;
    });
  }

  private userMatchesProperty(user: User, propertyId: number): boolean {
    if (user.propertyId === propertyId) return true;
    return user.ownerProperties?.some((op) => op.id === propertyId) ?? false;
  }

  get pagedUsers(): User[] {
    return this.filteredUsers;
  }

  onPageChange(index: number): void {
    this.pageIndex = index;
    this.loadUsers();
  }

  get exportColumns(): ExportColumn<User>[] {
    return [
      { header: this.i18n.instant('USER_MGMT.USERNAME'), value: (row) => row.fullName || row.username },
      { header: this.i18n.instant('USER_MGMT.ROLE'), value: (row) => this.roleLabel(row) },
      { header: this.i18n.instant('REQUEST_FORM.PROPERTY'), value: (row) => this.userPropertyDisplay(row) },
      { header: this.i18n.instant('MAINTENANCE.STATUS'), value: (row) => this.i18n.instant(row.isActive ? 'COMMON.ACTIVE' : 'COMMON.INACTIVE') },
      { header: this.i18n.instant('REQUEST_LIST.CREATED_AT'), value: (row) => this.formatDate(row.createdAt) }
    ];
  }

  changePage(step: number): void {
    this.onPageChange(Math.max(0, this.pageIndex + step));
  }

  loadData(): void {
    this.loadUsers();
    this.propertyService.getAll(0, 200).subscribe({
      next: res => {
        this.properties = res.data?.content ?? [];
        this.setupFilters();
      },
      error: () => {
        this.properties = [];
        this.setupFilters();
      }
    });
    this.contractorCompanyService.list(true).subscribe({
      next: res => { this.contractorCompanies = (res.data ?? []).filter(c => c.active); },
      error: () => { this.contractorCompanies = []; }
    });
  }

  private loadUsers(): void {
    this.listLoad.begin();
    this.userService.getAll(this.pageIndex, this.pageSize, this.searchTerm, (this.filterRole as UserRole | null) ?? undefined).subscribe({
      next: res => {
        this.users = res.data?.content ?? [];
        this.totalElements = res.data?.totalElements ?? this.users.length;
        this.listLoad.end();
      },
      error: () => {
        this.listLoad.end();
        this.snack.error(this.i18n.instant('USER_MGMT.LOAD_ERROR'));
      }
    });
  }

  openAdd(): void {
    const data: UserDialogData = { user: null, properties: this.properties, contractorCompanies: this.contractorCompanies };
    this.dialog.open(UserDialogComponent, { data, panelClass: 'app-dialog-panel', width: '720px', disableClose: true })
      .afterClosed().subscribe(saved => { if (saved) this.loadData(); });
  }

  openEdit(user: User): void {
    const data: UserDialogData = { user, properties: this.properties, contractorCompanies: this.contractorCompanies };
    this.dialog.open(UserDialogComponent, { data, panelClass: 'app-dialog-panel', width: '720px', disableClose: true })
      .afterClosed().subscribe(saved => { if (saved) this.loadData(); });
  }

  toggleActive(user: User): void {
    if (this.togglingIds.has(user.id)) return;
    this.togglingIds.add(user.id);
    this.userService.toggleActive(user.id).subscribe({
      next: res => {
        this.togglingIds.delete(user.id);
        const idx = this.users.findIndex(u => u.id === user.id);
        if (idx >= 0 && res.data) this.users[idx] = res.data;
        this.snack.success(this.i18n.instant('USER_MGMT.STATUS_UPDATED'));
      },
      error: (err: Error) => {
        this.togglingIds.delete(user.id);
        this.snack.error(err.message || this.i18n.instant('USER_MGMT.SAVE_ERROR'));
      }
    });
  }

  deleteUser(user: User): void {
    this.deleteConfirm.openDeleteConfirm({
      messageKey: 'USER_MGMT.DELETE_CONFIRM',
      messageParams: { name: user.fullName || user.email }
    }).subscribe(confirmed => {
      if (!confirmed) return;
      this.userService.delete(user.id).subscribe({
        next: () => {
          this.snack.success(this.i18n.instant('USER_MGMT.DELETE_SUCCESS'));
          this.loadData();
        },
        error: (err: Error) => {
          this.deleteConfirm.handleDeleteError(err, this.snack);
        }
      });
    });
  }

  roleLabel(user: User): string {
    return this.i18n.instant(`ROLE.${user.role}`);
  }

  propertyName(propertyId?: number): string {
    if (!propertyId) return '—';
    const p = this.properties.find(p => p.id === propertyId);
    if (!p) return '—';
    const name = this.i18n.currentLang === 'ar' ? (p.propertyNameAr || p.propertyName) : (p.propertyNameEn || p.propertyName);
    return `${name} (${p.propertyCode})`;
  }

  hasPropertyDisplay(user: User): boolean {
    return !!user.propertyId || !!(user.ownerProperties && user.ownerProperties.length);
  }

  userPropertyDisplay(user: User): string {
    if (user.ownerProperties?.length) {
      return user.ownerProperties.map(op => this.ownerBriefLabel(op)).join('، ');
    }
    return this.propertyName(user.propertyId);
  }

  private ownerBriefLabel(op: OwnerPropertyBrief): string {
    const name =
      this.i18n.currentLang === 'ar'
        ? (op.propertyNameAr || op.propertyName || '')
        : (op.propertyNameEn || op.propertyName || '');
    const code = op.propertyCode ?? '';
    return code ? `${name} (${code})` : name || '—';
  }

  userCode(user: User): string {
    return `U-${user.id}`;
  }

  userSubtitle(user: User): string {
    const parts = [user.email, user.fullNameAr, user.fullNameEn].filter((v) => !!v && String(v).trim());
    return parts.join(' · ');
  }

  private formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()}`;
  }
}
