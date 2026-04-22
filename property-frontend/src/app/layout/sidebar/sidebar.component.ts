import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/user.model';

interface NavItem {
  icon: string;
  labelAr: string;
  labelEn: string;
  route: string;
  roles: UserRole[];
  badge?: number;
  children?: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [NgClass, NgFor, NgIf, RouterLink, RouterLinkActive, MatTooltipModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  @Input() collapsed = false;
  @Input() lang: 'ar' | 'en' = 'ar';
  @Output() collapseToggle = new EventEmitter<void>();

  readonly navItems: NavItem[] = [
    { icon: 'dashboard', labelAr: 'لوحة التحكم', labelEn: 'Dashboard', route: '/admin/dashboard', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'] },
    { icon: 'apartment', labelAr: 'العقارات', labelEn: 'Properties', route: '/admin/properties', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'] },
    { icon: 'meeting_room', labelAr: 'الوحدات', labelEn: 'Units', route: '/admin/units', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'] },
    { icon: 'people', labelAr: 'المستأجرون', labelEn: 'Tenants', route: '/admin/tenants', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'] },
    { icon: 'build', labelAr: 'طلبات الصيانة', labelEn: 'Maintenance', route: '/admin/maintenance', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'] },
    { icon: 'inventory_2', labelAr: 'المخزن', labelEn: 'Inventory', route: '/admin/inventory', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'] },
    { icon: 'bar_chart', labelAr: 'التقارير', labelEn: 'Reports', route: '/admin/reports', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'] },
    { icon: 'people_alt', labelAr: 'المستخدمون', labelEn: 'Users', route: '/admin/users', roles: ['SUPER_ADMIN'] },
    { icon: 'assignment', labelAr: 'طلباتي', labelEn: 'My Requests', route: '/officer/requests', roles: ['MAINTENANCE_OFFICER'] },
    { icon: 'calendar_month', labelAr: 'جدول الزيارات', labelEn: 'Schedule', route: '/officer/schedule', roles: ['MAINTENANCE_OFFICER'] },
    { icon: 'person', labelAr: 'الملف الشخصي', labelEn: 'Profile', route: '/officer/profile', roles: ['MAINTENANCE_OFFICER'] },
    { icon: 'home', labelAr: 'بيتي', labelEn: 'My Unit', route: '/tenant/dashboard', roles: ['TENANT'] },
    { icon: 'add_circle', labelAr: 'طلب صيانة', labelEn: 'New Request', route: '/tenant/new-request', roles: ['TENANT'] },
    { icon: 'history', labelAr: 'سجل طلباتي', labelEn: 'My Requests', route: '/tenant/requests', roles: ['TENANT'] },
    { icon: 'person', labelAr: 'الملف الشخصي', labelEn: 'Profile', route: '/tenant/profile', roles: ['TENANT'] },
    { icon: 'person', labelAr: 'الملف الشخصي', labelEn: 'Profile', route: '/admin/profile', roles: ['SUPER_ADMIN', 'PROPERTY_ADMIN'] }
  ];

  constructor(readonly auth: AuthService) {}

  get visibleItems(): NavItem[] {
    const role = this.auth.getRole();
    if (!role) return [];
    return this.navItems.filter((item) => item.roles.includes(role));
  }

  label(item: NavItem): string {
    return this.lang === 'ar' ? item.labelAr : item.labelEn;
  }

  get currentUser() {
    return this.auth.getCurrentUser();
  }

  get roleLabel(): string {
    const role = this.auth.getRole();
    const map: Record<string, string> = {
      SUPER_ADMIN: this.lang === 'ar' ? 'مدير عام' : 'Super Admin',
      PROPERTY_ADMIN: this.lang === 'ar' ? 'مدير عقار' : 'Property Admin',
      MAINTENANCE_OFFICER: this.lang === 'ar' ? 'مسؤول صيانة' : 'Maintenance Officer',
      TENANT: this.lang === 'ar' ? 'مستأجر' : 'Tenant'
    };
    return role ? (map[role] ?? role) : '';
  }

  logout(): void { this.auth.logout(); }
}
