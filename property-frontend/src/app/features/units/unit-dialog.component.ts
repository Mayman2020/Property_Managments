import { Component, Inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';

import { Unit, UnitRequest, UnitService } from '../../core/services/unit.service';
import { Property } from '../../core/services/property.service';
import { SnackService } from '../../core/services/snack.service';
import { I18nService } from '../../core/i18n/i18n.service';

export interface UnitDialogData {
  properties: Property[];
  unit: Unit | null;
  defaultPropertyId?: number;
}

@Component({
  selector: 'app-unit-dialog',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    ReactiveFormsModule,
    TranslateModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.unit ? ('UNITS.EDIT' | translate) : ('UNITS.ADD' | translate) }}</h2>
    <mat-dialog-content class="dialog-body">
      <form [formGroup]="form" class="unit-dialog-form">
        <div class="dialog-intro">
          <span class="material-icons">home_work</span>
          <div>
            <strong>{{ data.unit ? ('UNITS.EDIT' | translate) : ('UNITS.ADD' | translate) }}</strong>
            <p>{{ 'UNITS.SUBTITLE' | translate }}</p>
          </div>
        </div>

        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ 'REQUEST_FORM.PROPERTY' | translate }}</mat-label>
          <mat-select formControlName="propertyId">
            <mat-option *ngFor="let p of data.properties" [value]="p.id">
              {{ isAr ? (p.propertyNameAr || p.propertyName) : (p.propertyNameEn || p.propertyName) }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'UNITS.UNIT_NUMBER' | translate }}</mat-label>
          <input matInput formControlName="unitNumber" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'UNITS.UNIT_TYPE' | translate }}</mat-label>
          <mat-select formControlName="unitType">
            <mat-option *ngFor="let t of unitTypes" [value]="t">{{ t }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'UNITS.FLOOR' | translate }}</mat-label>
          <input matInput type="number" formControlName="floorId" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'UNITS.AREA' | translate }}</mat-label>
          <input matInput type="number" formControlName="areaSqm" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'UNITS.RENT' | translate }}</mat-label>
          <input matInput type="number" formControlName="rentAmount" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ 'MAINTENANCE.DESCRIPTION' | translate }}</mat-label>
          <textarea matInput rows="2" formControlName="notes"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-stroked-button type="button" (click)="ref.close(false)">{{ 'ACTIONS.CANCEL' | translate }}</button>
      <button mat-flat-button type="button" (click)="save()" [disabled]="saving">
        <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
        <span *ngIf="!saving">{{ 'ACTIONS.SAVE' | translate }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-body { min-width: min(620px, 94vw); padding-top: 8px; }
    .unit-dialog-form { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .dialog-intro {
      grid-column: 1 / -1;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 16px;
      border: 1px solid var(--line);
      border-radius: 16px;
      background: linear-gradient(180deg, var(--surface-2), rgba(255,255,255,0.65));
    }
    .dialog-intro .material-icons {
      color: var(--amber-600);
      background: rgba(214, 147, 41, 0.12);
      border-radius: 12px;
      padding: 10px;
    }
    .dialog-intro strong {
      display: block;
      color: var(--text-main);
      font-size: 0.95rem;
    }
    .dialog-intro p {
      margin: 4px 0 0;
      color: var(--text-muted);
      font-size: 0.82rem;
    }
    .full { grid-column: 1 / -1; }
    .dialog-actions { gap: 10px; padding: 8px 16px 16px; }
    @media (max-width: 620px) { .unit-dialog-form { grid-template-columns: 1fr; } }
  `]
})
export class UnitDialogComponent {
  saving = false;
  readonly unitTypes: Array<UnitRequest['unitType']> = ['APARTMENT', 'SHOP', 'OFFICE', 'VILLA', 'WAREHOUSE', 'OTHER'];

  get isAr(): boolean {
    return this.i18n.currentLang === 'ar';
  }

  readonly form = this.fb.group({
    propertyId: [
      this.data.unit?.propertyId ?? this.data.defaultPropertyId ?? (this.data.properties[0]?.id ?? null) as number | null,
      Validators.required
    ],
    unitNumber: [this.data.unit?.unitNumber ?? '', Validators.required],
    unitType: [this.data.unit?.unitType ?? 'APARTMENT', Validators.required],
    floorId: [this.data.unit?.floorId ?? null as number | null],
    areaSqm: [this.data.unit?.areaSqm ?? null as number | null],
    rentAmount: [this.data.unit?.rentAmount ?? null as number | null],
    currency: [this.data.unit?.currency ?? 'OMR'],
    notes: [this.data.unit?.notes ?? '']
  });

  constructor(
    readonly ref: MatDialogRef<UnitDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) readonly data: UnitDialogData,
    private readonly fb: FormBuilder,
    private readonly unitSvc: UnitService,
    private readonly snack: SnackService,
    private readonly i18n: I18nService
  ) {}

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    const payload = this.form.getRawValue() as UnitRequest;
    const request$ = this.data.unit
      ? this.unitSvc.update(this.data.unit.id, payload)
      : this.unitSvc.create(payload);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.snack.success(this.i18n.instant('UNITS.SAVE_SUCCESS'));
        this.ref.close(true);
      },
      error: (err: Error) => {
        this.saving = false;
        this.snack.error(err.message || this.i18n.instant('UNITS.SAVE_ERROR'));
      }
    });
  }
}
