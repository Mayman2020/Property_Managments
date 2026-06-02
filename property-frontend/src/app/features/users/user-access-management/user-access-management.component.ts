import { DialogTitleCloseDirective } from './../../../shared/directives/dialog-title-close.directive';
﻿import { Component, Inject, OnInit } from '@angular/core';
import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';

import { isUserRoleCode, PermissionMap, User, UserRole } from '../../../core/models/user.model';
import { I18nService } from '../../../core/i18n/i18n.service';
import { PermissionService } from '../../../core/services/permission.service';
import { SnackService } from '../../../core/services/snack.service';
import { UserService } from '../../../core/services/user.service';
import { LookupItem, LookupService } from '../../../core/services/lookup.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';

interface PermissionModuleConfig {
  key: string;
  icon: string;
}

type PermissionActionKey = Exclude<keyof PermissionMap[string], 'enabled'>;

interface PermissionActionConfig {
  key: PermissionActionKey;
}

interface UserAccessDetailsData {
  user: User;
  permissions: PermissionMap;
  modules: PermissionModuleConfig[];
  actions: PermissionActionConfig[];
  roleLabel: (role: UserRole) => string;
  /** Display line for one or more assigned roles. */
  roleTitles: string;
  moduleTitle: (key: string) => string;
  moduleDesc: (key: string) => string;
  actionLabel: (key: string) => string;
}

