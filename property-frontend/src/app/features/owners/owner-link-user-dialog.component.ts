import { Component, Inject, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';

import { Owner, OwnerService, ownerDisplayName } from '../../core/services/owner.service';
import { User } from '../../core/models/user.model';
import { SnackService } from '../../core/services/snack.service';
import { I18nService } from '../../core/i18n/i18n.service';

export interface OwnerLinkUserDialogData {
  owner: Owner;
}

@Component({
  selector: 'app-owner-link-user-dialog',
  standalone: true,
  imports: [
    NgIf, NgFor, ReactiveFormsModule,
    MatDialogModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatSelectModule, MatCheckboxModule,
    MatProgressSpinnerModule, TranslateModule
  ],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon class="dialog-title-icon">link</mat-icon>
      {{ 'OWNERS.LINK_USER_TITLE' | translate }}
    </h2>
    <mat-dialog-content>
      <p class="owner-name">{{ ownerLabel(data.owner) }}</p>

      <div *ngIf="loadingUsers" class="loading-center">
        <mat-spinner diameter="32"></mat-spinner>
      </div>

      <form *ngIf="!loadingUsers" [formGroup]="form" class="link-form">
        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ 'OWNERS.SELECT_USER' | translate }}</mat-label>
          <mat-select formControlName="userId">
            <mat-option [value]="null">-- {{ 'OWNERS.NO_USER' | translate }} --</mat-option>
            <mat-option *ngFor="let u of ownerUsers" [value]="u.id">
              {{ u.fullName }} ({{ u.email }})
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-checkbox formControlName="portalAccess" class="full" [disabled]="!form.get('userId')?.value">
          {{ 'OWNERS.PORTAL_ACCESS' | translate }}
        </mat-checkbox>

        <p class="hint" *ngIf="!form.get('userId')?.value">
          {{ 'OWNERS.PORTAL_ACCESS_HINT' | translate }}
        </p>
      </form>
    </mat-dialog-content>
    <div mat-dialog-actions align="end" class="dialog-actions">
      <button mat-stroked-button type="button" (click)="ref.close(null)">{{ 'ACTIONS.CANCEL' | translate }}</button>
      <button mat-flat-button class="navy-btn" type="button" (click)="save()" [disabled]="saving || loadingUsers">
        <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
        <span *ngIf="!saving">{{ 'ACTIONS.SAVE' | translate }}</span>
      </button>
    </div>
  `,
  styles: [`
    .owner-name { font-weight: 600; color: var(--navy-800); margin: 0 0 16px; font-size: 1rem; }
    .link-form { display: flex; flex-direction: column; gap: 12px; padding-top: 4px; min-width: 420px; }
    .full { width: 100%; }
    .hint { font-size: 0.8rem; color: var(--text-secondary); margin: 0; }
    .loading-center { display: flex; justify-content: center; padding: 24px; }
    .dialog-actions { padding: 16px 24px; border-top: 1px solid var(--line); display: flex; gap: 12px; justify-content: flex-end; }
    .navy-btn { background: var(--navy-800) !important; color: white !important; }
  `]
})
export class OwnerLinkUserDialogComponent implements OnInit {
  saving = false;
  loadingUsers = true;
  ownerUsers: User[] = [];
  readonly form: FormGroup;

  ownerLabel(o: Owner): string {
    return ownerDisplayName(o, this.i18n.currentLang);
  }

  constructor(
    readonly ref: MatDialogRef<OwnerLinkUserDialogComponent, Owner | null>,
    @Inject(MAT_DIALOG_DATA) readonly data: OwnerLinkUserDialogData,
    private readonly fb: FormBuilder,
    private readonly svc: OwnerService,
    private readonly snack: SnackService,
    private readonly i18n: I18nService
  ) {
    this.form = this.fb.group({
      userId: [data.owner.userId ?? null],
      portalAccess: [{ value: data.owner.portalAccess, disabled: !data.owner.userId }]
    });

    this.form.get('userId')?.valueChanges.subscribe(val => {
      const ctrl = this.form.get('portalAccess');
      if (!val) {
        ctrl?.setValue(false, { emitEvent: false });
        ctrl?.disable({ emitEvent: false });
      } else {
        ctrl?.enable({ emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    this.svc.getOwnerUsers().subscribe({
      next: (res) => {
        this.ownerUsers = res.data ?? [];
        this.loadingUsers = false;
      },
      error: () => { this.ownerUsers = []; this.loadingUsers = false; }
    });
  }

  save(): void {
    if (this.saving) return;
    this.saving = true;
    const raw = this.form.getRawValue();
    this.svc.linkUser(this.data.owner.id, {
      userId: raw.userId || null,
      portalAccess: !!raw.userId && raw.portalAccess
    }).subscribe({
      next: (res) => {
        this.saving = false;
        this.snack.success(this.i18n.instant('OWNERS.LINK_SUCCESS'));
        this.ref.close(res.data ?? null);
      },
      error: (err: Error) => {
        this.saving = false;
        this.snack.error(err.message || this.i18n.instant('COMMON.ERROR'));
      }
    });
  }
}
