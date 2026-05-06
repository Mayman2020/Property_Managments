import { Component, Inject, OnInit } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';

import { PermissionMap, User, UserRole } from '../../core/models/user.model';
import { I18nService } from '../../core/i18n/i18n.service';
import { AuthService } from '../../core/services/auth.service';
import { PermissionService, RolePermissionDto, ScreenSettingDto } from '../../core/services/permission.service';
import { SnackService } from '../../core/services/snack.service';
import { UserService } from '../../core/services/user.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { TablePagerComponent } from '../../shared/components/table-pager/table-pager.component';
import { ExportColumn, TableExportToolbarComponent } from '../../shared/components/table-export-toolbar/table-export-toolbar.component';

interface ScreenConfig {
  key: string;
  icon: string;
}

interface ScreenDetailsDialogData {
  screen: ScreenConfig;
  roleOptions: UserRole[];
  rolePermissions: Record<UserRole, PermissionMap>;
  screenSettings: Record<string, boolean>;
  savingRoles: Record<UserRole, Set<string>>;
  roleLabel: (role: UserRole) => string;
  screenTitle: (screenKey: string) => string;
  isRoleEnabled: (role: UserRole, screenKey: string) => boolean;
  toggleRole: (screenKey: string, role: UserRole, enabled: boolean) => void;
  visibleUsersCount: number;
  hiddenUsersCount: number;
}

