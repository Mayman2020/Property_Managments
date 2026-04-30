import { Component, Inject, OnInit } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
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
import { TablePagerComponent } from '../../shared/components/table-pager/table-pager.component';
import { ExportColumn, TableExportToolbarComponent } from '../../shared/components/table-export-toolbar/table-export-toolbar.component';

interface PermissionRoleConfig {
  key: UserRole;
  icon: string;
}

interface PermissionModuleConfig {
  key: string;
  icon: string;
}

type PermissionActionKey = Exclude<keyof PermissionMap[string], 'enabled'>;

interface PermissionActionConfig {
  key: PermissionActionKey;
}

interface PermissionRoleDialogData {
  role: PermissionRoleConfig;
  modules: PermissionModuleConfig[];
  actions: PermissionActionConfig[];
  permissions: PermissionMap;
  saving: boolean;
  roleLabel: (role: UserRole) => string;
  moduleTitle: (moduleKey: string) => string;
  moduleDesc: (moduleKey: string) => string;
  actionLabel: (actionKey: string) => string;
  modulePermissions: (permissions: PermissionMap, moduleKey: string) => PermissionMap[string];
}

@Component({
  selector: 'app-permission-role-dialog',
  standalone: true,
  imports: [
    NgClass,
    NgFor,
    NgIf,
    TranslateModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatSlideToggleModule
  ],
  template: `
    <h2 mat-dialog-title>
      <span class="material-icons">{{ data.role.icon }}</span>
      {{ data.roleLabel(data.role.key) }}
    </h2>

    <mat-dialog-content class="permission-dialog-body">
      <div class="dialog-summary">
        <div>
          <span>{{ isAr ? 'الموديولات المفعلة' : 'Enabled Modules' }}</span>
          <strong>{{ enabledModulesCount }} / {{ data.modules.length }}</strong>
        </div>
        <div>
          <span>{{ isAr ? 'إجمالي الصلاحيات' : 'Enabled Actions' }}</span>
          <strong>{{ enabledActionsCount }}</strong>
        </div>
      </div>

      <section class="permission-module-box" *ngFor="let module of data.modules">
        <div class="permission-module-head">
          <div class="module-title">
            <span class="material-icons">{{ module.icon }}</span>
            <div>
              <h3>{{ data.moduleTitle(module.key) | translate }}</h3>
              <p>{{ data.moduleDesc(module.key) | translate }}</p>
            </div>
          </div>
          <mat-slide-toggle
            color="primary"
            [checked]="modulePermissions(module.key).enabled"
            (change)="setPermission(module.key, 'enabled', $event.checked)">
            {{ 'PERMISSIONS.ENABLED' | translate }}
          </mat-slide-toggle>
        </div>

        <div class="action-grid">
          <label
            class="action-toggle"
            *ngFor="let action of data.actions"
            [ngClass]="{ muted: !modulePermissions(module.key).enabled }">
            <span>{{ data.actionLabel(action.key) | translate }}</span>
            <mat-slide-toggle
              color="accent"
              [checked]="modulePermissions(module.key)[action.key]"
              [disabled]="!modulePermissions(module.key).enabled"
              (change)="setPermission(module.key, action.key, $event.checked)">
            </mat-slide-toggle>
          </label>
        </div>
      </section>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">{{ 'ACTIONS.CANCEL' | translate }}</button>
      <button mat-flat-button type="button" (click)="ref.close(data.permissions)">
        <span class="material-icons">done</span>
        {{ isAr ? 'تطبيق' : 'Apply' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 0;
    }

    h2 .material-icons {
      color: var(--primary);
    }

    .permission-dialog-body {
      min-width: min(820px, 94vw);
      max-height: 70vh;
      display: grid;
      gap: 14px;
      padding-top: 12px;
    }

    .dialog-summary {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .dialog-summary div {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px;
      background: var(--surface-2);
      display: grid;
      gap: 4px;
    }

    .dialog-summary span {
      color: var(--text-muted);
      font-size: 0.82rem;
    }

    .permission-module-box {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px;
      background: var(--card-bg, #fff);
      display: grid;
      gap: 12px;
    }

    .permission-module-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    .module-title {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .module-title .material-icons {
      width: 38px;
      height: 38px;
      display: grid;
      place-items: center;
      border-radius: 8px;
      background: rgba(19, 78, 74, 0.08);
      color: var(--brand-deep);
    }

    .module-title h3 {
      margin: 0;
      font-size: 1rem;
    }

    .module-title p {
      margin: 3px 0 0;
      color: var(--text-muted);
      font-size: 0.84rem;
    }

    .action-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 8px;
    }

    .action-toggle {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface-2);
      padding: 8px 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-weight: 600;
    }

    .action-toggle.muted {
      opacity: 0.58;
    }

    @media (max-width: 640px) {
      .dialog-summary {
        grid-template-columns: 1fr;
      }

      .permission-module-head {
        flex-direction: column;
      }
    }
  `]
})
export class PermissionRoleDialogComponent {
  constructor(
    readonly ref: MatDialogRef<PermissionRoleDialogComponent, PermissionMap>,
    @Inject(MAT_DIALOG_DATA) readonly data: PermissionRoleDialogData,
    private readonly i18n: I18nService
  ) {}