@Component({
  selector: 'app-user-access-details-dialog',
  standalone: true,
  imports: [NgClass, NgFor, NgIf, TranslateModule, MatButtonModule, MatDialogModule, MatIconModule, DialogTitleCloseDirective],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon class="dialog-title-icon">security</mat-icon>
      <div class="user-title-cell">
        <div class="user-avatar">{{ userInitials }}</div>
        <div class="user-info">
          <strong>{{ data.user.fullName }}</strong>
          <small>{{ data.roleTitles }}</small>
        </div>
      </div>
    </h2>

    <mat-dialog-content>
      <div class="dialog-summary">
        <div class="summary-item">
          <span>{{ ('INLINE_TEXT.ENABLED_MODULES' | translate) }}</span>
          <strong>{{ enabledModulesCount }} / {{ data.modules.length }}</strong>
        </div>
        <div class="summary-item">
          <span>{{ ('INLINE_TEXT.ENABLED_ACTIONS' | translate) }}</span>
          <strong>{{ enabledActionsCount }}</strong>
        </div>
      </div>

      <div class="permission-modules-list">
        <section class="permission-module-box" *ngFor="let module of data.modules">
          <div class="permission-module-head">
            <div class="module-title">
              <span class="material-icons module-icon">{{ module.icon }}</span>
              <div>
                <h3>{{ data.moduleTitle(module.key) | translate }}</h3>
                <p>{{ data.moduleDesc(module.key) | translate }}</p>
              </div>
            </div>
            <span class="status-chip" [ngClass]="modulePermissions(module.key).enabled ? 'chip-success' : 'chip-danger'">
              {{ (modulePermissions(module.key).enabled ? 'PERMISSIONS.ENABLED' : 'COMMON.INACTIVE') | translate }}
            </span>
          </div>

          <div class="action-grid" *ngIf="modulePermissions(module.key).enabled">
            <div class="action-pill" *ngFor="let action of data.actions" [ngClass]="{ active: modulePermissions(module.key)[action.key] }">
              <mat-icon *ngIf="modulePermissions(module.key)[action.key]">check_circle</mat-icon>
              <mat-icon *ngIf="!modulePermissions(module.key)[action.key]">cancel</mat-icon>
              <span>{{ data.actionLabel(action.key) | translate }}</span>
            </div>
          </div>
        </section>
      </div>
    </mat-dialog-content>

    <div mat-dialog-actions align="end" class="dialog-actions-row">
      <button mat-flat-button class="navy-btn" type="button" (click)="ref.close()">{{ 'ACTIONS.CLOSE' | translate }}</button>
    </div>
  `,
  styles: [`
    .user-title-cell { display: flex; align-items: center; gap: 12px; }
    .user-avatar { width: 42px; height: 42px; border-radius: 50%; background: var(--navy-100); color: var(--navy-800); display: grid; place-items: center; font-weight: 700; font-size: 0.95rem; border: 1px solid var(--navy-200); }
    .user-info { display: flex; flex-direction: column; gap: 1px; }
    .user-info strong { font-size: 1rem; color: var(--brass-100); }
    .user-info small { display: block; font-size: 0.75rem; color: var(--brass-300); opacity: 0.8; font-weight: 400; }
    
    .dialog-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .summary-item { padding: 14px; background: var(--surface-2); border-radius: 12px; border: 1px solid var(--line); text-align: center; }
    .summary-item span { display: block; color: var(--text-muted); font-size: 0.8rem; margin-bottom: 4px; }
    .summary-item strong { font-size: 1.25rem; color: var(--text-main); }

    .permission-modules-list { display: grid; gap: 12px; }
    .permission-module-box { border: 1px solid var(--line); border-radius: 12px; padding: 16px; background: var(--surface); box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
    .permission-module-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
    .module-title { display: flex; align-items: flex-start; gap: 12px; }
    .module-icon { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 10px; background: var(--navy-50); color: var(--navy-700); font-size: 22px; }
    .module-title h3 { margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text-main); }
    .module-title p { margin: 2px 0 0; color: var(--text-muted); font-size: 0.82rem; }
    
    .action-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; padding-top: 12px; border-top: 1px dashed var(--line); }
    .action-pill { border: 1px solid var(--line); border-radius: 8px; background: var(--surface-2); padding: 6px 12px; display: flex; align-items: center; gap: 8px; font-size: 0.8rem; font-weight: 500; color: var(--text-muted); }
    .action-pill mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .action-pill.active { background: rgba(16, 185, 129, 0.08); border-color: rgba(16, 185, 129, 0.2); color: #065f46; }
    
    .dialog-actions-row { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--line); display: flex; justify-content: flex-end; }
    .navy-btn { background: var(--navy-800) !important; color: white !important; border-radius: 8px; }

    @media (max-width: 600px) { .dialog-summary { grid-template-columns: 1fr; } .permission-module-head { flex-direction: column; } }
  `]
})
export class UserAccessDetailsDialogComponent {
  constructor(
    readonly ref: MatDialogRef<UserAccessDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) readonly data: UserAccessDetailsData,
    private readonly i18n: I18nService
  ) {}

  get isAr(): boolean {
    return this.i18n.currentLang === 'ar';
  }

  get userInitials(): string {
    const words = (this.data.user.fullName ?? this.data.user.username ?? '').trim().split(/\\s+/).filter(Boolean);
    if (!words.length) return 'U';
    return words.slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? '').join('');
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
    this.data.permissions[moduleKey] ??= {
      enabled: false, menu: false, view: false, create: false, edit: false,
      delete: false, assign: false, schedule: false, start: false, submit: false,
      approve: false, reject: false, export: false, rate: false, manage: false, toggle: false
    };
    return this.data.permissions[moduleKey];
  }
}

@Component({
  selector: 'app-user-access-management',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    NgClass,
    FormsModule,
    DatePipe,
    TranslateModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
    PageHeaderComponent,
    TablePagerComponent
  ],
  template: `
    <div class="app-page user-access-page">
      <app-page-header
        [title]="'USER_ACCESS.TITLE' | translate"
        [subtitle]="'USER_ACCESS.SUBTITLE' | translate"
        [breadcrumbs]="[{label:('NAV.DASHBOARD' | translate), route:'/admin/dashboard'}, {label:('NAV.USER_ACCESS' | translate)}]">
      </app-page-header>

      <div class="loading-wrap" *ngIf="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <section class="app-card" *ngIf="!loading">
        <div class="search-bar-shell">
          <div class="search-input-box">
            <mat-icon>search</mat-icon>
            <input [ngModel]="searchTerm" (ngModelChange)="searchTerm = $event" [placeholder]="'USER_ACCESS.SEARCH_HINT' | translate" (keyup.enter)="loadUsers()">
          </div>
          <button mat-flat-button class="search-btn" type="button" (click)="loadUsers()">
            {{ 'ACTIONS.SEARCH' | translate }}
          </button>
        </div>

        <div class="app-table-wrap">
          <table class="app-data-table access-table">
            <thead>
              <tr>
                <th class="center-col">#</th>
                <th>{{ 'USER_MGMT.USERNAME' | translate }}</th>
                <th class="center-col">{{ 'MAINTENANCE.STATUS' | translate }}</th>
                <th class="center-col">{{ 'USER_ACCESS.CURRENT_ROLES' | translate }}</th>
                <th style="min-width: 260px;">{{ 'USER_ACCESS.ASSIGN_ROLES' | translate }}</th>
                <th class="actions-col"></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of pagedUsers; let i = index">
                <td class="center-col"><span class="row-index">{{ pageIndex * pageSize + i + 1 }}</span></td>
                <td>
                  <div class="user-cell">
                    <div class="user-avatar">{{ userInitials(user) }}</div>
                    <div class="user-info">
                      <div class="user-name">{{ user.fullName }}</div>
                      <div class="user-email">{{ user.email }}</div>
                    </div>
                  </div>
                </td>
                <td class="center-col">
                  <span class="status-chip" [ngClass]="user.isActive ? 'chip-success' : 'chip-danger'">
                    {{ (user.isActive ? 'COMMON.ACTIVE' : 'COMMON.INACTIVE') | translate }}
                  </span>
                </td>
                <td class="center-col current-roles-cell">
                  <span class="role-badge" *ngFor="let r of rolesFromUser(user)">{{ roleLabel(r) }}</span>
                </td>
                <td>
                  <mat-form-field appearance="outline" class="role-select" subscriptSizing="dynamic" *ngIf="permissions.can('users', 'edit')">
                    <mat-select multiple [(ngModel)]="draftMultiRoles[user.id]" [compareWith]="compareRoles">
                      <mat-option *ngFor="let row of roleRows" [value]="row.role">{{ roleLabel(row.role) }}</mat-option>
                    </mat-select>
                  </mat-form-field>
                </td>
                <td class="actions-col">
                  <div class="table-actions">
                    <button
                      class="app-icon-btn success"
                      [matTooltip]="'USER_ACCESS.SAVE_ROLE' | translate"
                      type="button"
                      *ngIf="permissions.can('users', 'edit')"
                      [disabled]="savingIds.has(user.id) || !isRoleDirty(user) || isDraftRolesEmpty(user)"
                      (click)="saveRoles(user)">
                      <mat-spinner *ngIf="savingIds.has(user.id)" diameter="18"></mat-spinner>
                      <mat-icon *ngIf="!savingIds.has(user.id)">save</mat-icon>
                    </button>
                    <button class="app-icon-btn info" [matTooltip]="'ACTIONS.DETAILS' | translate" type="button" (click)="openDetails(user)">
                      <mat-icon>tune</mat-icon>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="users.length === 0">
                <td colspan="6" class="empty-row">{{ 'COMMON.NO_DATA' | translate }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <app-table-pager
          [length]="users.length"
          [pageIndex]="pageIndex"
          [pageSize]="pageSize"
          (pageIndexChange)="pageIndex = $event">
        </app-table-pager>
      </section>
    </div>
  `,
  styles: [`
    .user-access-page { display: grid; gap: 24px; }
    .loading-wrap { display: flex; justify-content: center; padding: 60px 0; }
    
    .search-bar-shell { display: flex; align-items: center; gap: 12px; padding: 16px 20px; background: var(--surface); border-bottom: 1px solid var(--line); }
    .search-input-box { flex: 1; display: flex; align-items: center; gap: 10px; background: var(--surface-2); border: 1px solid var(--line); border-radius: 10px; padding: 0 12px; height: 42px; transition: border-color 0.2s; }
    .search-input-box:focus-within { border-color: var(--navy-300); background: var(--surface); }
    .search-input-box mat-icon { color: var(--text-muted); font-size: 20px; width: 20px; height: 20px; }
    .search-input-box input { border: none; background: transparent; color: var(--text-main); width: 100%; outline: none; font-size: 0.9rem; }
    .search-btn { height: 42px; padding: 0 20px; border-radius: 10px; background: var(--navy-800) !important; color: white !important; font-weight: 600; }

    .user-cell { display: flex; align-items: center; gap: 12px; }
    .user-avatar { width: 38px; height: 38px; border-radius: 50%; background: var(--navy-50); color: var(--navy-700); display: grid; place-items: center; font-weight: 700; font-size: 0.85rem; border: 1px solid var(--navy-100); flex-shrink: 0; }
    .user-info { display: flex; flex-direction: column; gap: 2px; }
    .user-name { font-weight: 700; color: var(--text-main); font-size: 0.92rem; }
    .user-email { font-size: 0.78rem; color: var(--text-muted); }

    .role-badge { display: inline-block; padding: 4px 10px; border-radius: 6px; background: var(--surface-2); border: 1px solid var(--line); color: var(--text-main); font-size: 0.82rem; font-weight: 600; }
    .current-roles-cell { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; align-items: center; }
    .role-select { width: 100%; }
    ::ng-deep .role-select .mat-mdc-form-field-wrapper { padding-bottom: 0; }

    .actions-col { width: 100px; text-align: center; }
    .center-col { text-align: center; }
    .row-index { font-family: var(--font-mono); color: var(--text-muted); font-size: 0.85rem; }

    .empty-row { text-align: center; padding: 3rem 0; color: var(--text-muted); }
    
    @media (max-width: 768px) {
      .search-bar-shell { flex-direction: column; align-items: stretch; }
    }
  `]
})
export class UserAccessManagementComponent implements OnInit {
  users: User[] = [];
  searchTerm = '';
  loading = true;
  savingIds = new Set<number>();
  draftMultiRoles: Record<number, UserRole[]> = {};
  readonly compareRoles = (a: UserRole, b: UserRole) => a === b;
  /** Assign-role dropdown: order from JOB_TITLE (code = role), then any role without lookup row. */
  roleRows: { role: UserRole; lookup?: LookupItem }[] = [];
  private roleLookupByCode = new Map<string, LookupItem>();

  readonly pageSize = 5;
  pageIndex = 0;

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
    { key: 'contracts', icon: 'description' },
    { key: 'vacancies', icon: 'meeting_room' },
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
    { key: 'menu' }, { key: 'view' }, { key: 'create' }, { key: 'edit' }, { key: 'delete' },
    { key: 'assign' }, { key: 'schedule' }, { key: 'start' }, { key: 'submit' }, { key: 'approve' },
    { key: 'reject' }, { key: 'export' }, { key: 'rate' }, { key: 'manage' }, { key: 'toggle' }
  ];

  private rolePermissions: Record<UserRole, PermissionMap> = {
    SUPER_ADMIN: {},
    GENERAL_MANAGER: {},
    ACCOUNTANT: {},
    HR_OFFICER: {},
    MAINTENANCE_OFFICER_INTERNAL: {},
    MAINTENANCE_OFFICER_COMPANY: {},
    MAINTENANCE_COMPANY: {},
    PROPERTY_GUARD: {},
    PROCEDURES_CLERK: {},
    OWNER: {},
    TENANT: {}
  };

  constructor(
    private readonly userService: UserService,
    private readonly lookupSvc: LookupService,
    private readonly snack: SnackService,
    private readonly i18n: I18nService,
    readonly permissions: PermissionService,
    private readonly dialog: MatDialog
  ) {}

  get isAr(): boolean {
    return this.i18n.currentLang === 'ar';
  }

  ngOnInit(): void {
    this.loadJobTitleRoles();
    this.loadUsers();
    this.permissions.getAll().subscribe({
      next: (res) => {
        for (const item of res.data ?? []) {
          this.rolePermissions[item.role] = JSON.parse(JSON.stringify(item.permissions ?? {}));
        }
      }
    });
  }

  private loadJobTitleRoles(): void {
    this.lookupSvc.getByType('JOB_TITLE').subscribe({
      next: (res) => this.applyJobTitleRoleLookups(res.data ?? []),
      error: () => this.applyJobTitleRoleLookups([])
    });
  }

  /**
   * Assign-role list: active JOB_TITLE rows whose {@code code} is a {@link UserRole} name.
   * Order from {@code sort_order}. No fixed product list — add rows in Reference Data.
   */
  private applyJobTitleRoleLookups(items: LookupItem[]): void {
    const portalItems = items
      .filter((it) => it.active && isUserRoleCode(it.code))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    this.roleLookupByCode = new Map(portalItems.map((it) => [it.code, it]));
    this.roleRows = portalItems.map((it) => ({ role: it.code as UserRole, lookup: it }));
    this.ensureRoleRowsCoverLoadedUsers();
  }

  /** Mat-select needs an option for every role value loaded from API. */
  private ensureRoleRowsCoverLoadedUsers(): void {
    const seen = new Set(this.roleRows.map((r) => r.role));
    const extra: { role: UserRole; lookup?: LookupItem }[] = [];
    for (const u of this.users) {
      for (const r of this.rolesFromUser(u)) {
        if (!seen.has(r)) {
          seen.add(r);
          extra.push({ role: r });
        }
      }
    }
    if (extra.length) {
      this.roleRows = [...this.roleRows, ...extra];
    }
  }

  get pagedUsers(): User[] {
    const start = this.pageIndex * this.pageSize;
    return this.users.slice(start, start + this.pageSize);
  }

  loadUsers(): void {
    this.pageIndex = 0;
    this.loading = true;
    this.userService.getAll(0, 200, this.searchTerm).subscribe({
      next: (res) => {
        this.users = res.data?.content ?? [];
        this.draftMultiRoles = this.users.reduce<Record<number, UserRole[]>>((acc, user) => {
          acc[user.id] = [...this.rolesFromUser(user)];
          return acc;
        }, {});
        this.ensureRoleRowsCoverLoadedUsers();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.error(this.i18n.instant('USER_ACCESS.LOAD_ERROR'));
      }
    });
  }

  saveRoles(user: User): void {
    const roles = this.normalizeRoleList(this.draftMultiRoles[user.id] ?? []);
    if (!roles.length || this.savingIds.has(user.id) || !this.isRoleDirty(user)) return;

    this.savingIds.add(user.id);
    this.userService.updateRoles(user.id, roles).subscribe({
      next: (res) => {
        this.savingIds.delete(user.id);
        if (res.data) {
          const index = this.users.findIndex((item) => item.id === user.id);
          if (index >= 0) {
            this.users[index] = res.data;
            this.draftMultiRoles[user.id] = [...this.rolesFromUser(res.data)];
          }
        }
        this.snack.success(this.i18n.instant('USER_ACCESS.SAVE_SUCCESS'));
      },
      error: (err: Error) => {
        this.savingIds.delete(user.id);
        this.snack.error(err.message || this.i18n.instant('USER_ACCESS.SAVE_ERROR'));
      }
    });
  }

  rolesFromUser(user: User): UserRole[] {
    const out: UserRole[] = [];
    const seen = new Set<UserRole>();
    for (const r of [user.role, ...(user.extraRoles ?? [])]) {
      if (r && !seen.has(r)) {
        seen.add(r);
        out.push(r);
      }
    }
    return out;
  }

  private normalizeRoleList(roles: UserRole[]): UserRole[] {
    const out: UserRole[] = [];
    const seen = new Set<UserRole>();
    for (const r of roles) {
      if (r && !seen.has(r)) {
        seen.add(r);
        out.push(r);
      }
    }
    return out;
  }

  isRoleDirty(user: User): boolean {
    return !this.roleSetsEqual(this.rolesFromUser(user), this.normalizeRoleList(this.draftMultiRoles[user.id] ?? []));
  }

  isDraftRolesEmpty(user: User): boolean {
    const d = this.draftMultiRoles[user.id];
    return !d || d.length === 0;
  }

  private roleSetsEqual(a: UserRole[], b: UserRole[]): boolean {
    if (a.length !== b.length) return false;
    const sa = [...a].sort().join(',');
    const sb = [...b].sort().join(',');
    return sa === sb;
  }

  private mergeRolePermissionMaps(roles: UserRole[]): PermissionMap {
    const maps = roles.map((r) => this.rolePermissions[r]).filter((m): m is PermissionMap => !!m && Object.keys(m).length > 0);
    if (!maps.length) return {};
    const out: PermissionMap = JSON.parse(JSON.stringify(maps[0]));
    for (let i = 1; i < maps.length; i++) {
      const next = maps[i];
      for (const mod of Object.keys(out)) {
        const dest = out[mod] as Record<string, boolean>;
        const src = next[mod] as Record<string, boolean> | undefined;
        if (!dest || !src) continue;
        for (const action of Object.keys(dest)) {
          dest[action] = !!(dest[action] || src[action]);
        }
      }
    }
    return out;
  }

  roleLabel(role: UserRole): string {
    const lu = this.roleLookupByCode.get(role);
    if (lu) {
      return this.i18n.currentLang === 'ar' ? lu.nameAr : lu.nameEn;
    }
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

  userInitials(user: User): string {
    const words = (user.fullName ?? user.username ?? '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return 'U';
    return words.slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? '').join('');
  }

  openDetails(user: User): void {
    const roles = this.normalizeRoleList(this.draftMultiRoles[user.id] ?? this.rolesFromUser(user));
    const permissions = this.mergeRolePermissionMaps(roles);
    const roleTitles = roles.map((r) => this.roleLabel(r)).join(' · ');

    this.dialog.open(UserAccessDetailsDialogComponent, {
      width: '920px',
      panelClass: 'app-dialog-panel',
      disableClose: true,
      data: {
        user,
        permissions,
        modules: this.modules,
        actions: this.actions,
        roleLabel: this.roleLabel.bind(this),
        roleTitles,
        moduleTitle: this.moduleTitle.bind(this),
        moduleDesc: this.moduleDesc.bind(this),
        actionLabel: this.actionLabel.bind(this)
      } satisfies UserAccessDetailsData
    });
  }
}
