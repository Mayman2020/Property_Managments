import { Component, OnInit } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TranslateModule } from '@ngx-translate/core';

import { PermissionMap, UserRole } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { PermissionService } from '../../core/services/permission.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { SnackService } from '../../core/services/snack.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

interface PermissionRoleConfig {
  key: UserRole;
  icon: string;
}

interface PermissionModuleConfig {
  key: string;
  icon: string;
  label: string;
  description: string;
}

interface PermissionActionConfig {
  key: Exclude<keyof PermissionMap[string], 'enabled'>;
  label: string;
}

@Component({
  selector: 'app-permission-management',
  standalone: true,
  imports: [
    NgClass,
    NgFor,
    NgIf,
    TranslateModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    PageHeaderComponent
  ],
  template: `
    <div class="app-page permissions-page">
      <app-page-header
        [title]="'PERMISSIONS.TITLE' | translate"
        [subtitle]="'PERMISSIONS.SUBTITLE' | translate"
        [breadcrumbs]="[{label:('NAV.DASHBOARD' | translate), route:'/admin/dashboard'}, {label:('NAV.PERMISSIONS' | translate)}]">
        <button mat-stroked-button type="button" (click)="resetSelectedRole()" [disabled]="loading || saving || !selectedRole">
          <span class="material-icons">restart_alt</span>
          {{ 'PERMISSIONS.RESET_ROLE' | translate }}
        </button>
        <button mat-flat-button type="button" (click)="saveSelectedRole()" [disabled]="loading || saving || !selectedRole">
          <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
          <span *ngIf="!saving" class="btn-inline">
            <span class="material-icons">save</span>
            {{ 'PERMISSIONS.SAVE_ROLE' | translate }}
          </span>
        </button>
      </app-page-header>

      <div class="loading-center" *ngIf="loading">
        <mat-spinner diameter="44"></mat-spinner>
      </div>

      <ng-container *ngIf="!loading && selectedRole">
        <div class="roles-grid">
          <button
            *ngFor="let role of roles"
            type="button"
            class="role-pill surface-glow"
            [ngClass]="{ active: selectedRole === role.key }"
            (click)="selectedRole = role.key">
            <span class="material-icons">{{ role.icon }}</span>
            <div>
              <strong>{{ roleLabel(role.key) }}</strong>
              <span>{{ roleSummary(role.key) }}</span>
            </div>
          </button>
        </div>

        <div class="surface-glow permissions-board">
          <div class="board-intro">
            <div>
              <h3>{{ roleLabel(selectedRole) }}</h3>
              <p>{{ 'PERMISSIONS.BOARD_HINT' | translate }}</p>
            </div>
            <div class="summary-chip">
              <span class="material-icons">verified_user</span>
              {{ enabledModulesCount(selectedRole) }} / {{ modules.length }} {{ 'PERMISSIONS.MODULES_ENABLED' | translate }}
            </div>
          </div>

          <div class="module-card" *ngFor="let module of modules">
            <div class="module-head">
              <div class="module-title">
                <span class="material-icons">{{ module.icon }}</span>
                <div>
                  <h4>{{ module.label }}</h4>
                  <p>{{ module.description }}</p>
                </div>
              </div>

              <mat-slide-toggle
                color="primary"
                [checked]="modulePermissions(selectedRole, module.key).enabled"
                (change)="setPermission(module.key, 'enabled', $event.checked)">
                {{ 'PERMISSIONS.ENABLED' | translate }}
              </mat-slide-toggle>
            </div>

            <div class="action-grid">
              <label
                *ngFor="let action of actions"
                class="action-toggle"
                [ngClass]="{ muted: !modulePermissions(selectedRole, module.key).enabled }">
                <span>{{ action.label }}</span>
                <mat-slide-toggle
                  color="accent"
                  [checked]="modulePermissions(selectedRole, module.key)[action.key]"
                  [disabled]="!modulePermissions(selectedRole, module.key).enabled"
                  (change)="setPermission(module.key, action.key, $event.checked)">
                </mat-slide-toggle>
              </label>
            </div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .permissions-page {
      display: grid;
      gap: 1.5rem;
    }

    .btn-inline {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
    }

    .roles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
    }

    .role-pill {
      border: 1px solid rgba(15, 23, 42, 0.08);
      background: rgba(255, 255, 255, 0.88);
      border-radius: 1.4rem;
      padding: 1rem 1.1rem;
      display: flex;
      align-items: center;
      gap: 0.9rem;
      text-align: start;
      cursor: pointer;
      transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
    }

    .role-pill .material-icons {
      width: 2.8rem;
      height: 2.8rem;
      border-radius: 0.9rem;
      display: grid;
      place-items: center;
      background: rgba(19, 78, 74, 0.08);
      color: var(--brand-deep);
      font-size: 1.35rem;
    }

    .role-pill strong,
    .role-pill span {
      display: block;
    }

    .role-pill span:last-child {
      color: var(--ink-soft);
      font-size: 0.84rem;
      margin-top: 0.2rem;
    }

    .role-pill.active {
      border-color: rgba(19, 78, 74, 0.28);
      box-shadow: 0 18px 40px rgba(19, 78, 74, 0.12);
      transform: translateY(-2px);
    }

    .permissions-board {
      border-radius: 1.75rem;
      padding: 1.35rem;
      display: grid;
      gap: 1rem;
    }

    .board-intro {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      border-bottom: 1px solid rgba(15, 23, 42, 0.08);
      padding-bottom: 1rem;
    }

    .board-intro h3 {
      margin: 0;
      font-size: 1.15rem;
    }

    .board-intro p {
      margin: 0.3rem 0 0;
      color: var(--ink-soft);
    }

    .summary-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      border-radius: 999px;
      padding: 0.7rem 1rem;
      background: rgba(19, 78, 74, 0.08);
      color: var(--brand-deep);
      font-weight: 700;
      white-space: nowrap;
    }

    .module-card {
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 1.4rem;
      background: rgba(255, 255, 255, 0.8);
      padding: 1rem 1.1rem;
      display: grid;
      gap: 1rem;
    }

    .module-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .module-title {
      display: flex;
      align-items: center;
      gap: 0.9rem;
    }

    .module-title .material-icons {
      width: 2.7rem;
      height: 2.7rem;
      display: grid;
      place-items: center;
      border-radius: 0.95rem;
      background: rgba(180, 83, 9, 0.1);
      color: #b45309;
    }

    .module-title h4 {
      margin: 0;
      font-size: 1rem;
    }

    .module-title p {
      margin: 0.18rem 0 0;
      color: var(--ink-soft);
      font-size: 0.87rem;
    }

    .action-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 0.85rem;
    }

    .action-toggle {
      border-radius: 1rem;
      border: 1px solid rgba(15, 23, 42, 0.08);
      background: rgba(248, 250, 252, 0.9);
      padding: 0.8rem 0.95rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      font-weight: 600;
    }

    .action-toggle.muted {
      opacity: 0.62;
    }

    @media (max-width: 768px) {
      .board-intro,
      .module-head {
        align-items: flex-start;
        flex-direction: column;
      }

      .summary-chip {
        white-space: normal;
      }
    }
  `]
})
export class PermissionManagementComponent implements OnInit {
  readonly roles: PermissionRoleConfig[] = [
    { key: 'SUPER_ADMIN', icon: 'admin_panel_settings' },
    { key: 'PROPERTY_ADMIN', icon: 'business_center' },
    { key: 'MAINTENANCE_OFFICER', icon: 'engineering' },
    { key: 'TENANT', icon: 'home' }
  ];