  get isAr(): boolean {
    return this.i18n.currentLang === 'ar';
  }

  get enabledModulesCount(): number {
    return this.data.modules.filter((module) => this.modulePermissions(module.key).enabled).length;
  }

  get enabledActionsCount(): number {
    return this.data.modules.reduce((sum, module) => {
      const permissions = this.modulePermissions(module.key);
      return sum + this.data.actions.filter((action) => permissions[action.key]).length;
    }, 0);
  }

  modulePermissions(moduleKey: string): PermissionMap[string] {
    return this.data.modulePermissions(this.data.permissions, moduleKey);
  }

  setPermission(moduleKey: string, action: PermissionActionKey | 'enabled', checked: boolean): void {
    const modulePermissions = this.modulePermissions(moduleKey);
    modulePermissions[action] = checked;
    if (action !== 'enabled' && checked) {
      modulePermissions.enabled = true;
    }
    if (action === 'enabled' && !checked) {
      this.data.actions.forEach((item) => { modulePermissions[item.key] = false; });
    }
  }
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
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
    TablePagerComponent,
    TableExportToolbarComponent
  ],
  template: `
    <div class="app-page permissions-page">
      <app-page-header
        [title]="'PERMISSIONS.TITLE' | translate"
        [subtitle]="'PERMISSIONS.SUBTITLE' | translate"
        [breadcrumbs]="[{label:('NAV.DASHBOARD' | translate), route:'/admin/dashboard'}, {label:('NAV.PERMISSIONS' | translate)}]">
      </app-page-header>

      <div class="loading-center" *ngIf="loading">
        <mat-spinner diameter="44"></mat-spinner>
      </div>

      <section class="app-card" *ngIf="!loading">
        <app-table-export-toolbar
          permissionKey="permissions"
          [title]="'PERMISSIONS.TITLE' | translate"
          fileName="permissions"
          [columns]="exportColumns"
          [rows]="roles">
        </app-table-export-toolbar>
        <div class="app-table-wrap">
          <table class="app-data-table permission-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{{ isAr ? 'الرول' : 'Role' }}</th>
                <th>{{ isAr ? 'الموديولات المفعلة' : 'Enabled Modules' }}</th>
                <th>{{ isAr ? 'إجمالي الصلاحيات' : 'Enabled Actions' }}</th>
                <th>{{ 'COMMON.ACTIONS' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let role of pagedRoles; let i = index" class="permission-row" (click)="openRole(role)">
                <td>{{ rolePageIndex * rolePageSize + i + 1 }}</td>
                <td>
                  <div class="role-title-cell">
                    <span class="material-icons">{{ role.icon }}</span>
                    <div>
                      <strong>{{ roleLabel(role.key) }}</strong>
                      <small>{{ role.key }}</small>
                    </div>
                  </div>
                </td>
                <td><span class="count-pill visible">{{ enabledModulesCount(role.key) }} / {{ modules.length }}</span></td>
                <td><span class="count-pill">{{ enabledActionsCount(role.key) }}</span></td>
                <td>
                  <button mat-stroked-button type="button" (click)="openRole(role); $event.stopPropagation()">
                    <mat-icon>tune</mat-icon>
                    {{ isAr ? 'التفاصيل' : 'Details' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <app-table-pager
          [length]="roles.length"
          [pageIndex]="rolePageIndex"
          [pageSize]="rolePageSize"
          (pageIndexChange)="rolePageIndex = $event">
        </app-table-pager>
      </section>
    </div>
  `,
  styles: [`
    .permissions-page {
      display: grid;
      gap: 1.25rem;
    }

    .loading-center {
      display: flex;
      justify-content: center;
      padding: 2rem 0;
    }

    .permission-row {
      cursor: pointer;
    }

    .role-title-cell {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 230px;
    }

    .role-title-cell .material-icons {
      width: 38px;
      height: 38px;
      display: grid;
      place-items: center;
      border-radius: 8px;
      background: rgba(19, 78, 74, 0.08);
      color: var(--brand-deep);
    }

    .role-title-cell div {
      display: grid;
      gap: 2px;
    }

    .role-title-cell small {
      color: var(--text-muted);
      font-size: 0.78rem;
    }

    .count-pill {
      display: inline-flex;
      min-width: 42px;
      min-height: 28px;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      padding: 0 10px;
      background: rgba(15, 23, 42, 0.08);
      font-weight: 800;
      font-size: 0.84rem;
    }

    .count-pill.visible {
      background: rgba(22, 163, 74, 0.12);
      color: #15803d;
    }
  `]
})
export class PermissionManagementComponent implements OnInit {
  readonly roles: PermissionRoleConfig[] = [
    { key: 'SUPER_ADMIN', icon: 'admin_panel_settings' },
    { key: 'PROPERTY_ADMIN', icon: 'business_center' },
    { key: 'CONTRACTS_OFFICER', icon: 'description' },
    { key: 'ACCOUNTANT', icon: 'payments' },
    { key: 'HR_OFFICER', icon: 'badge' },
    { key: 'OWNER', icon: 'apartment' },
    { key: 'MAINTENANCE_OFFICER', icon: 'engineering' },
    { key: 'TENANT', icon: 'home' }
  ];

