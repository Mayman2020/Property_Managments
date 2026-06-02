import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/user.model';
import { PermissionService } from '../../core/services/permission.service';
import { DashboardService, DashboardStats } from '../../core/services/dashboard.service';
import { MaintenanceService } from '../../core/services/maintenance.service';
import { NavigationHistoryService } from '../../core/services/navigation-history.service';

interface NavItem {
  icon: string;
  labelKey: string;
  route: string;
  roles: UserRole[];
  permissionKey: string;
  sectionKey: 'NAV_SECTION.OVERVIEW' | 'NAV_SECTION.DIRECTORY' | 'NAV_SECTION.OPERATIONS' | 'NAV_SECTION.CONTRACTS' | 'NAV_SECTION.FINANCE' | 'NAV_SECTION.YOU';
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
    'NAV_SECTION.FINANCE',
    'NAV_SECTION.YOU'
  ];
  private cacheRole: string | undefined = undefined;
  private cacheSections: NavSection[] = [];
  private cacheUser: ReturnType<AuthService['getCurrentUser']> | undefined = undefined;

  private readonly subs = new Subscription();
  private readonly badgeSubs = new Subscription();
  private maintenanceBadge = 0;
  private inventoryBadge = 0;
  private officerOpenBadge = 0;
  readonly sectionExpanded: Record<NavItem['sectionKey'], boolean> = {
    'NAV_SECTION.OVERVIEW': true,
    'NAV_SECTION.DIRECTORY': true,
    'NAV_SECTION.OPERATIONS': true,
    'NAV_SECTION.CONTRACTS': true,
    'NAV_SECTION.FINANCE': true,
    'NAV_SECTION.YOU': true
  };

  readonly navItems: NavItem[] = [
    { icon: 'dashboard', labelKey: 'NAV.DASHBOARD', route: '/admin/dashboard', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'PROPERTY_GUARD', 'OWNER'], permissionKey: 'dashboard', sectionKey: 'NAV_SECTION.OVERVIEW' },
    { icon: 'apartment', labelKey: 'NAV.PROPERTIES', route: '/admin/properties', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'OWNER'], permissionKey: 'properties', sectionKey: 'NAV_SECTION.DIRECTORY' },
    { icon: 'meeting_room', labelKey: 'NAV.UNITS', route: '/admin/units', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'OWNER'], permissionKey: 'units', sectionKey: 'NAV_SECTION.DIRECTORY' },
    { icon: 'groups', labelKey: 'NAV.TENANTS', route: '/admin/tenants', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'OWNER'], permissionKey: 'tenants', sectionKey: 'NAV_SECTION.DIRECTORY' },
    { icon: 'plumbing', labelKey: 'NAV.MAINTENANCE', route: '/admin/maintenance', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'PROPERTY_GUARD', 'OWNER'], permissionKey: 'maintenance', sectionKey: 'NAV_SECTION.OPERATIONS' },
    { icon: 'star_rate', labelKey: 'NAV.RATINGS', route: '/admin/ratings', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT'], permissionKey: 'ratings', sectionKey: 'NAV_SECTION.DIRECTORY' },
    { icon: 'engineering', labelKey: 'NAV.CONTRACTOR_COMPANIES', route: '/admin/contractors', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'OWNER'], permissionKey: 'contractors', sectionKey: 'NAV_SECTION.DIRECTORY' },
    { icon: 'person_pin', labelKey: 'NAV.OWNERS', route: '/admin/owners', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT'], permissionKey: 'properties', sectionKey: 'NAV_SECTION.DIRECTORY' },
    { icon: 'inventory_2', labelKey: 'NAV.INVENTORY', route: '/admin/inventory', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'OWNER'], permissionKey: 'inventory', sectionKey: 'NAV_SECTION.OPERATIONS' },
    { icon: 'bar_chart', labelKey: 'NAV.REPORTS', route: '/admin/reports', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'OWNER'], permissionKey: 'reports', sectionKey: 'NAV_SECTION.OPERATIONS' },
    { icon: 'event_busy', labelKey: 'NAV.CONTRACT_EXPIRY_REPORT', route: '/admin/reports/contract-expiry', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'OWNER'], permissionKey: 'contracts', sectionKey: 'NAV_SECTION.OPERATIONS', bypassPermission: true },
    { icon: 'domain', labelKey: 'NAV.OCCUPANCY_ANALYTICS', route: '/admin/reports/occupancy', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'OWNER'], permissionKey: 'properties', sectionKey: 'NAV_SECTION.OPERATIONS', bypassPermission: true },
    { icon: 'handyman', labelKey: 'NAV.MAINTENANCE_REPORT', route: '/admin/reports/maintenance', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'OWNER'], permissionKey: 'maintenance', sectionKey: 'NAV_SECTION.OPERATIONS', bypassPermission: true },
    { icon: 'assignment', labelKey: 'NAV.MY_REQUESTS', route: '/admin/my-requests', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'PROCEDURES_CLERK', 'PROPERTY_GUARD', 'OWNER'], permissionKey: 'my_requests', sectionKey: 'NAV_SECTION.YOU', bypassPermission: true },
    { icon: 'tune', labelKey: 'NAV.USERS', route: '/admin/users', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT'], permissionKey: 'users', sectionKey: 'NAV_SECTION.YOU' },
    { icon: 'domain', labelKey: 'NAV.LEGAL_ENTITIES', route: '/admin/legal-entities', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER'], permissionKey: 'settings', sectionKey: 'NAV_SECTION.YOU', bypassPermission: true },
    { icon: 'manage_accounts', labelKey: 'NAV.USER_ACCESS', route: '/admin/user-access', roles: ['SUPER_ADMIN'], permissionKey: 'users', sectionKey: 'NAV_SECTION.YOU' },
    { icon: 'dashboard_customize', labelKey: 'NAV.SCREENS', route: '/admin/screens', roles: ['SUPER_ADMIN'], permissionKey: 'permissions', sectionKey: 'NAV_SECTION.YOU' },
    { icon: 'admin_panel_settings', labelKey: 'NAV.PERMISSIONS', route: '/admin/permissions', roles: ['SUPER_ADMIN'], permissionKey: 'permissions', sectionKey: 'NAV_SECTION.YOU' },
    { icon: 'widgets', labelKey: 'NAV.CLIENT_MODULES', route: '/admin/module-settings', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER'], permissionKey: 'permissions', sectionKey: 'NAV_SECTION.YOU', bypassPermission: true },
    { icon: 'public', labelKey: 'NAV.LOOKUPS', route: '/admin/lookups', roles: ['SUPER_ADMIN'], permissionKey: 'lookups', sectionKey: 'NAV_SECTION.YOU' },
    { icon: 'calendar_month', labelKey: 'NAV.SCHEDULE', route: '/officer/schedule', roles: ['MAINTENANCE_OFFICER_INTERNAL', 'MAINTENANCE_OFFICER_COMPANY', 'MAINTENANCE_COMPANY'], permissionKey: 'schedule', sectionKey: 'NAV_SECTION.OPERATIONS' },
    { icon: 'assignment', labelKey: 'NAV.MAINTENANCE_REQUESTS', route: '/officer/requests', roles: ['MAINTENANCE_OFFICER_INTERNAL', 'MAINTENANCE_OFFICER_COMPANY', 'MAINTENANCE_COMPANY'], permissionKey: 'my_requests', sectionKey: 'NAV_SECTION.OPERATIONS' },
    { icon: 'fact_check', labelKey: 'NAV.MY_REQUESTS', route: '/officer/my-requests', roles: ['MAINTENANCE_OFFICER_INTERNAL', 'MAINTENANCE_OFFICER_COMPANY', 'MAINTENANCE_COMPANY'], permissionKey: 'my_requests', sectionKey: 'NAV_SECTION.YOU', bypassPermission: true },
    { icon: 'inbox', labelKey: 'NAV.COMPANY_QUEUE', route: '/officer/company-queue', roles: ['MAINTENANCE_OFFICER_COMPANY', 'MAINTENANCE_COMPANY'], permissionKey: 'my_requests', sectionKey: 'NAV_SECTION.OPERATIONS', bypassPermission: true, officerType: 'CONTRACTOR_COMPANY' },
    { icon: 'group', labelKey: 'NAV.MY_STAFF', route: '/officer/my-staff', roles: ['MAINTENANCE_COMPANY'], permissionKey: 'my_requests', sectionKey: 'NAV_SECTION.DIRECTORY', bypassPermission: true, officerType: 'CONTRACTOR_COMPANY' },
    { icon: 'person', labelKey: 'NAV.PROFILE', route: '/officer/profile', roles: ['MAINTENANCE_OFFICER_INTERNAL', 'MAINTENANCE_OFFICER_COMPANY', 'MAINTENANCE_COMPANY'], permissionKey: 'profile', sectionKey: 'NAV_SECTION.YOU' },
    { icon: 'home', labelKey: 'NAV.MY_UNIT', route: '/tenant/my-unit', roles: ['TENANT'], permissionKey: 'my_unit', sectionKey: 'NAV_SECTION.OVERVIEW' },
    { icon: 'library_books', labelKey: 'NAV.MY_CONTRACTS', route: '/tenant/my-contracts', roles: ['TENANT'], permissionKey: 'my_unit', sectionKey: 'NAV_SECTION.OVERVIEW', bypassPermission: true },
    { icon: 'receipt_long', labelKey: 'NAV.RENT_RECEIPTS', route: '/tenant/rent-receipts', roles: ['TENANT'], permissionKey: 'my_unit', sectionKey: 'NAV_SECTION.OVERVIEW', bypassPermission: true },
    { icon: 'autorenew', labelKey: 'NAV.CONTRACT_REQUEST', route: '/tenant/contract-request', roles: ['TENANT'], permissionKey: 'my_unit', sectionKey: 'NAV_SECTION.OVERVIEW', bypassPermission: true },
    { icon: 'history', labelKey: 'NAV.MAINTENANCE_REQUESTS', route: '/tenant/requests', roles: ['TENANT'], permissionKey: 'my_requests', sectionKey: 'NAV_SECTION.OVERVIEW' },
    { icon: 'assignment', labelKey: 'NAV.MY_REQUESTS', route: '/tenant/my-requests', roles: ['TENANT'], permissionKey: 'my_requests', sectionKey: 'NAV_SECTION.YOU', bypassPermission: true },
    { icon: 'report_problem', labelKey: 'NAV.SUBMIT_COMPLAINT', route: '/tenant/complaints', roles: ['TENANT'], permissionKey: 'my_unit', sectionKey: 'NAV_SECTION.OVERVIEW', bypassPermission: true },
    { icon: 'notifications', labelKey: 'NAV.NOTIFICATIONS', route: '/tenant/notifications', roles: ['TENANT'], permissionKey: 'notifications', sectionKey: 'NAV_SECTION.YOU', bypassPermission: true },
    { icon: 'person', labelKey: 'NAV.PROFILE', route: '/tenant/profile', roles: ['TENANT'], permissionKey: 'profile', sectionKey: 'NAV_SECTION.YOU' },
    { icon: 'person', labelKey: 'NAV.PROFILE', route: '/admin/profile', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'HR_OFFICER', 'PROCEDURES_CLERK', 'PROPERTY_GUARD', 'OWNER'], permissionKey: 'profile', sectionKey: 'NAV_SECTION.YOU', bypassPermission: true },
    // Contracts module — admin roles see via their existing permissions; new roles bypass permission check
    { icon: 'description', labelKey: 'NAV.CONTRACTS_DASHBOARD', route: '/admin/contracts/dashboard', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'OWNER'], permissionKey: 'contracts', sectionKey: 'NAV_SECTION.CONTRACTS', bypassPermission: true },
    { icon: 'article', labelKey: 'NAV.CONTRACTS_LIST', route: '/admin/contracts/list', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'OWNER'], permissionKey: 'contracts', sectionKey: 'NAV_SECTION.CONTRACTS', bypassPermission: true },
    { icon: 'chat_bubble_outline', labelKey: 'NAV.COMPLAINTS', route: '/admin/contracts/complaints', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'OWNER'], permissionKey: 'contracts', sectionKey: 'NAV_SECTION.CONTRACTS', bypassPermission: true },
    { icon: 'file_copy', labelKey: 'NAV.TEMPLATES', route: '/admin/contracts/templates', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT'], permissionKey: 'contracts', sectionKey: 'NAV_SECTION.CONTRACTS', bypassPermission: true },
    { icon: 'bar_chart', labelKey: 'NAV.FINANCE_DASHBOARD', route: '/admin/finance/dashboard', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'OWNER'], permissionKey: 'finance', sectionKey: 'NAV_SECTION.FINANCE', bypassPermission: true },
    { icon: 'receipt_long', labelKey: 'NAV.EXPENSES', route: '/admin/finance/expenses', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'OWNER'], permissionKey: 'finance', sectionKey: 'NAV_SECTION.FINANCE', bypassPermission: true },
    { icon: 'trending_up', labelKey: 'NAV.REVENUES', route: '/admin/finance/revenues', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'OWNER'], permissionKey: 'finance', sectionKey: 'NAV_SECTION.FINANCE', bypassPermission: true },
    { icon: 'savings', labelKey: 'NAV.BUDGET', route: '/admin/finance/budget', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'OWNER'], permissionKey: 'finance', sectionKey: 'NAV_SECTION.FINANCE', bypassPermission: true },
    { icon: 'summarize', labelKey: 'NAV.FINANCIAL_REPORTS', route: '/admin/finance/reports/pnl', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'OWNER'], permissionKey: 'finance', sectionKey: 'NAV_SECTION.FINANCE', bypassPermission: true },
    { icon: 'warning_amber', labelKey: 'NAV.OVERDUE_PAYMENTS', route: '/admin/finance/overdue-payments', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'OWNER'], permissionKey: 'finance', sectionKey: 'NAV_SECTION.FINANCE', bypassPermission: true },
    { icon: 'badge', labelKey: 'NAV.EMPLOYEES', route: '/admin/hr/employees', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'HR_OFFICER', 'OWNER'], permissionKey: 'hr', sectionKey: 'NAV_SECTION.DIRECTORY', bypassPermission: true },
    { icon: 'payments', labelKey: 'NAV.PAYROLL', route: '/admin/hr/payroll', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'HR_OFFICER'], permissionKey: 'hr', sectionKey: 'NAV_SECTION.FINANCE', bypassPermission: true },
    { icon: 'money_off', labelKey: 'NAV.DEDUCTIONS', route: '/admin/hr/deductions', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'HR_OFFICER'], permissionKey: 'hr', sectionKey: 'NAV_SECTION.FINANCE', bypassPermission: true },
    { icon: 'event_available', labelKey: 'NAV.LEAVES', route: '/admin/hr/leaves', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'HR_OFFICER', 'OWNER'], permissionKey: 'hr', sectionKey: 'NAV_SECTION.OPERATIONS', bypassPermission: true },
    { icon: 'notifications', labelKey: 'NAV.NOTIFICATIONS', route: '/admin/notifications', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'OWNER'], permissionKey: 'notifications', sectionKey: 'NAV_SECTION.YOU', bypassPermission: true },
    { icon: 'history', labelKey: 'NAV.AUDIT_LOG', route: '/admin/audit-log', roles: ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'OWNER'], permissionKey: 'audit', sectionKey: 'NAV_SECTION.YOU', bypassPermission: true },
    { icon: 'apartment', labelKey: 'NAV.OWNER_PORTAL', route: '/admin/owner-portal/dashboard', roles: ['OWNER'], permissionKey: 'owner_portal', sectionKey: 'NAV_SECTION.OVERVIEW', bypassPermission: true },
    { icon: 'approval', labelKey: 'NAV.CONTRACT_APPROVALS', route: '/admin/owner-portal/contract-approvals', roles: ['OWNER', 'SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT'], permissionKey: 'owner_portal', sectionKey: 'NAV_SECTION.CONTRACTS', bypassPermission: true },
    { icon: 'fact_check', labelKey: 'NAV.RENT_CONFIRMATION', route: '/admin/accountant-portal/rent-confirmation', roles: ['ACCOUNTANT', 'SUPER_ADMIN', 'GENERAL_MANAGER', 'OWNER'], permissionKey: 'contracts', sectionKey: 'NAV_SECTION.FINANCE', bypassPermission: true },
    { icon: 'receipt_long', labelKey: 'NAV.MAINTENANCE_INVOICES', route: '/admin/accountant-portal/maintenance-invoices', roles: ['ACCOUNTANT', 'SUPER_ADMIN', 'GENERAL_MANAGER', 'OWNER'], permissionKey: 'contracts', sectionKey: 'NAV_SECTION.FINANCE', bypassPermission: true },
    // Officer: invoice portal (contractor company only)
    { icon: 'receipt', labelKey: 'NAV.MY_INVOICES', route: '/officer/invoices', roles: ['MAINTENANCE_OFFICER_INTERNAL', 'MAINTENANCE_OFFICER_COMPANY', 'MAINTENANCE_COMPANY'], permissionKey: 'my_requests', sectionKey: 'NAV_SECTION.OPERATIONS', bypassPermission: true, officerType: 'CONTRACTOR_COMPANY' },
    { icon: 'notifications', labelKey: 'NAV.NOTIFICATIONS', route: '/employee/notifications', roles: ['PROCEDURES_CLERK', 'PROPERTY_GUARD'], permissionKey: 'notifications', sectionKey: 'NAV_SECTION.YOU', bypassPermission: true },
    { icon: 'person', labelKey: 'NAV.PROFILE', route: '/employee/profile', roles: ['PROCEDURES_CLERK', 'PROPERTY_GUARD'], permissionKey: 'profile', sectionKey: 'NAV_SECTION.YOU', bypassPermission: true }
  ];

  // Section-prefix map: routes whose detail pages should highlight a specific nav item
  private readonly sectionPrefixes: Array<{ prefix: string; highlight: string }> = [
    { prefix: '/admin/contracts/',   highlight: '/admin/contracts/list' },
    { prefix: '/admin/properties/',  highlight: '/admin/properties' },
    { prefix: '/admin/units/',       highlight: '/admin/units' },
    { prefix: '/admin/tenants/',     highlight: '/admin/tenants' },
    { prefix: '/admin/maintenance/', highlight: '/admin/maintenance' },
    { prefix: '/admin/vacancies/',  highlight: '/admin/units' },
    { prefix: '/admin/inventory/',   highlight: '/admin/inventory' },
    { prefix: '/tenant/my-contracts', highlight: '/tenant/my-contracts' },
  ];

  constructor(
    readonly auth: AuthService,
    private readonly permissionService: PermissionService,
    private readonly dashboard: DashboardService,
    private readonly maintenance: MaintenanceService,
    private readonly router: Router,
    private readonly navHistory: NavigationHistoryService
  ) {}

  ngOnInit(): void {
    this.refreshSidebarStateForRole();
    this.subs.add(
      this.auth.activeRoleChanged.subscribe(() => {
        this.refreshSidebarStateForRole();
      })
    );
  }

  ngOnDestroy(): void {
    this.badgeSubs.unsubscribe();
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

  private itemsForRoles(roles: UserRole[]): NavItem[] {
    if (!roles.length) return [];
    const user = this.auth.getCurrentUser();
    return this.navItems.filter((item) => {
      if (!roles.some((r) => item.roles.includes(r))) return false;
      if (!this.permissionService.isPropertyModuleEnabled(item.permissionKey)) return false;
      if (!item.bypassPermission && !this.permissionService.can(item.permissionKey, 'menu')) return false;
      if (item.officerType) {
        const effectiveOfficerType =
          roles.includes('MAINTENANCE_COMPANY') || roles.includes('MAINTENANCE_OFFICER_COMPANY')
            ? 'CONTRACTOR_COMPANY'
            : user?.maintenanceOfficerType;
        if (effectiveOfficerType !== item.officerType) return false;
      }
      return true;
    });
  }

  get visibleSections(): NavSection[] {
    const activeRole = this.auth.getRole();
    const roles = activeRole ? [activeRole] : [];
    const key = roles.join('|');
    if (this.cacheRole === key) return this.cacheSections;
    const visibleItems = this.itemsForRoles(roles);
    this.cacheSections = this.sectionOrder
      .map((k) => ({ key: k, items: visibleItems.filter((i) => i.sectionKey === k) }))
      .filter((section) => section.items.length > 0);
    this.cacheRole = key;
    return this.cacheSections;
  }

  get currentUser() {
    const user = this.auth.getCurrentUser();
    const extraKey = (user?.extraRoles ?? []).join('|');
    if (
      !this.cacheUser ||
      this.cacheUser.id !== user?.id ||
      this.cacheUser.fullName !== user?.fullName ||
      this.cacheUser.fullNameAr !== user?.fullNameAr ||
      this.cacheUser.fullNameEn !== user?.fullNameEn ||
      this.cacheUser.role !== user?.role ||
      extraKey !== (this.cacheUser.extraRoles ?? []).join('|') ||
      this.cacheUser.profileImageUrl !== user?.profileImageUrl ||
      this.cacheUser.initials !== user?.initials
    ) {
      this.cacheUser = user;
    }
    return this.cacheUser;
  }

  get currentUserDisplayName(): string {
    const u = this.currentUser;
    if (!u) return '';
    const ar = (u.fullNameAr ?? '').trim();
    const en = (u.fullNameEn ?? '').trim();
    const fallback = (u.fullName ?? '').trim();
    return this.lang === 'ar'
      ? (ar || en || fallback)
      : (en || ar || fallback);
  }

  get roleKey(): string {
    const role = this.auth.getRole();
    return role ? `ROLE.${role}` : '';
  }

  logout(): void {
    this.auth.logout();
  }

  /** True when the nav item should be highlighted for the current URL */
  isForcedActive(item: NavItem): boolean {
    const url = this.router.url.split('?')[0];
    // Exact match (covers all normal nav routes like /admin/properties)
    if (url === item.route) return true;
    // Prefix match for detail pages (e.g. /admin/contracts/2 → highlight contracts/list)
    for (const sp of this.sectionPrefixes) {
      if (url.startsWith(sp.prefix) && item.route === sp.highlight) return true;
    }
    return false;
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
    this.navHistory.markFromMenu();
  }

  private refreshSidebarStateForRole(): void {
    // Invalidate computed/menu cache when role switches.
    this.cacheRole = undefined;
    this.cacheSections = [];

    // Reset and re-fetch role-specific badges.
    this.badgeSubs.unsubscribe();
    this.maintenanceBadge = 0;
    this.inventoryBadge = 0;
    this.officerOpenBadge = 0;

    const activeRole = this.auth.getRole();
    const roles = activeRole ? [activeRole] : [];
    const user = this.auth.getCurrentUser();
    if (roles.some((r) => r === 'SUPER_ADMIN' || r === 'GENERAL_MANAGER')) {
      this.badgeSubs.add(
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
    } else if (
      (roles.includes('MAINTENANCE_OFFICER_INTERNAL') ||
        roles.includes('MAINTENANCE_OFFICER_COMPANY') ||
        roles.includes('MAINTENANCE_COMPANY')) &&
      user?.id
    ) {
      this.badgeSubs.add(
        this.maintenance.getOfficerOpenCount(user.id).subscribe({
          next: (res) => {
            this.officerOpenBadge = res.data ?? 0;
          }
        })
      );
    }
  }
}
