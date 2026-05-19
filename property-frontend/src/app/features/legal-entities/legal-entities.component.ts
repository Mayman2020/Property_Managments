import { Component, OnInit } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LegalEntity, LegalEntityService } from '../../core/services/legal-entity.service';
import { SnackService } from '../../core/services/snack.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { PermissionService } from '../../core/services/permission.service';
import { DeleteConfirmService } from '../../core/services/delete-confirm.service';
import { LegalEntityDialogComponent, LegalEntityDialogData } from './legal-entity-dialog.component';

@Component({
  selector: 'app-legal-entities',
  standalone: true,
  imports: [
    NgIf, NgFor,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule,
    TranslateModule, PageHeaderComponent
  ],
  template: `
    <div class="app-page">
      <app-page-header
        [title]="'LEGAL_ENTITIES.TITLE' | translate"
        [subtitle]="'LEGAL_ENTITIES.SUBTITLE' | translate"
        [breadcrumbs]="[
          { label: ('NAV.DASHBOARD' | translate), route: '/admin/dashboard' },
          { label: ('LEGAL_ENTITIES.TITLE' | translate) }
        ]">
        <button mat-flat-button class="navy-btn" *ngIf="canCreate()" (click)="openDialog(null)">
          <mat-icon>add</mat-icon>
          {{ 'LEGAL_ENTITIES.ADD' | translate }}
        </button>
      </app-page-header>

      <div *ngIf="loading" class="loading-center"><mat-spinner diameter="40"></mat-spinner></div>

      <div class="app-card table-card" *ngIf="!loading">
        <div class="app-table-wrap" *ngIf="entities.length > 0; else emptyTpl">
          <table class="app-data-table">
            <thead>
              <tr>
                <th>{{ 'LEGAL_ENTITIES.NAME_AR' | translate }}</th>
                <th>{{ 'LEGAL_ENTITIES.NAME_EN' | translate }}</th>
                <th>{{ 'LEGAL_ENTITIES.CR' | translate }}</th>
                <th>{{ 'LEGAL_ENTITIES.TAX' | translate }}</th>
                <th>{{ 'LEGAL_ENTITIES.PHONE' | translate }}</th>
                <th>{{ 'LEGAL_ENTITIES.EMAIL' | translate }}</th>
                <th>{{ 'COMMON.STATUS' | translate }}</th>
                <th>{{ 'COMMON.ACTIONS' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let e of entities">
                <td><strong>{{ e.nameAr }}</strong></td>
                <td>{{ e.nameEn || '—' }}</td>
                <td class="mono">{{ e.commercialRegistration || '—' }}</td>
                <td class="mono">{{ e.taxNumber || '—' }}</td>
                <td>{{ e.phone || '—' }}</td>
                <td>{{ e.email || '—' }}</td>
                <td>
                  <span class="badge" [class.badge-success]="e.active" [class.badge-muted]="!e.active">
                    {{ (e.active ? 'COMMON.ACTIVE' : 'COMMON.INACTIVE') | translate }}
                  </span>
                </td>
                <td class="actions-cell">
                  <button class="app-icon-btn" *ngIf="canEdit()" (click)="openDialog(e)" [matTooltip]="'ACTIONS.EDIT' | translate">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button class="app-icon-btn danger" *ngIf="canDelete()" (click)="remove(e)" [matTooltip]="'ACTIONS.DELETE' | translate">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <ng-template #emptyTpl>
          <div class="app-empty-state">
            <span class="material-icons empty-icon">domain</span>
            <h4>{{ 'LEGAL_ENTITIES.NO_DATA' | translate }}</h4>
            <p>{{ 'LEGAL_ENTITIES.NO_DATA_DESC' | translate }}</p>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .navy-btn { background: var(--navy-800) !important; color: white !important; }
    .navy-btn mat-icon { margin-inline-end: 6px; }
    .loading-center { display: flex; justify-content: center; padding: 48px; }
    .badge { display: inline-flex; align-items: center; gap: 4px; font-size: 0.78rem; padding: 2px 8px; border-radius: 12px; font-weight: 500; }
    .badge-success { background: #e8f5e9; color: #2e7d32; }
    .badge-muted { background: #f5f5f5; color: #9e9e9e; }
    .actions-cell { display: flex; gap: 4px; }
    .app-icon-btn.danger mat-icon { color: var(--error, #d32f2f); }
    .mono { font-family: monospace; }
  `]
})
export class LegalEntitiesComponent implements OnInit {
  entities: LegalEntity[] = [];
  loading = true;

  constructor(
    private readonly svc: LegalEntityService,
    private readonly dialog: MatDialog,
    private readonly snack: SnackService,
    readonly i18n: I18nService,
    private readonly permissions: PermissionService,
    private readonly deleteConfirm: DeleteConfirmService
  ) {}

  ngOnInit(): void { this.load(); }

  canCreate(): boolean { return this.permissions.can('settings', 'create'); }
  canEdit(): boolean { return this.permissions.can('settings', 'edit'); }
  canDelete(): boolean { return this.permissions.can('settings', 'delete'); }

  private load(): void {
    this.loading = true;
    this.svc.getAll().subscribe({
      next: (res) => { this.entities = res.data ?? []; this.loading = false; },
      error: () => { this.entities = []; this.loading = false; }
    });
  }

  openDialog(entity: LegalEntity | null): void {
    this.dialog.open<LegalEntityDialogComponent, LegalEntityDialogData, boolean>(
      LegalEntityDialogComponent, {
        data: { entity },
        width: '640px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        panelClass: 'app-dialog-panel',
        disableClose: true
      }
    ).afterClosed().subscribe(saved => { if (saved) this.load(); });
  }

  remove(e: LegalEntity): void {
    const name = this.i18n.currentLang === 'ar' ? e.nameAr : (e.nameEn || e.nameAr);
    this.deleteConfirm.openDeleteConfirm({ message: `${this.i18n.instant('LEGAL_ENTITIES.CONFIRM_DELETE')} "${name}"?` }).subscribe(ok => {
      if (!ok) return;
      this.svc.delete(e.id).subscribe({
        next: () => { this.snack.success(this.i18n.instant('LEGAL_ENTITIES.DELETE_SUCCESS')); this.load(); },
        error: (err: Error) => this.deleteConfirm.handleDeleteError(err, this.snack)
      });
    });
  }
}