@Component({
  selector: 'app-screen-details-dialog',
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
      <span class="material-icons">{{ data.screen.icon }}</span>
      {{ data.screenTitle(data.screen.key) | translate }}
    </h2>

    <mat-dialog-content class="screen-dialog-body">
      <div class="dialog-summary">
        <div>
          <span>{{ 'SCREENS.GLOBAL' | translate }}</span>
          <strong [class.off]="data.screenSettings[data.screen.key] === false">
            {{ data.screenSettings[data.screen.key] === false ? ('COMMON.INACTIVE' | translate) : ('COMMON.ACTIVE' | translate) }}
          </strong>
        </div>
        <div>
          <span>{{ isAr ? 'المستخدمين الذين يرونها' : 'Users who can see' }}</span>
          <strong>{{ data.visibleUsersCount }}</strong>
        </div>
        <div>
          <span>{{ isAr ? 'المستخدمين الذين لا يرونها' : 'Users who cannot see' }}</span>
          <strong>{{ data.hiddenUsersCount }}</strong>
        </div>
      </div>

      <section class="role-section">
        <h3>{{ isAr ? 'تظهر لمين' : 'Visible Roles' }}</h3>
        <div class="role-list" *ngIf="visibleRoles.length; else noVisibleTpl">
          <div class="role-row visible" *ngFor="let role of visibleRoles">
            <span>{{ data.roleLabel(role) }}</span>
            <mat-slide-toggle
              color="accent"
              [checked]="true"
              [disabled]="globallyDisabled || data.savingRoles[role].has(data.screen.key)"
              (change)="data.toggleRole(data.screen.key, role, $event.checked)">
            </mat-slide-toggle>
          </div>
        </div>
      </section>

      <section class="role-section">
        <h3>{{ isAr ? 'مش تظهر لمين' : 'Hidden Roles' }}</h3>
        <div class="role-list" *ngIf="hiddenRoles.length; else noHiddenTpl">
          <div class="role-row hidden" *ngFor="let role of hiddenRoles">
            <span>{{ data.roleLabel(role) }}</span>
            <mat-slide-toggle
              color="accent"
              [checked]="false"
              [disabled]="globallyDisabled || data.savingRoles[role].has(data.screen.key)"
              (change)="data.toggleRole(data.screen.key, role, $event.checked)">
            </mat-slide-toggle>
          </div>
        </div>
      </section>

      <ng-template #noVisibleTpl>
        <p class="empty-line">{{ isAr ? 'لا توجد أدوار مفعلة لهذه الشاشة.' : 'No roles can see this screen.' }}</p>
      </ng-template>

      <ng-template #noHiddenTpl>
        <p class="empty-line">{{ isAr ? 'كل الأدوار المختارة يمكنها رؤية هذه الشاشة.' : 'All listed roles can see this screen.' }}</p>
      </ng-template>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-flat-button type="button" (click)="ref.close()">{{ 'ACTIONS.CLOSE' | translate }}</button>
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

    .screen-dialog-body {
      min-width: min(620px, 92vw);
      display: grid;
      gap: 16px;
      padding-top: 12px;
    }

    .dialog-summary {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
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

    .dialog-summary strong.off {
      color: var(--danger);
    }

    .role-section {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px;
      background: var(--card-bg, #fff);
    }

    .role-section h3 {
      margin: 0 0 10px;
      font-size: 1rem;
    }

    .role-list {
      display: grid;
      gap: 8px;
    }

    .role-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border-radius: 8px;
      padding: 10px 12px;
      border: 1px solid var(--line);
    }

    .role-row.visible {
      background: rgba(22, 163, 74, 0.08);
    }

    .role-row.hidden {
      background: rgba(239, 68, 68, 0.06);
    }

    .empty-line {
      margin: 0;
      color: var(--text-muted);
    }

    @media (max-width: 640px) {
      .dialog-summary {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ScreenDetailsDialogComponent {
  constructor(
    readonly ref: MatDialogRef<ScreenDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) readonly data: ScreenDetailsDialogData,
    private readonly i18n: I18nService
  ) {}

  get isAr(): boolean {
    return this.i18n.currentLang === 'ar';
  }

  get globallyDisabled(): boolean {
    return this.data.screenSettings[this.data.screen.key] === false;
  }

  get visibleRoles(): UserRole[] {
    return this.data.roleOptions.filter((role) => this.data.isRoleEnabled(role, this.data.screen.key));
  }

  get hiddenRoles(): UserRole[] {
    return this.data.roleOptions.filter((role) => !this.data.isRoleEnabled(role, this.data.screen.key));
  }
}

@Component({
  selector: 'app-screen-management',
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
    MatSlideToggleModule,
    MatTooltipModule,
    PageHeaderComponent,
    TablePagerComponent,
    TableExportToolbarComponent
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

      <section class="app-card" *ngIf="!loading">
        <app-table-export-toolbar
          permissionKey="permissions"
          [title]="'SCREENS.TITLE' | translate"
          fileName="screens"
          [columns]="exportColumns"
          [rows]="screens">
        </app-table-export-toolbar>
        <div class="app-table-wrap">
          <table class="app-data-table screen-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{{ isAr ? 'الشاشة' : 'Screen' }}</th>
                <th>{{ 'SCREENS.GLOBAL' | translate }}</th>
                <th>{{ isAr ? 'المستخدمين الذين يرونها' : 'Users who can see' }}</th>
                <th>{{ isAr ? 'المستخدمين الذين لا يرونها' : 'Users who cannot see' }}</th>
                <th>{{ isAr ? 'التفاصيل' : 'Details' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let screen of pagedScreens; let i = index" (click)="openDetails(screen)" class="screen-row">
                <td>{{ screenPageIndex * screenPageSize + i + 1 }}</td>
                <td>
                  <div class="screen-title-cell">
                    <span class="material-icons">{{ screen.icon }}</span>
                    <div>
                      <strong>{{ screenTitle(screen.key) | translate }}</strong>
                      <small>{{ screen.key }}</small>
                    </div>
                  </div>
                </td>
                <td (click)="$event.stopPropagation()">
                  <mat-slide-toggle
                    color="primary"
                    [checked]="screenSettings[screen.key] !== false"
                    [disabled]="savingGlobal.has(screen.key)"
                    (change)="toggleGlobal(screen.key, $event.checked)">
                  </mat-slide-toggle>
                </td>
                <td>
                  <span class="count-pill visible">{{ visibleCount(screen.key) }}</span>
                </td>
                <td>
                  <span class="count-pill hidden">{{ hiddenCount(screen.key) }}</span>
                </td>
                <td>
                  <button
                    type="button"
                    class="app-icon-btn details-eye"
                    [matTooltip]="'ACTIONS.DETAILS' | translate"
                    (click)="openDetails(screen); $event.stopPropagation()">
                    <mat-icon>visibility</mat-icon>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <app-table-pager
          [length]="screens.length"
          [pageIndex]="screenPageIndex"
          [pageSize]="screenPageSize"
          (pageIndexChange)="screenPageIndex = $event">
        </app-table-pager>
      </section>
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

    .screen-row {
      cursor: pointer;
    }

    .screen-title-cell {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 220px;
    }

    .screen-title-cell .material-icons {
      width: 38px;
      height: 38px;
      display: grid;
      place-items: center;
      border-radius: 8px;
      background: rgba(19, 78, 74, 0.08);
      color: var(--brand-deep);
      font-size: 21px;
    }

    .screen-title-cell div {
      display: grid;
      gap: 2px;
    }

    .screen-title-cell small {
      color: var(--text-muted);
      font-size: 0.78rem;
    }

    .count-pill {
      display: inline-flex;
      min-width: 34px;
      height: 28px;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      font-weight: 800;
      font-size: 0.84rem;
    }

    .count-pill.visible {
      background: rgba(22, 163, 74, 0.12);
      color: #15803d;
    }

    .count-pill.hidden {
      background: rgba(239, 68, 68, 0.1);
      color: #b91c1c;
    }

    .details-eye {
      background: rgba(37, 99, 235, 0.1);
      color: #1d4ed8;
      border: 1px solid rgba(37, 99, 235, 0.18);
    }

    .details-eye:hover {
      background: rgba(37, 99, 235, 0.16);
    }

    @media (max-width: 720px) {
      .screen-title-cell {
        min-width: 180px;
      }
    }
  `]
})
export class ScreenManagementComponent implements OnInit {
  loading = true;
  readonly screenPageSize = 6;
  screenPageIndex = 0;
  private users: User[] = [];

  readonly roleOptions: UserRole[] = [
    'SUPER_ADMIN',
    'GENERAL_MANAGER',
    'ACCOUNTANT',
    'MAINTENANCE_CONTRACTOR',
    'MAINTENANCE_OFFICER',
    'PROPERTY_GUARD',
    'PROCEDURES_CLERK',
    'OWNER',
    'TENANT'
  ];
  readonly screens: ScreenConfig[] = [
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

  rolePermissions: Record<UserRole, PermissionMap> = {
    SUPER_ADMIN: {},
    GENERAL_MANAGER: {},
    ACCOUNTANT: {},
    MAINTENANCE_CONTRACTOR: {},
    MAINTENANCE_OFFICER: {},
    PROPERTY_GUARD: {},
    PROCEDURES_CLERK: {},
    OWNER: {},
    TENANT: {}
  };
  screenSettings: Record<string, boolean> = {};
  savingGlobal = new Set<string>();
  savingRoles: Record<UserRole, Set<string>> = {
    SUPER_ADMIN: new Set<string>(),
    GENERAL_MANAGER: new Set<string>(),
    ACCOUNTANT: new Set<string>(),
    MAINTENANCE_CONTRACTOR: new Set<string>(),
    MAINTENANCE_OFFICER: new Set<string>(),
    PROPERTY_GUARD: new Set<string>(),
    PROCEDURES_CLERK: new Set<string>(),
    OWNER: new Set<string>(),
    TENANT: new Set<string>()
  };

  constructor(
    private readonly permissionService: PermissionService,
    private readonly snack: SnackService,
    private readonly i18n: I18nService,
    private readonly dialog: MatDialog,
    private readonly userService: UserService,
    private readonly authService: AuthService
  ) {}

  get isAr(): boolean {
    return this.i18n.currentLang === 'ar';
  }

  get pagedScreens(): ScreenConfig[] {
    const start = this.screenPageIndex * this.screenPageSize;
    return this.screens.slice(start, start + this.screenPageSize);
  }

  get exportColumns(): ExportColumn<ScreenConfig>[] {
    return [
      { header: this.isAr ? 'الشاشة' : 'Screen', value: (row) => this.i18n.instant(this.screenTitle(row.key)) },
      { header: this.isAr ? 'الكود' : 'Code', value: 'key' },
      { header: this.i18n.instant('SCREENS.GLOBAL'), value: (row) => this.screenSettings[row.key] === false ? this.i18n.instant('COMMON.INACTIVE') : this.i18n.instant('COMMON.ACTIVE') },
      { header: this.isAr ? 'المستخدمين الذين يرونها' : 'Users who can see', value: (row) => this.visibleCount(row.key) },
      { header: this.isAr ? 'المستخدمين الذين لا يرونها' : 'Users who cannot see', value: (row) => this.hiddenCount(row.key) }
    ];
  }

  ngOnInit(): void {
    forkJoin({
      permissions: this.permissionService.getAll(),
      screens: this.permissionService.getScreenSettings(),
      users: this.userService.getAll(0, 1000)
    }).subscribe({
      next: ({ permissions, screens, users }) => {
        this.applyRoles(permissions.data ?? []);
        this.applyScreens(screens.data ?? []);
        this.users = users.data?.content ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.error(this.i18n.instant('SCREENS.LOAD_ERROR'));
      }
    });
  }

  openDetails(screen: ScreenConfig): void {
    this.dialog.open(ScreenDetailsDialogComponent, {
      width: '720px',
      panelClass: 'app-dialog-panel',
      disableClose: true,
      data: {
        screen,
        roleOptions: this.roleOptions,
        rolePermissions: this.rolePermissions,
        screenSettings: this.screenSettings,
        savingRoles: this.savingRoles,
        roleLabel: this.roleLabel.bind(this),
        screenTitle: this.screenTitle.bind(this),
        isRoleEnabled: this.isRoleEnabled.bind(this),
        toggleRole: this.toggleRole.bind(this),
        visibleUsersCount: this.visibleCount(screen.key),
        hiddenUsersCount: this.hiddenCount(screen.key)
      } satisfies ScreenDetailsDialogData
    });
  }

  visibleCount(screenKey: string): number {
    return this.users.filter((user) => this.userCanSeeScreen(user, screenKey)).length;
  }

  hiddenCount(screenKey: string): number {
    return this.users.length - this.visibleCount(screenKey);
  }

  private userCanSeeScreen(user: User, screenKey: string): boolean {
    const rolePermissions = this.rolePermissions[user.role];
    if (!rolePermissions) return false;
    return rolePermissions[screenKey]?.enabled === true;
  }

  roleLabel(role: UserRole): string {
    return this.i18n.instant(`ROLE.${role}`);
  }

  screenTitle(screenKey: string): string {
    return `PERMISSIONS.MODULE.${screenKey}.TITLE`;
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
