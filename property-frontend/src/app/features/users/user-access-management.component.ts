import { Component, OnInit } from '@angular/core';
import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';

import { User, UserRole } from '../../core/models/user.model';
import { I18nService } from '../../core/i18n/i18n.service';
import { PermissionService } from '../../core/services/permission.service';
import { SnackService } from '../../core/services/snack.service';
import { UserService } from '../../core/services/user.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

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
    PageHeaderComponent
  ],
  template: `
    <div class="app-page user-access-page">
      <app-page-header
        [title]="'USER_ACCESS.TITLE' | translate"
        [subtitle]="'USER_ACCESS.SUBTITLE' | translate"
        [breadcrumbs]="[{label:('NAV.DASHBOARD' | translate), route:'/admin/dashboard'}, {label:('NAV.USER_ACCESS' | translate)}]">
      </app-page-header>

      <div class="loading-center" *ngIf="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <ng-container *ngIf="!loading">
        <div class="surface-glow search-wrap">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'ACTIONS.SEARCH' | translate }}</mat-label>
            <input matInput [ngModel]="searchTerm" (ngModelChange)="searchTerm = $event" [placeholder]="'USER_ACCESS.SEARCH_HINT' | translate">
          </mat-form-field>
          <button mat-flat-button type="button" (click)="loadUsers()">
            <span class="material-icons">search</span>
            {{ 'ACTIONS.SEARCH' | translate }}
          </button>
        </div>

        <div class="access-grid">
          <div class="surface-glow access-card" *ngFor="let user of users">
            <div class="access-head">
              <div>
                <h3>{{ user.fullName }}</h3>
                <p>{{ user.email }}</p>
                <span class="username">{{ user.username }}</span>
              </div>
              <span class="status-chip" [ngClass]="{ inactive: !user.isActive }">
                {{ (user.isActive ? 'COMMON.ACTIVE' : 'COMMON.INACTIVE') | translate }}
              </span>
            </div>

            <div class="access-meta">
              <span>{{ 'USER_ACCESS.CURRENT_ROLE' | translate }}: <strong>{{ roleLabel(user.role) }}</strong></span>
              <span>{{ 'REQUEST_LIST.CREATED_AT' | translate }}: {{ user.createdAt | date:'yyyy-MM-dd' }}</span>
            </div>

            <div class="role-editor" *ngIf="permissions.can('users', 'edit')">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ 'USER_ACCESS.ASSIGN_ROLE' | translate }}</mat-label>
                <mat-select [ngModel]="draftRoles[user.id]" (ngModelChange)="draftRoles[user.id] = $event">
                  <mat-option *ngFor="let role of roleOptions" [value]="role">{{ roleLabel(role) }}</mat-option>
                </mat-select>
              </mat-form-field>

              <button
                mat-flat-button
                type="button"
                [disabled]="savingIds.has(user.id) || draftRoles[user.id] === user.role"
                (click)="saveRole(user)">
                <mat-spinner *ngIf="savingIds.has(user.id)" diameter="18"></mat-spinner>
                <span *ngIf="!savingIds.has(user.id)">
                  <span class="material-icons">verified_user</span>
                  {{ 'USER_ACCESS.SAVE_ROLE' | translate }}
                </span>
              </button>
            </div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .user-access-page {
      display: grid;
      gap: 1.25rem;
    }

    .search-wrap {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.75rem;
      padding: 1rem;
      border-radius: 1.25rem;
      align-items: center;
    }

    .full-width {
      width: 100%;
    }

    .loading-center {
      display: flex;
      justify-content: center;
      padding: 2rem 0;
    }

    .access-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1rem;
    }

    .access-card {
      padding: 1.1rem;
      border-radius: 1.4rem;
      display: grid;
      gap: 0.9rem;
    }

    .access-head {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
    }

    .access-head h3 {
      margin: 0;
    }

    .access-head p,
    .username {
      margin: 0.18rem 0 0;
      color: var(--ink-soft);
      display: block;
    }

    .status-chip {
      height: fit-content;
      border-radius: 999px;
      padding: 0.38rem 0.75rem;
      background: #d1fae5;
      color: #065f46;
      font-weight: 700;
      font-size: 0.8rem;
    }

    .status-chip.inactive {
      background: #fee2e2;
      color: #991b1b;
    }

    .access-meta {
      display: grid;
      gap: 0.35rem;
      color: var(--ink-soft);
      font-size: 0.9rem;
    }

    .role-editor {
      display: grid;
      gap: 0.75rem;
      padding-top: 0.4rem;
      border-top: 1px solid rgba(15, 23, 42, 0.08);
    }

    @media (max-width: 768px) {
      .search-wrap {
        grid-template-columns: 1fr;
      }

      .access-head {
        flex-direction: column;
      }
    }
  `]
})
export class UserAccessManagementComponent implements OnInit {
  users: User[] = [];
  searchTerm = '';
  loading = true;
  savingIds = new Set<number>();
  draftRoles: Record<number, UserRole> = {};
  readonly roleOptions: UserRole[] = ['SUPER_ADMIN', 'PROPERTY_ADMIN', 'MAINTENANCE_OFFICER', 'TENANT'];

  constructor(
    private readonly userService: UserService,
    private readonly snack: SnackService,
    private readonly i18n: I18nService,
    readonly permissions: PermissionService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.userService.getAll(0, 200, this.searchTerm).subscribe({
      next: (res) => {
        this.users = res.data?.content ?? [];
        this.draftRoles = this.users.reduce<Record<number, UserRole>>((acc, user) => {
          acc[user.id] = user.role;
          return acc;
        }, {});
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.error(this.i18n.instant('USER_ACCESS.LOAD_ERROR'));
      }
    });
  }

  saveRole(user: User): void {
    const role = this.draftRoles[user.id] ?? user.role;
    if (role === user.role || this.savingIds.has(user.id)) return;

    this.savingIds.add(user.id);
    this.userService.updateRole(user.id, role).subscribe({
      next: (res) => {
        this.savingIds.delete(user.id);
        if (res.data) {
          const index = this.users.findIndex((item) => item.id === user.id);
          if (index >= 0) {
            this.users[index] = res.data;
            this.draftRoles[user.id] = res.data.role;
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

  roleLabel(role: UserRole): string {
    return this.i18n.instant(`ROLE.${role}`);
  }
}
