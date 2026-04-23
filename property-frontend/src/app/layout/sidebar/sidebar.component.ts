import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/user.model';
import { PermissionService } from '../../core/services/permission.service';

interface NavItem {
  icon: string;
  labelKey: string;
  route: string;
  roles: UserRole[];
  permissionKey: string;
  sectionKey: 'NAV_SECTION.OVERVIEW' | 'NAV_SECTION.DIRECTORY' | 'NAV_SECTION.OPERATIONS' | 'NAV_SECTION.YOU';
  badge?: number;
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
export class SidebarComponent {
  @Input() collapsed = false;
  @Input() lang: 'ar' | 'en' = 'ar';
  @Output() collapseToggle = new EventEmitter<void>();
  private readonly sectionOrder: NavItem['sectionKey'][] = [
    'NAV_SECTION.OVERVIEW',
    'NAV_SECTION.DIRECTORY',
    'NAV_SECTION.OPERATIONS',
    'NAV_SECTION.YOU'
  ];
  private cacheRole: UserRole | null | undefined = undefined;
  private cacheSections: NavSection[] = [];
  private cacheUser: ReturnType<AuthService['getCurrentUser']> | undefined = undefined;

  readonly navItems: NavItem[] = [
    { icon: 'dashboard', labelKey: 'NAV.DASHBOARD', route: '/admin/dashboard', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'], permissionKey: 'dashboard', sectionKey: 'NAV_SECTION.OVERVIEW' },
    { icon: 'apartment', labelKey: 'NAV.PROPERTIES', route: '/admin/properties', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'], permissionKey: 'properties', sectionKey: 'NAV_SECTION.DIRECTORY' },
    { icon: 'meeting_room', labelKey: 'NAV.UNITS', route: '/admin/units', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'], permissionKey: 'units', sectionKey: 'NAV_SECTION.DIRECTORY' },
    { icon: 'groups', labelKey: 'NAV.TENANTS', route: '/admin/tenants', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'], permissionKey: 'tenants', sectionKey: 'NAV_SECTION.DIRECTORY' },
    { icon: 'plumbing', labelKey: 'NAV.MAINTENANCE', route: '/admin/maintenance', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'], permissionKey: 'maintenance', sectionKey: 'NAV_SECTION.OPERATIONS', badge: 14 },
    { icon: 'star_rate', labelKey: 'NAV.RATINGS', route: '/admin/ratings', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'], permissionKey: 'ratings', sectionKey: 'NAV_SECTION.DIRECTORY' },
    { icon: 'engineering', labelKey: 'NAV.CONTRACTOR_COMPANIES', route: '/admin/contractors', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'], permissionKey: 'contractors', sectionKey: 'NAV_SECTION.DIRECTORY' },
    { icon: 'inventory_2', labelKey: 'NAV.INVENTORY', route: '/admin/inventory', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'], permissionKey: 'inventory', sectionKey: 'NAV_SECTION.OPERATIONS', badge: 6 },
    { icon: 'bar_chart', labelKey: 'NAV.REPORTS', route: '/admin/reports', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'], permissionKey: 'reports', sectionKey: 'NAV_SECTION.OPERATIONS' },
    { icon: 'tune', labelKey: 'NAV.USERS', route: '/admin/users', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'], permissionKey: 'users', sectionKey: 'NAV_SECTION.YOU' },
    { icon: 'manage_accounts', labelKey: 'NAV.USER_ACCESS', route: '/admin/user-access', roles: ['SUPER_ADMIN'], permissionKey: 'users', sectionKey: 'NAV_SECTION.YOU' },
    { icon: 'dashboard_customize', labelKey: 'NAV.SCREENS', route: '/admin/screens', roles: ['SUPER_ADMIN'], permissionKey: 'permissions', sectionKey: 'NAV_SECTION.YOU' },
    { icon: 'admin_panel_settings', labelKey: 'NAV.PERMISSIONS', route: '/admin/permissions', roles: ['SUPER_ADMIN'], permissionKey: 'permissions', sectionKey: 'NAV_SECTION.YOU' },
    { icon: 'public', labelKey: 'NAV.LOOKUPS', route: '/admin/lookups', roles: ['SUPER_ADMIN'], permissionKey: 'lookups', sectionKey: 'NAV_SECTION.YOU' },
    { icon: 'calendar_month', labelKey: 'NAV.SCHEDULE', route: '/officer/schedule', roles: ['MAINTENANCE_OFFICER'], permissionKey: 'schedule', sectionKey: 'NAV_SECTION.OPERATIONS' },
    { icon: 'assignment', labelKey: 'NAV.MY_REQUESTS', route: '/officer/requests', roles: ['MAINTENANCE_OFFICER'], permissionKey: 'my_requests', sectionKey: 'NAV_SECTION.OPERATIONS', badge: 4 },
    { icon: 'person', labelKey: 'NAV.PROFILE', route: '/officer/profile', roles: ['MAINTENANCE_OFFICER'], permissionKey: 'profile', sectionKey: 'NAV_SECTION.YOU' },
    { icon: 'home', labelKey: 'NAV.MY_UNIT', route: '/tenant/my-unit', roles: ['TENANT'], permissionKey: 'my_unit', sectionKey: 'NAV_SECTION.OVERVIEW' },
    { icon: 'add_circle', labelKey: 'NAV.NEW_REQUEST', route: '/tenant/new-request', roles: ['TENANT'], permissionKey: 'new_request', sectionKey: 'NAV_SECTION.OVERVIEW' },
    { icon: 'history', labelKey: 'NAV.MY_REQUESTS', route: '/tenant/requests', roles: ['TENANT'], permissionKey: 'my_requests', sectionKey: 'NAV_SECTION.OVERVIEW' },
    { icon: 'person', labelKey: 'NAV.PROFILE', route: '/tenant/profile', roles: ['TENANT'], permissionKey: 'profile', sectionKey: 'NAV_SECTION.YOU' },
    { icon: 'person', labelKey: 'NAV.PROFILE', route: '/admin/profile', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'], permissionKey: 'profile', sectionKey: 'NAV_SECTION.YOU' }
  ];

  constructor(readonly auth: AuthService, private readonly permissionService: PermissionService) {}

  private itemsForRole(role: UserRole | null): NavItem[] {
    if (!role) return [];
    return this.navItems.filter((item) => item.roles.includes(role) && this.permissionService.can(item.permissionKey, 'menu'));
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
}
