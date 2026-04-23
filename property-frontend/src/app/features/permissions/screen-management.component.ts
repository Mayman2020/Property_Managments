import { Component, OnInit } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';

import { PermissionMap, UserRole } from '../../core/models/user.model';
import { I18nService } from '../../core/i18n/i18n.service';
import { PermissionService, RolePermissionDto, ScreenSettingDto } from '../../core/services/permission.service';
import { SnackService } from '../../core/services/snack.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

interface ScreenConfig {
  key: string;
  icon: string;
  label: string;
}

@Component({
  selector: 'app-screen-management',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    NgClass,
    TranslateModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    PageHeaderComponent
  ],
  template: `
    <div class="app-page screen-mgmt-page">
      <app-page-header
        [title]="'SCREENS.TITLE' | translate"
        [subtitle]="'SCREENS.SUBTITLE' | translate"
        [breadcrumbs]="[{label:('NAV.DASHBOARD' | translate), route:'/admin/dashboard'}, {label:('NAV.SCREENS' | translate)}]">
      </app-page-header>

      <div class="loading-center" *ngIf="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div class="screen-list" *ngIf="!loading">
        <div class="surface-glow screen-card" *ngFor="let screen of screens">
          <div class="screen-head">
            <div class="screen-title">
              <span class="material-icons">{{ screen.icon }}</span>
              <div>
                <h3>{{ screen.label }}</h3>
                <p>{{ 'SCREENS.ROLE_HINT' | translate }}</p>
              </div>
            </div>

            <div class="global-toggle">
              <span>{{ 'SCREENS.GLOBAL' | translate }}</span>
              <mat-slide-toggle
                color="primary"
                [checked]="screenSettings[screen.key] !== false"
                [disabled]="savingGlobal.has(screen.key)"
                (change)="toggleGlobal(screen.key, $event.checked)">
              </mat-slide-toggle>
            </div>
          </div>

          <div class="role-grid">
            <div class="role-box" *ngFor="let role of roleOptions" [ngClass]="{ disabled: screenSettings[screen.key] === false }">
              <div class="role-box-head">
                <strong>{{ roleLabel(role) }}</strong>
                <mat-slide-toggle
                  color="accent"
                  [checked]="isRoleEnabled(role, screen.key)"
                  [disabled]="screenSettings[screen.key] === false || savingRoles[role].has(screen.key)"
                  (change)="toggleRole(screen.key, role, $event.checked)">
                </mat-slide-toggle>
              </div>
              <p>{{ 'SCREENS.ROLE_VISIBILITY' | translate }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .screen-mgmt-page {
      display: grid;
      gap: 1.25rem;
    }

    .loading-center {
      display: flex;
      justify-content: center;
      padding: 2rem 0;
    }

    .screen-list {
      display: grid;
      gap: 1rem;
    }

    .screen-card {
      padding: 1.1rem;
      border-radius: 1.5rem;
      display: grid;
      gap: 1rem;
    }

    .screen-head {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: center;
      border-bottom: 1px solid rgba(15, 23, 42, 0.08);
      padding-bottom: 1rem;
    }

    .screen-title {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .screen-title .material-icons {
      width: 2.8rem;
      height: 2.8rem;
      display: grid;
      place-items: center;
      border-radius: 1rem;
      background: rgba(19, 78, 74, 0.08);
      color: var(--brand-deep);
    }

    .screen-title h3 {
      margin: 0;
    }

    .screen-title p {
      margin: 0.18rem 0 0;
      color: var(--ink-soft);
    }

    .global-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      font-weight: 700;
    }

    .role-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 0.85rem;
    }

    .role-box {
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 1.1rem;
      padding: 0.9rem;
      background: rgba(255, 255, 255, 0.72);
    }

    .role-box.disabled {
      opacity: 0.55;
    }

    .role-box-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
    }

    .role-box p {
      margin: 0.3rem 0 0;
      color: var(--ink-soft);
      font-size: 0.86rem;
    }

    @media (max-width: 768px) {
      .screen-head {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `]
})
export class ScreenManagementComponent implements OnInit {
  loading = true;
  readonly roleOptions: UserRole[] = ['SUPER_ADMIN', 'PROPERTY_ADMIN', 'MAINTENANCE_OFFICER', 'TENANT'];
  readonly screens: ScreenConfig[] = [
    { key: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
    { key: 'properties', icon: 'apartment', label: 'Properties' },
    { key: 'units', icon: 'meeting_room', label: 'Units' },
    { key: 'tenants', icon: 'groups', label: 'Tenants' },
    { key: 'maintenance', icon: 'plumbing', label: 'Maintenance' },
    { key: 'inventory', icon: 'inventory_2', label: 'Inventory' },
    { key: 'reports', icon: 'bar_chart', label: 'Reports' },
    { key: 'users', icon: 'manage_accounts', label: 'Users' },
    { key: 'lookups', icon: 'public', label: 'Lookups' },
    { key: 'contractors', icon: 'engineering', label: 'Contractors' },
    { key: 'ratings', icon: 'star_rate', label: 'Ratings' },
    { key: 'schedule', icon: 'calendar_month', label: 'Schedule' },
    { key: 'profile', icon: 'person', label: 'Profile' },
    { key: 'my_unit', icon: 'home_work', label: 'My Unit' },
    { key: 'new_request', icon: 'add_circle', label: 'New Request' },
    { key: 'my_requests', icon: 'assignment', label: 'My Requests' },
    { key: 'permissions', icon: 'verified_user', label: 'Permissions' }
  ];

  rolePermissions: Record<UserRole, PermissionMap> = {
    SUPER_ADMIN: {},
    PROPERTY_ADMIN: {},
    MAINTENANCE_OFFICER: {},
    TENANT: {}
  };
  screenSettings: Record<string, boolean> = {};
  savingGlobal = new Set<string>();
  savingRoles: Record<UserRole, Set<string>> = {
    SUPER_ADMIN: new Set<string>(),
    PROPERTY_ADMIN: new Set<string>(),
    MAINTENANCE_OFFICER: new Set<string>(),
    TENANT: new Set<string>()
  };

  constructor(
    private readonly permissionService: PermissionService,
    private readonly snack: SnackService,
    private readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    forkJoin({
      permissions: this.permissionService.getAll(),
      screens: this.permissionService.getScreenSettings()
    }).subscribe({
      next: ({ permissions, screens }) => {
        this.applyRoles(permissions.data ?? []);
        this.applyScreens(screens.data ?? []);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.error(this.i18n.instant('SCREENS.LOAD_ERROR'));
      }
    });
  }

  roleLabel(role: UserRole): string {
    return this.i18n.instant(`ROLE.${role}`);
  }

  isRoleEnabled(role: UserRole, screenKey: string): boolean {
    return this.rolePermissions[role]?.[screenKey]?.enabled === true;
  }

  toggleGlobal(screenKey: string, globallyEnabled: boolean): void {
    if (this.savingGlobal.has(screenKey)) return;
    this.savingGlobal.add(screenKey);
    this.permissionService.updateScreenSetting(screenKey, globallyEnabled).subscribe({
      next: (res) => {
        this.savingGlobal.delete(screenKey);
        this.screenSettings[screenKey] = !!res.data?.globallyEnabled;
        this.snack.success(this.i18n.instant('SCREENS.SAVE_SUCCESS'));
      },
      error: () => {
        this.savingGlobal.delete(screenKey);
        this.snack.error(this.i18n.instant('SCREENS.SAVE_ERROR'));
      }
    });
  }

  toggleRole(screenKey: string, role: UserRole, enabled: boolean): void {
    if (this.savingRoles[role].has(screenKey)) return;

    const permissions = this.clonePermissions(this.rolePermissions[role]);
    const current = permissions[screenKey] ?? this.emptyModulePermissions();
    permissions[screenKey] = {
      ...current,
      enabled,
      menu: enabled ? current.menu : false,
      view: enabled ? current.view || true : false
    };

    this.savingRoles[role].add(screenKey);
    this.permissionService.update(role, { permissions }).subscribe({
      next: (res) => {
        this.savingRoles[role].delete(screenKey);
        this.rolePermissions[role] = this.clonePermissions(res.data?.permissions ?? permissions);
        this.snack.success(this.i18n.instant('SCREENS.SAVE_SUCCESS'));
      },
      error: () => {
        this.savingRoles[role].delete(screenKey);
        this.snack.error(this.i18n.instant('SCREENS.SAVE_ERROR'));
      }
    });
  }

  private applyRoles(items: RolePermissionDto[]): void {
    for (const item of items) {
      this.rolePermissions[item.role] = this.clonePermissions(item.permissions);
    }
  }

  private applyScreens(items: ScreenSettingDto[]): void {
    this.screenSettings = items.reduce<Record<string, boolean>>((acc, item) => {
      acc[item.screenKey] = !!item.globallyEnabled;
      return acc;
    }, {});
    this.permissionService.setScreenSettings(items);
  }

  private clonePermissions(permissions: PermissionMap): PermissionMap {
    return JSON.parse(JSON.stringify(permissions ?? {})) as PermissionMap;
  }

  private emptyModulePermissions() {
    return {
      enabled: false,
      menu: false,
      view: false,
      create: false,
      edit: false,
      delete: false,
      assign: false,
      schedule: false,
      start: false,
      submit: false,
      approve: false,
      reject: false,
      export: false,
      rate: false,
      manage: false,
      toggle: false
    };
  }
}