  readonly modules: PermissionModuleConfig[] = [
    { key: 'dashboard', icon: 'dashboard' },
    { key: 'properties', icon: 'apartment' },
    { key: 'units', icon: 'meeting_room' },
    { key: 'tenants', icon: 'groups' },
    { key: 'maintenance', icon: 'plumbing' },
    { key: 'inventory', icon: 'inventory_2' },
    { key: 'reports', icon: 'bar_chart' },
    { key: 'users', icon: 'manage_accounts' },
    { key: 'lookups', icon: 'public' },
    { key: 'contractors', icon: 'engineering' },
    { key: 'vendors', icon: 'engineering' },
    { key: 'vacancies', icon: 'door_open' },
    { key: 'ratings', icon: 'star_rate' },
    { key: 'finance', icon: 'bar_chart' },
    { key: 'hr', icon: 'badge' },
    { key: 'notifications', icon: 'notifications' },
    { key: 'audit', icon: 'history' },
    { key: 'owner_portal', icon: 'apartment' },
    { key: 'schedule', icon: 'calendar_month' },
    { key: 'profile', icon: 'person' },
    { key: 'my_unit', icon: 'home_work' },
    { key: 'new_request', icon: 'add_circle' },
    { key: 'my_requests', icon: 'assignment' },
    { key: 'permissions', icon: 'verified_user' }
  ];

  readonly actions: PermissionActionConfig[] = [
    { key: 'menu' },
    { key: 'view' },
    { key: 'create' },
    { key: 'edit' },
    { key: 'delete' },
    { key: 'assign' },
    { key: 'schedule' },
    { key: 'start' },
    { key: 'submit' },
    { key: 'approve' },
    { key: 'reject' },
    { key: 'export' },
    { key: 'rate' },
    { key: 'manage' },
    { key: 'toggle' }
  ];

  readonly rolePageSize = 6;
  rolePageIndex = 0;
  loading = true;
  private rolePermissions: Record<UserRole, PermissionMap> = {
    SUPER_ADMIN: {},
    PROPERTY_ADMIN: {},
    CONTRACTS_OFFICER: {},
    ACCOUNTANT: {},
    HR_OFFICER: {},
    OWNER: {},
    MAINTENANCE_OFFICER: {},
    TENANT: {}
  };

