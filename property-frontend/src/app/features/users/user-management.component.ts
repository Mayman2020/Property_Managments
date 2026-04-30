import { Component, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

import { I18nService } from '../../core/i18n/i18n.service';
import { User } from '../../core/models/user.model';
import { Property, PropertyService } from '../../core/services/property.service';
import { ContractorCompany, ContractorCompanyService } from '../../core/services/contractor-company.service';
import { PermissionService } from '../../core/services/permission.service';
import { SnackService } from '../../core/services/snack.service';
import { UserService } from '../../core/services/user.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { TablePagerComponent } from '../../shared/components/table-pager/table-pager.component';
import { ExportColumn, TableExportToolbarComponent } from '../../shared/components/table-export-toolbar/table-export-toolbar.component';
import { UserDialogComponent, UserDialogData } from './user-dialog.component';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    DatePipe,
    TranslateModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
    TablePagerComponent,
    TableExportToolbarComponent
  ],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss'
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  properties: Property[] = [];
  contractorCompanies: ContractorCompany[] = [];
  searchTerm = '';

  loading = true;
  togglingIds = new Set<number>();

  readonly pageSize = 5;
  pageIndex = 0;

  constructor(
    private readonly dialog: MatDialog,
    private readonly userService: UserService,
    private readonly propertyService: PropertyService,
    private readonly contractorCompanyService: ContractorCompanyService,
    readonly permissions: PermissionService,
    private readonly snack: SnackService,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  get filteredUsers(): User[] {
    if (!this.searchTerm.trim()) return this.users;
    const q = this.searchTerm.toLowerCase();
    return this.users.filter(u =>
      (u.fullName ?? '').toLowerCase().includes(q) ||
      (u.username ?? '').toLowerCase().includes(q) ||
      (u.email ?? '').toLowerCase().includes(q)
    );
  }

  get pagedUsers(): User[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredUsers.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredUsers.length / this.pageSize));
  }

  get exportColumns(): ExportColumn<User>[] {
    return [
      { header: this.i18n.instant('USER_MGMT.USERNAME'), value: (row) => row.fullName || row.username },
      { header: this.i18n.instant('USER_MGMT.ROLE'), value: (row) => this.roleLabel(row) },
      { header: this.i18n.instant('REQUEST_FORM.PROPERTY'), value: (row) => this.propertyName(row.propertyId) },
      { header: this.i18n.instant('MAINTENANCE.STATUS'), value: (row) => this.i18n.instant(row.isActive ? 'COMMON.ACTIVE' : 'COMMON.INACTIVE') },
      { header: this.i18n.instant('REQUEST_LIST.CREATED_AT'), value: (row) => this.formatDate(row.createdAt) }
    ];
  }

  changePage(step: number): void {
    this.pageIndex = Math.max(0, Math.min(this.pageIndex + step, this.totalPages - 1));
  }

  loadData(): void {
    this.loadUsers();
    this.propertyService.getAll(0, 200).subscribe({
      next: res => { this.properties = res.data?.content ?? []; },
      error: () => { this.properties = []; }
    });
    this.contractorCompanyService.list(true).subscribe({
      next: res => { this.contractorCompanies = (res.data ?? []).filter(c => c.active); },
      error: () => { this.contractorCompanies = []; }
    });
  }

  private loadUsers(): void {
    this.loading = true;
    this.userService.getAll(0, 200, this.searchTerm).subscribe({
      next: res => {
        this.users = res.data?.content ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.error(this.i18n.instant('USER_MGMT.LOAD_ERROR'));
      }
    });
  }

  openAdd(): void {
    const data: UserDialogData = { user: null, properties: this.properties, contractorCompanies: this.contractorCompanies };
    this.dialog.open(UserDialogComponent, { data, panelClass: 'app-dialog-panel', width: '660px' })
      .afterClosed().subscribe(saved => { if (saved) this.loadData(); });
  }

  openEdit(user: User): void {
    const data: UserDialogData = { user, properties: this.properties, contractorCompanies: this.contractorCompanies };
    this.dialog.open(UserDialogComponent, { data, panelClass: 'app-dialog-panel', width: '660px' })
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

  userInitials(user: User): string {
    const words = (user.fullName ?? user.username ?? '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return 'U';
    return words.slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
  }

  onSearch(value: string): void {
    this.searchTerm = value;
    this.pageIndex = 0;
    this.loadUsers();
  }

  private formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()}`;
  }
}
