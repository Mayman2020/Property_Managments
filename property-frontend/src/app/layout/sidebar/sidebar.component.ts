import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/user.model';

interface NavItem {
  icon: string;
  labelKey: string;
  route: string;
  roles: UserRole[];
  badge?: number;
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

  readonly navItems: NavItem[] = [
    { icon: 'dashboard', labelKey: 'NAV.DASHBOARD', route: '/admin/dashboard', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'] },
    { icon: 'apartment', labelKey: 'NAV.PROPERTIES', route: '/admin/properties', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'] },
    { icon: 'meeting_room', labelKey: 'NAV.UNITS', route: '/admin/units', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'] },
    { icon: 'people', labelKey: 'NAV.TENANTS', route: '/admin/tenants', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'] },
    { icon: 'build', labelKey: 'NAV.MAINTENANCE', route: '/admin/maintenance', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'] },
    { icon: 'star_rate', labelKey: 'NAV.RATINGS', route: '/admin/ratings', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'] },
    { icon: 'engineering', labelKey: 'NAV.CONTRACTOR_COMPANIES', route: '/admin/contractors', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'] },
    { icon: 'inventory_2', labelKey: 'NAV.INVENTORY', route: '/admin/inventory', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'] },
    { icon: 'bar_chart', labelKey: 'NAV.REPORTS', route: '/admin/reports', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'] },
    { icon: 'people_alt', labelKey: 'NAV.USERS', route: '/admin/users', roles: ['SUPER_ADMIN'] },
    { icon: 'assignment', labelKey: 'NAV.MY_REQUESTS', route: '/officer/requests', roles: ['MAINTENANCE_OFFICER'] },
    { icon: 'calendar_month', labelKey: 'NAV.SCHEDULE', route: '/officer/schedule', roles: ['MAINTENANCE_OFFICER'] },
    { icon: 'person', labelKey: 'NAV.PROFILE', route: '/officer/profile', roles: ['MAINTENANCE_OFFICER'] },
    { icon: 'home', labelKey: 'NAV.MY_UNIT', route: '/tenant/dashboard', roles: ['TENANT'] },
    { icon: 'add_circle', labelKey: 'NAV.NEW_REQUEST', route: '/tenant/new-request', roles: ['TENANT'] },
    { icon: 'history', labelKey: 'NAV.MY_REQUESTS', route: '/tenant/requests', roles: ['TENANT'] },
    { icon: 'person', labelKey: 'NAV.PROFILE', route: '/tenant/profile', roles: ['TENANT'] },
    { icon: 'person', labelKey: 'NAV.PROFILE', route: '/admin/profile', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'] }
  ];

  constructor(readonly auth: AuthService) {}

  get visibleItems(): NavItem[] {
    const role = this.auth.getRole();
    if (!role) return [];
    return this.navItems.filter((item) => item.roles.includes(role));
  }

  get currentUser() {
    return this.auth.getCurrentUser();
  }

  get roleKey(): string {
    const role = this.auth.getRole();
    return role ? `ROLE.${role}` : '';
  }

  logout(): void {
    this.auth.logout();
  }
}