  constructor(
    private readonly permissionService: PermissionService,
    private readonly auth: AuthService,
    private readonly snack: SnackService,
    private readonly i18n: I18nService,
    private readonly dialog: MatDialog
  ) {}

  get isAr(): boolean {
    return this.i18n.currentLang === 'ar';
  }

  get pagedRoles(): PermissionRoleConfig[] {
    const start = this.rolePageIndex * this.rolePageSize;
    return this.roles.slice(start, start + this.rolePageSize);
  }

  get exportColumns(): ExportColumn<PermissionRoleConfig>[] {
    return [
      { header: this.isAr ? 'الرول' : 'Role', value: (row) => this.roleLabel(row.key) },
      { header: this.isAr ? 'الكود' : 'Code', value: 'key' },
      { header: this.isAr ? 'الموديولات المفعلة' : 'Enabled Modules', value: (row) => `${this.enabledModulesCount(row.key)} / ${this.modules.length}` },
      { header: this.isAr ? 'إجمالي الصلاحيات' : 'Enabled Actions', value: (row) => this.enabledActionsCount(row.key) }
    ];
  }

  ngOnInit(): void {
    this.permissionService.getAll().subscribe({
      next: (res) => {
        for (const item of res.data ?? []) {
          this.rolePermissions[item.role] = this.clonePermissions(item.permissions);
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.error(this.i18n.instant('PERMISSIONS.LOAD_ERROR'));
      }
    });
  }

  openRole(role: PermissionRoleConfig): void {
    const draft = this.clonePermissions(this.rolePermissions[role.key]);
    this.dialog.open(PermissionRoleDialogComponent, {
      width: '920px',
      panelClass: 'app-dialog-panel',
      data: {
        role,
        modules: this.modules,
        actions: this.actions,
        permissions: draft,
        saving: false,
        roleLabel: this.roleLabel.bind(this),
        moduleTitle: this.moduleTitle.bind(this),
        moduleDesc: this.moduleDesc.bind(this),
        actionLabel: this.actionLabel.bind(this),
        modulePermissions: this.modulePermissions.bind(this)
      } satisfies PermissionRoleDialogData
    }).afterClosed().subscribe((permissions?: PermissionMap) => {
      if (!permissions) return;
      this.saveRole(role.key, permissions);
    });
  }

  roleLabel(role: UserRole): string {
    return this.i18n.instant(`ROLE.${role}`);
  }

  moduleTitle(moduleKey: string): string {
    return `PERMISSIONS.MODULE.${moduleKey}.TITLE`;
  }

  moduleDesc(moduleKey: string): string {
    return `PERMISSIONS.MODULE.${moduleKey}.DESC`;
  }

  actionLabel(actionKey: string): string {
    return `PERMISSIONS.ACTION.${actionKey}`;
  }

  enabledModulesCount(role: UserRole): number {
    return this.modules.filter((module) => this.modulePermissions(this.rolePermissions[role], module.key).enabled).length;
  }

  enabledActionsCount(role: UserRole): number {
    return this.modules.reduce((sum, module) => {
      const permissions = this.modulePermissions(this.rolePermissions[role], module.key);
      return sum + this.actions.filter((action) => permissions[action.key]).length;
    }, 0);
  }

  modulePermissions(permissions: PermissionMap, moduleKey: string): PermissionMap[string] {
    permissions[moduleKey] ??= this.emptyModulePermissions();
    return permissions[moduleKey];
  }

  private saveRole(role: UserRole, permissions: PermissionMap): void {
    this.permissionService.update(role, { permissions }).subscribe({
      next: (res) => {
        const updated = this.clonePermissions(res.data?.permissions ?? permissions);
        this.rolePermissions[role] = updated;
        if (this.auth.getRole() === role) {
          this.permissionService.setPermissions(updated);
        }
        this.snack.success(this.i18n.instant('PERMISSIONS.SAVE_SUCCESS'));
      },
      error: () => {
        this.snack.error(this.i18n.instant('PERMISSIONS.SAVE_ERROR'));
      }
    });
  }

  private clonePermissions(permissions: PermissionMap): PermissionMap {
    return JSON.parse(JSON.stringify(permissions ?? {})) as PermissionMap;
  }

  private emptyModulePermissions(): PermissionMap[string] {
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
