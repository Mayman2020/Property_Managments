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

import { InventoryItem, InventoryService } from '../../core/services/inventory.service';
import { Property } from '../../core/services/property.service';
import { SnackService } from '../../core/services/snack.service';
import { I18nService } from '../../core/i18n/i18n.service';

export interface InventoryItemDialogData {
  item: InventoryItem | null;
  properties: Property[];
}

@Component({
  selector: 'app-inventory-item-dialog',
  standalone: true,
  imports: [
    NgIf, NgFor,
    ReactiveFormsModule, TranslateModule,
    MatDialogModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatProgressSpinnerModule, MatSelectModule
  ],
  template: `
    <h2 mat-dialog-title>
      {{ (data.item ? 'INVENTORY.EDIT_ITEM' : 'INVENTORY.ADD_ITEM') | translate }}
    </h2>
    <mat-dialog-content class="dialog-body">
      <form [formGroup]="form" class="inv-dialog-form">
        <div class="dialog-intro full">
          <span class="material-icons">inventory_2</span>
          <div>
            <strong>{{ (data.item ? 'INVENTORY.EDIT_ITEM' : 'INVENTORY.ADD_ITEM') | translate }}</strong>
            <p>{{ isAr ? 'أدخل بيانات الصنف والمخزون والموقع التشغيلي.' : 'Capture the item, stock, and storage location details.' }}</p>
          </div>
        </div>

        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ 'INVENTORY.PROPERTY' | translate }}</mat-label>
          <mat-select formControlName="propertyId">
            <mat-option *ngFor="let p of data.properties" [value]="p.id">
              {{ isAr ? (p.propertyNameAr || p.propertyName) : (p.propertyNameEn || p.propertyName) }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'INVENTORY.ITEM_CODE' | translate }}</mat-label>
          <input matInput formControlName="itemCode" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'INVENTORY.UNIT_OF_MEASURE' | translate }}</mat-label>
          <input matInput formControlName="unitOfMeasure" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ 'INVENTORY.ITEM_NAME_AR' | translate }}</mat-label>
          <input matInput formControlName="itemNameAr" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ 'INVENTORY.ITEM_NAME_EN' | translate }}</mat-label>
          <input matInput formControlName="itemNameEn" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'INVENTORY.CURRENT_QTY' | translate }}</mat-label>
          <input matInput type="number" min="0" formControlName="quantity" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'INVENTORY.MIN_QUANTITY' | translate }}</mat-label>
          <input matInput type="number" min="0" formControlName="minQuantity" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ 'INVENTORY.LOCATION' | translate }}</mat-label>
          <input matInput formControlName="location" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-stroked-button type="button" class="btn-dialog-cancel" (click)="ref.close(false)">
        {{ 'ACTIONS.CANCEL' | translate }}
      </button>
      <button mat-flat-button type="button" class="btn-dialog-confirm" (click)="save()" [disabled]="saving">
        <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
        <span *ngIf="!saving">{{ 'ACTIONS.SAVE' | translate }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-body { min-width: min(520px, 92vw); padding-top: 8px; }
    .inv-dialog-form { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .full { grid-column: 1 / -1; }
    @media (max-width: 560px) { .inv-dialog-form { grid-template-columns: 1fr; } }
  `]
})
export class InventoryItemDialogComponent {
  saving = false;
  get isAr(): boolean { return this.i18n.currentLang === 'ar'; }

  readonly form = this.fb.nonNullable.group({
    propertyId: [null as number | null, Validators.required],
    itemCode: ['', [Validators.required, Validators.maxLength(50)]],
    itemNameAr: ['', [Validators.required, Validators.maxLength(200)]],
    itemNameEn: ['', [Validators.maxLength(200)]],
    unitOfMeasure: ['', [Validators.maxLength(30)]],
    quantity: [0, [Validators.required, Validators.min(0)]],
    minQuantity: [0, [Validators.required, Validators.min(0)]],
    location: ['', [Validators.maxLength(200)]]
  });

  constructor(
    readonly ref: MatDialogRef<InventoryItemDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) readonly data: InventoryItemDialogData,
    private readonly fb: FormBuilder,
    private readonly svc: InventoryService,
    private readonly snack: SnackService,
    private readonly i18n: I18nService
  ) {
    const it = data.item;
    if (it) {
      this.form.patchValue({
        propertyId: it.propertyId ?? null,
        itemCode: it.itemCode ?? '',
        itemNameAr: it.itemNameAr ?? '',
        itemNameEn: it.itemNameEn ?? '',
        unitOfMeasure: it.unitOfMeasure ?? '',
        quantity: it.quantity ?? 0,
        minQuantity: it.minQuantity ?? 0,
        location: it.location ?? ''
      });
    } else if (data.properties.length === 1) {
      this.form.patchValue({ propertyId: data.properties[0].id });
    }
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const v = this.form.getRawValue();
    const body = {
      propertyId: v.propertyId!,
      itemCode: v.itemCode.trim(),
      itemNameAr: v.itemNameAr.trim(),
      itemNameEn: v.itemNameEn?.trim() || undefined,
      unitOfMeasure: v.unitOfMeasure?.trim() || undefined,
      quantity: v.quantity,
      minQuantity: v.minQuantity,
      location: v.location?.trim() || undefined
    };

    const req$ = this.data.item
      ? this.svc.update(this.data.item.id, body)
      : this.svc.create(body);

    req$.subscribe({
      next: () => { this.saving = false; this.snack.success(this.i18n.instant('COMMON.SUCCESS')); this.ref.close(true); },
      error: () => { this.saving = false; }
    });
  }
}