  readonly modules: PermissionModuleConfig[] = [
    { key: 'dashboard', icon: 'dashboard', label: 'Dashboard', description: 'Overview screen and summary widgets.' },
    { key: 'properties', icon: 'apartment', label: 'Properties', description: 'Property list and property forms.' },
    { key: 'units', icon: 'meeting_room', label: 'Units', description: 'Units list and unit editing actions.' },
    { key: 'tenants', icon: 'groups', label: 'Tenants', description: 'Tenant records and assignment management.' },
    { key: 'maintenance', icon: 'plumbing', label: 'Maintenance', description: 'Maintenance requests, assignment, scheduling, and execution.' },
    { key: 'inventory', icon: 'inventory_2', label: 'Inventory', description: 'Inventory items and stock operations.' },
    { key: 'reports', icon: 'bar_chart', label: 'Reports', description: 'Analytics dashboards and exports.' },
    { key: 'users', icon: 'manage_accounts', label: 'Users', description: 'User accounts, activation, and role management.' },
    { key: 'lookups', icon: 'public', label: 'Lookups', description: 'Country and city lookup data.' },
    { key: 'contractors', icon: 'engineering', label: 'Contractors', description: 'Contractor companies and external maintenance providers.' },
    { key: 'ratings', icon: 'star_rate', label: 'Ratings', description: 'Visit ratings and tenant feedback.' },
    { key: 'schedule', icon: 'calendar_month', label: 'Schedule', description: 'Officer schedule screen and visit planning.' },
    { key: 'profile', icon: 'person', label: 'Profile', description: 'Profile page and personal data editing.' },
    { key: 'my_unit', icon: 'home_work', label: 'My Unit', description: 'Tenant unit overview and lease context.' },
    { key: 'new_request', icon: 'add_circle', label: 'New Request', description: 'Tenant request creation entry point.' },
    { key: 'my_requests', icon: 'assignment', label: 'My Requests', description: 'Tenant or officer personal request lists and actions.' },
    { key: 'permissions', icon: 'verified_user', label: 'Permissions', description: 'Role permissions management screen.' }
  ];

