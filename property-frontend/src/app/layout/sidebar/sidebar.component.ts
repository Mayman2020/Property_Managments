import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';

import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/user.model';
import { PermissionService } from '../../core/services/permission.service';
import { DashboardService, DashboardStats } from '../../core/services/dashboard.service';
import { MaintenanceService } from '../../core/services/maintenance.service';
import { MaintenanceRequestDialogComponent } from '../../features/maintenance/maintenance-request-dialog.component';

interface NavItem {
  icon: string;
  labelKey: string;
  route: string;
  roles: UserRole[];
  permissionKey: string;
  sectionKey: 'NAV_SECTION.OVERVIEW' | 'NAV_SECTION.DIRECTORY' | 'NAV_SECTION.OPERATIONS' | 'NAV_SECTION.CONTRACTS' | 'NAV_SECTION.YOU';
  bypassPermission?: boolean;
  officerType?: 'INTERNAL_PROPERTY' | 'CONTRACTOR_COMPANY';
}

interface NavSection {
  key: NavItem['sectionKey'];
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [NgClass, NgFor, NgIf, RouterLink, RouterLinkActive, MatTooltipModule, TranslateModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() collapsed = false;
  @Input() lang: 'ar' | 'en' = 'ar';
  @Output() collapseToggle = new EventEmitter<void>();

  private readonly sectionOrder: NavItem['sectionKey'][] = [
    'NAV_SECTION.OVERVIEW',
    'NAV_SECTION.DIRECTORY',
    'NAV_SECTION.OPERATIONS',
    'NAV_SECTION.CONTRACTS',
    'NAV_SECTION.YOU'
  ];
  private cacheRole: UserRole | null | undefined = undefined;
  private cacheSections: NavSection[] = [];
  private cacheUser: ReturnType<AuthService['getCurrentUser']> | undefined = undefined;

  private readonly subs = new Subscription();
  private maintenanceBadge = 0;
  private inventoryBadge = 0;
  private officerOpenBadge = 0;
  readonly sectionExpanded: Record<NavItem['sectionKey'], boolean> = {
    'NAV_SECTION.OVERVIEW': true,
    'NAV_SECTION.DIRECTORY': true,
    'NAV_SECTION.OPERATIONS': true,
    'NAV_SECTION.CONTRACTS': true,
    'NAV_SECTION.YOU': true
  };

  readonly navItems: NavItem[] = [
    { icon: 'home', labelKey: 'NAV.HOME_PORTAL', route: '/admin/home', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN', 'CONTRACTS_OFFICER', 'ACCOUNTANT', 'HR_OFFICER', 'OWNER'], permissionKey: 'dashboard', sectionKey: 'NAV_SECTION.OVERVIEW' },
    { icon: 'dashboard', labelKey: 'NAV.DASHBOARD', route: '/admin/dashboard', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'], permissionKey: 'dashboard', sectionKey: 'NAV_SECTION.OVERVIEW' },
    { icon: 'apartment', labelKey: 'NAV.PROPERTIES', route: '/admin/properties', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'], permissionKey: 'properties', sectionKey: 'NAV_SECTION.DIRECTORY' },
    { icon: 'meeting_room', labelKey: 'NAV.UNITS', route: '/admin/units', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'], permissionKey: 'units', sectionKey: 'NAV_SECTION.DIRECTORY' },
    { icon: 'groups', labelKey: 'NAV.TENANTS', route: '/admin/tenants', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'], permissionKey: 'tenants', sectionKey: 'NAV_SECTION.DIRECTORY' },
    { icon: 'plumbing', labelKey: 'NAV.MAINTENANCE', route: '/admin/maintenance', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'], permissionKey: 'maintenance', sectionKey: 'NAV_SECTION.OPERATIONS' },
    { icon: 'star_rate', labelKey: 'NAV.RATINGS', route: '/admin/ratings', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'], permissionKey: 'ratings', sectionKey: 'NAV_SECTION.DIRECTORY' },
    { icon: 'engineering', labelKey: 'NAV.CONTRACTOR_COMPANIES', route: '/admin/contractors', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'], permissionKey: 'contractors', sectionKey: 'NAV_SECTION.DIRECTORY' },
    { icon: 'person_pin', labelKey: 'NAV.OWNERS', route: '/admin/owners', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'], permissionKey: 'properties', sectionKey: 'NAV_SECTION.DIRECTORY' },
    { icon: 'inventory_2', labelKey: 'NAV.INVENTORY', route: '/admin/inventory', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'], permissionKey: 'inventory', sectionKey: 'NAV_SECTION.OPERATIONS' },
    { icon: 'bar_chart', labelKey: 'NAV.REPORTS', route: '/admin/reports', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'], permissionKey: 'reports', sectionKey: 'NAV_SECTION.OPERATIONS' },
    { icon: 'tune', labelKey: 'NAV.USERS', route: '/admin/users', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'], permissionKey: 'users', sectionKey: 'NAV_SECTION.YOU' },
    { icon: 'manage_accounts', labelKey: 'NAV.USER_ACCESS', route: '/admin/user-access', roles: ['SUPER_ADMIN'], permissionKey: 'users', sectionKey: 'NAV_SECTION.YOU' },
    { icon: 'dashboard_customize', labelKey: 'NAV.SCREENS', route: '/admin/screens', roles: ['SUPER_ADMIN'], permissionKey: 'permissions', sectionKey: 'NAV_SECTION.YOU' },
    { icon: 'admin_panel_settings', labelKey: 'NAV.PERMISSIONS', route: '/admin/permissions', roles: ['SUPER_ADMIN'], permissionKey: 'permissions', sectionKey: 'NAV_SECTION.YOU' },
    { icon: 'widgets', labelKey: 'NAV.CLIENT_MODULES', route: '/admin/module-settings', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'], permissionKey: 'permissions', sectionKey: 'NAV_SECTION.YOU', bypassPermission: true },
    { icon: 'public', labelKey: 'NAV.LOOKUPS', route: '/admin/lookups', roles: ['SUPER_ADMIN'], permissionKey: 'lookups', sectionKey: 'NAV_SECTION.YOU' },
    { icon: 'calendar_month', labelKey: 'NAV.SCHEDULE', route: '/officer/schedule', roles: ['MAINTENANCE_OFFICER'], permissionKey: 'schedule', sectionKey: 'NAV_SECTION.OPERATIONS' },
    { icon: 'assignment', labelKey: 'NAV.MY_REQUESTS', route: '/officer/requests', roles: ['MAINTENANCE_OFFICER'], permissionKey: 'my_requests', sectionKey: 'NAV_SECTION.OPERATIONS' },
    { icon: 'person', labelKey: 'NAV.PROFILE', route: '/officer/profile', roles: ['MAINTENANCE_OFFICER'], permissionKey: 'profile', sectionKey: 'NAV_SECTION.YOU' },
    { icon: 'home', labelKey: 'NAV.MY_UNIT', route: '/tenant/my-unit', roles: ['TENANT'], permissionKey: 'my_unit', sectionKey: 'NAV_SECTION.OVERVIEW' },
    { icon: 'description', labelKey: 'NAV.MY_CONTRACT', route: '/tenant/my-contract', roles: ['TENANT'], permissionKey: 'my_unit', sectionKey: 'NAV_SECTION.OVERVIEW', bypassPermission: true },
    { icon: 'receipt_long', labelKey: 'NAV.RENT_RECEIPTS', route: '/tenant/rent-receipts', roles: ['TENANT'], permissionKey: 'my_unit', sectionKey: 'NAV_SECTION.OVERVIEW', bypassPermission: true },
    { icon: 'autorenew', labelKey: 'NAV.CONTRACT_REQUEST', route: '/tenant/contract-request', roles: ['TENANT'], permissionKey: 'my_unit', sectionKey: 'NAV_SECTION.OVERVIEW', bypassPermission: true },
    { icon: 'add_circle', labelKey: 'NAV.NEW_REQUEST', route: '/tenant/new-request', roles: ['TENANT'], permissionKey: 'new_request', sectionKey: 'NAV_SECTION.OVERVIEW' },
    { icon: 'history', labelKey: 'NAV.MY_REQUESTS', route: '/tenant/requests', roles: ['TENANT'], permissionKey: 'my_requests', sectionKey: 'NAV_SECTION.OVERVIEW' },
    { icon: 'person', labelKey: 'NAV.PROFILE', route: '/tenant/profile', roles: ['TENANT'], permissionKey: 'profile', sectionKey: 'NAV_SECTION.YOU' },
    { icon: 'person', labelKey: 'NAV.PROFILE', route: '/admin/profile', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN', 'CONTRACTS_OFFICER', 'ACCOUNTANT', 'HR_OFFICER', 'OWNER'], permissionKey: 'profile', sectionKey: 'NAV_SECTION.YOU', bypassPermission: true },
    // Contracts module — admin roles see via their existing permissions; new roles bypass permission check
    { icon: 'description', labelKey: 'NAV.CONTRACTS_DASHBOARD', route: '/admin/contracts/dashboard', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN', 'CONTRACTS_OFFICER', 'ACCOUNTANT'], permissionKey: 'contracts', sectionKey: 'NAV_SECTION.CONTRACTS', bypassPermission: true },
    { icon: 'article', labelKey: 'NAV.CONTRACTS_LIST', route: '/admin/contracts/list', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN', 'CONTRACTS_OFFICER', 'ACCOUNTANT'], permissionKey: 'contracts', sectionKey: 'NAV_SECTION.CONTRACTS', bypassPermission: true },
    { icon: 'payments', labelKey: 'NAV.PAYMENTS', route: '/admin/contracts/payments', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN', 'CONTRACTS_OFFICER', 'ACCOUNTANT'], permissionKey: 'contracts', sectionKey: 'NAV_SECTION.CONTRACTS', bypassPermission: true },
    { icon: 'report_problem', labelKey: 'NAV.VIOLATIONS', route: '/admin/contracts/violations', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN', 'CONTRACTS_OFFICER'], permissionKey: 'contracts', sectionKey: 'NAV_SECTION.CONTRACTS', bypassPermission: true },
    { icon: 'chat_bubble_outline', labelKey: 'NAV.COMPLAINTS', route: '/admin/contracts/complaints', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN', 'CONTRACTS_OFFICER'], permissionKey: 'contracts', sectionKey: 'NAV_SECTION.CONTRACTS', bypassPermission: true },
    { icon: 'fact_check', labelKey: 'NAV.INSPECTIONS', route: '/admin/contracts/inspections', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN', 'CONTRACTS_OFFICER'], permissionKey: 'contracts', sectionKey: 'NAV_SECTION.CONTRACTS', bypassPermission: true },
    { icon: 'file_copy', labelKey: 'NAV.TEMPLATES', route: '/admin/contracts/templates', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'], permissionKey: 'contracts', sectionKey: 'NAV_SECTION.CONTRACTS', bypassPermission: true },
    { icon: 'door_open', labelKey: 'NAV.VACANCIES', route: '/admin/vacancies/list', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN', 'CONTRACTS_OFFICER'], permissionKey: 'vacancies', sectionKey: 'NAV_SECTION.CONTRACTS', bypassPermission: true },
    { icon: 'bar_chart', labelKey: 'NAV.FINANCE_DASHBOARD', route: '/admin/finance/dashboard', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN', 'ACCOUNTANT'], permissionKey: 'finance', sectionKey: 'NAV_SECTION.OPERATIONS', bypassPermission: true },
    { icon: 'receipt_long', labelKey: 'NAV.EXPENSES', route: '/admin/finance/expenses', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN', 'ACCOUNTANT'], permissionKey: 'finance', sectionKey: 'NAV_SECTION.OPERATIONS', bypassPermission: true },
    { icon: 'trending_up', labelKey: 'NAV.REVENUES', route: '/admin/finance/revenues', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN', 'ACCOUNTANT'], permissionKey: 'finance', sectionKey: 'NAV_SECTION.OPERATIONS', bypassPermission: true },
    { icon: 'account_balance_wallet', labelKey: 'NAV.PETTY_CASH', route: '/admin/finance/petty-cash', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN', 'ACCOUNTANT'], permissionKey: 'finance', sectionKey: 'NAV_SECTION.OPERATIONS', bypassPermission: true },
    { icon: 'summarize', labelKey: 'NAV.FINANCIAL_REPORTS', route: '/admin/finance/reports/pnl', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN', 'ACCOUNTANT'], permissionKey: 'finance', sectionKey: 'NAV_SECTION.OPERATIONS', bypassPermission: true },
    { icon: 'badge', labelKey: 'NAV.EMPLOYEES', route: '/admin/hr/employees', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN', 'HR_OFFICER'], permissionKey: 'hr', sectionKey: 'NAV_SECTION.DIRECTORY', bypassPermission: true },
    { icon: 'calculate', labelKey: 'NAV.PAYROLL', route: '/admin/hr/payroll', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN', 'HR_OFFICER', 'ACCOUNTANT'], permissionKey: 'hr', sectionKey: 'NAV_SECTION.OPERATIONS', bypassPermission: true },
    { icon: 'event_available', labelKey: 'NAV.LEAVES', route: '/admin/hr/leaves', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN', 'HR_OFFICER'], permissionKey: 'hr', sectionKey: 'NAV_SECTION.OPERATIONS', bypassPermission: true },
    { icon: 'notifications', labelKey: 'NAV.NOTIFICATIONS', route: '/admin/notifications', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN', 'CONTRACTS_OFFICER', 'ACCOUNTANT', 'HR_OFFICER', 'OWNER'], permissionKey: 'notifications', sectionKey: 'NAV_SECTION.YOU', bypassPermission: true },
    { icon: 'history', labelKey: 'NAV.AUDIT_LOG', route: '/admin/audit-log', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN', 'ACCOUNTANT', 'HR_OFFICER'], permissionKey: 'audit', sectionKey: 'NAV_SECTION.YOU', bypassPermission: true },
    { icon: 'apartment', labelKey: 'NAV.OWNER_PORTAL', route: '/admin/owner-portal/dashboard', roles: ['OWNER'], permissionKey: 'owner_portal', sectionKey: 'NAV_SECTION.OVERVIEW', bypassPermission: true },
    { icon: 'approval', labelKey: 'NAV.CONTRACT_APPROVALS', route: '/admin/owner-portal/contract-approvals', roles: ['OWNER', 'SUPER_ADMIN', 'PROPERTY_ADMIN'], permissionKey: 'owner_portal', sectionKey: 'NAV_SECTION.CONTRACTS', bypassPermission: true },
    { icon: 'fact_check', labelKey: 'NAV.RENT_CONFIRMATION', route: '/admin/accountant-portal/rent-confirmation', roles: ['ACCOUNTANT', 'SUPER_ADMIN', 'PROPERTY_ADMIN'], permissionKey: 'contracts', sectionKey: 'NAV_SECTION.CONTRACTS', bypassPermission: true },
    { icon: 'autorenew', labelKey: 'NAV.RENEWAL_REQUESTS', route: '/admin/accountant-portal/renewal-requests', roles: ['ACCOUNTANT', 'SUPER_ADMIN', 'PROPERTY_ADMIN'], permissionKey: 'contracts', sectionKey: 'NAV_SECTION.CONTRACTS', bypassPermission: true },
    { icon: 'receipt_long', labelKey: 'NAV.MAINTENANCE_INVOICES', route: '/admin/accountant-portal/maintenance-invoices', roles: ['ACCOUNTANT', 'SUPER_ADMIN', 'PROPERTY_ADMIN'], permissionKey: 'contracts', sectionKey: 'NAV_SECTION.CONTRACTS', bypassPermission: true },
    // Officer: invoice portal (contractor company only)
    { icon: 'receipt', labelKey: 'NAV.MY_INVOICES', route: '/officer/invoices', roles: ['MAINTENANCE_OFFICER'], permissionKey: 'my_requests', sectionKey: 'NAV_SECTION.OPERATIONS', bypassPermission: true, officerType: 'CONTRACTOR_COMPANY' }
  ];

  constructor(
    readonly auth: AuthService,
    private readonly permissionService: PermissionService,
    private readonly dashboard: DashboardService,
    private readonly maintenance: MaintenanceService,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    const role = this.auth.getRole();
    const user = this.auth.getCurrentUser();
    if (role === 'SUPER_ADMIN' || role === 'PROPERTY_ADMIN') {
      this.subs.add(
        this.dashboard.getStats().subscribe({
          next: (res) => {
            const s = res.data;
            if (!s) return;
            this.maintenanceBadge =
              typeof s.openMaintenanceRequests === 'number'
                ? s.openMaintenanceRequests
                : this.sumOpenMaintenanceFromMap(s);
            this.inventoryBadge =
              typeof s.totalInventoryItems === 'number' ? s.totalInventoryItems : s.lowStockItems ?? 0;
          }
        })
      );
    } else if (role === 'MAINTENANCE_OFFICER' && user?.id) {
      this.subs.add(
        this.maintenance.getOfficerOpenCount(user.id).subscribe({
          next: (res) => {
            this.officerOpenBadge = res.data ?? 0;
          }
        })
      );
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  badgeFor(item: NavItem): number {
    if (item.route === '/admin/maintenance') return this.maintenanceBadge;
    if (item.route === '/admin/inventory') return this.inventoryBadge;
    if (item.route === '/officer/requests') return this.officerOpenBadge;
    return 0;
  }

  private sumOpenMaintenanceFromMap(stats: DashboardStats): number {
    const m = stats.requestsByStatus;
    if (!m) return (stats.pendingRequests ?? 0) + (stats.inProgressRequests ?? 0);
    const terminal = new Set(['COMPLETED', 'CANCELLED']);
    let sum = 0;
    for (const [k, v] of Object.entries(m)) {
      if (!terminal.has(k)) sum += v;
    }
    return sum;
  }

  private itemsForRole(role: UserRole | null): NavItem[] {
    if (!role) return [];
    const user = this.auth.getCurrentUser();
    return this.navItems.filter((item) => {
      if (!item.roles.includes(role)) return false;
      if (!this.permissionService.isPropertyModuleEnabled(item.permissionKey)) return false;
      if (!item.bypassPermission && !this.permissionService.can(item.permissionKey, 'menu')) return false;
      if (item.officerType && user?.maintenanceOfficerType !== item.officerType) return false;
      return true;
    });
  }

  get visibleSections(): NavSection[] {
    const role = this.auth.getRole();
    if (this.cacheRole === role) return this.cacheSections;
    const visibleItems = this.itemsForRole(role);
    this.cacheSections = this.sectionOrder
      .map((key) => ({ key, items: visibleItems.filter((i) => i.sectionKey === key) }))
      .filter((section) => section.items.length > 0);
    this.cacheRole = role;
    return this.cacheSections;
  }

  get currentUser() {
    const user = this.auth.getCurrentUser();
    if (!this.cacheUser || this.cacheUser.id !== user?.id || this.cacheUser.fullName !== user?.fullName || this.cacheUser.role !== user?.role || this.cacheUser.profileImageUrl !== user?.profileImageUrl || this.cacheUser.initials !== user?.initials) {
      this.cacheUser = user;
    }
    return this.cacheUser;
  }

  get roleKey(): string {
    const role = this.auth.getRole();
    return role ? `ROLE.${role}` : '';
  }

  logout(): void {
    this.auth.logout();
  }

  trackBySection(_: number, section: NavSection): NavSection['key'] {
    return section.key;
  }

  trackByRoute(_: number, item: NavItem): NavItem['route'] {
    return item.route;
  }

  toggleSection(sectionKey: NavSection['key']): void {
    this.sectionExpanded[sectionKey] = !this.sectionExpanded[sectionKey];
  }

  onNavClick(item: NavItem, event: Event): void {
    if (item.route === '/tenant/new-request') {
      event.preventDefault();
      const dialogRef = this.dialog.open(MaintenanceRequestDialogComponent, {
        width: '720px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        panelClass: 'app-dialog-panel',
        data: { context: 'tenant' },
        disableClose: true
      });
      dialogRef.afterClosed().subscribe((result) => {
        if (result) {
          this.subs.add(
            this.maintenance.getOfficerOpenCount(this.auth.getCurrentUser()?.id ?? 0).subscribe({
              next: (res) => { this.officerOpenBadge = res.data ?? 0; }
            })
          );
        }
      });
    }
  }
}