  readonly actions: PermissionActionConfig[] = [
    { key: 'menu', label: 'Menu' },
    { key: 'view', label: 'View' },
    { key: 'create', label: 'Create' },
    { key: 'edit', label: 'Edit' },
    { key: 'delete', label: 'Delete' },
    { key: 'assign', label: 'Assign' },
    { key: 'schedule', label: 'Schedule' },
    { key: 'start', label: 'Start' },
    { key: 'submit', label: 'Submit' },
    { key: 'approve', label: 'Approve' },
    { key: 'reject', label: 'Reject' },
    { key: 'export', label: 'Export' },
    { key: 'rate', label: 'Rate' },
    { key: 'manage', label: 'Manage' },
    { key: 'toggle', label: 'Toggle' }
  ];

  loading = true;
  saving = false;
  selectedRole: UserRole = 'SUPER_ADMIN';
  private originalPermissions: Record<UserRole, PermissionMap> = {
    SUPER_ADMIN: {},
    PROPERTY_ADMIN: {},
    MAINTENANCE_OFFICER: {},
    TENANT: {}
  };
  private editablePermissions: Record<UserRole, PermissionMap> = {
    SUPER_ADMIN: {},
    PROPERTY_ADMIN: {},
    MAINTENANCE_OFFICER: {},
    TENANT: {}
  };

  constructor(
    private readonly permissionService: PermissionService,
    private readonly auth: AuthService,
    private readonly snack: SnackService,
    private readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.permissionService.getAll().subscribe({
      next: (res) => {
        for (const item of res.data ?? []) {
          this.originalPermissions[item.role] = this.clonePermissions(item.permissions);
          this.editablePermissions[item.role] = this.clonePermissions(item.permissions);
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.error(this.i18n.instant('PERMISSIONS.LOAD_ERROR'));
      }
    });
  }

  roleLabel(role: UserRole): string {
    return this.i18n.instant(`ROLE.${role}`);
  }

  roleSummary(role: UserRole): string {
    return `${this.enabledModulesCount(role)} ${this.i18n.instant('PERMISSIONS.ENABLED_COUNT')}`;
  }

  enabledModulesCount(role: UserRole): number {
    return this.modules.filter((module) => this.modulePermissions(role, module.key).enabled).length;
  }

  modulePermissions(role: UserRole, moduleKey: string) {
    const rolePermissions = this.editablePermissions[role] ?? {};
    return rolePermissions[moduleKey] ?? {
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

  setPermission(moduleKey: string, action: string, checked: boolean): void {
    const modulePermissions = this.modulePermissions(this.selectedRole, moduleKey);
    modulePermissions[action as keyof typeof modulePermissions] = checked;
    if (action !== 'enabled' && checked) {
      modulePermissions.enabled = true;
    }
  }

  resetSelectedRole(): void {
    this.editablePermissions[this.selectedRole] = this.clonePermissions(this.originalPermissions[this.selectedRole]);
  }

  saveSelectedRole(): void {
    const permissions = this.clonePermissions(this.editablePermissions[this.selectedRole]);
    this.saving = true;
    this.permissionService.update(this.selectedRole, { permissions }).subscribe({
      next: (res) => {
        const updated = this.clonePermissions(res.data?.permissions ?? permissions);
        this.originalPermissions[this.selectedRole] = updated;
        this.editablePermissions[this.selectedRole] = this.clonePermissions(updated);
        if (this.auth.getRole() === this.selectedRole) {
          this.permissionService.setPermissions(updated);
        }
        this.saving = false;
        this.snack.success(this.i18n.instant('PERMISSIONS.SAVE_SUCCESS'));
      },
      error: () => {
        this.saving = false;
        this.snack.error(this.i18n.instant('PERMISSIONS.SAVE_ERROR'));
      }
    });
  }

  private clonePermissions(permissions: PermissionMap): PermissionMap {
    return JSON.parse(JSON.stringify(permissions ?? {})) as PermissionMap;
  }
}
