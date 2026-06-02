import { DialogTitleCloseDirective } from './../../../shared/directives/dialog-title-close.directive';
﻿import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators, ReactiveFormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { Subject, forkJoin, of, switchMap, takeUntil } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { UploadZoneComponent, UploadedFile } from '../../../shared/components/upload-zone/upload-zone.component';
import { MaintenanceService, RequestForm } from '../../../core/services/maintenance.service';
import { SnackService } from '../../../core/services/snack.service';
import { AuthService } from '../../../core/services/auth.service';
import { Property, PropertyService } from '../../../core/services/property.service';
import { Unit, UnitService } from '../../../core/services/unit.service';
import { I18nService } from '../../../core/i18n/i18n.service';

export interface MaintenanceRequestDialogData {
  context?: 'admin' | 'tenant';
}

@Component({
  selector: 'app-maintenance-request-dialog',
  standalone: true,
  imports: [
    NgFor, NgIf, ReactiveFormsModule, TranslateModule,
    MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    UploadZoneComponent, DialogTitleCloseDirective],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon class="dialog-title-icon">add_circle</mat-icon>
      {{ 'MAINTENANCE.NEW_REQUEST' | translate }}
    </h2>
    <mat-dialog-content>
      <div class="loading-center" *ngIf="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <form *ngIf="!loading" [formGroup]="form" class="request-dialog-form">
        <section class="request-form-section">
          <div class="section-label">{{ 'MAINTENANCE.CATEGORY' | translate }}</div>
          <div class="category-grid" *ngIf="categories.length > 0">
            <button
              type="button"
              class="category-tile"
              *ngFor="let cat of categories"
              [class.selected]="isCategorySelected(cat.id)"
              (click)="toggleCategory(cat.id)">
              <span class="material-icons category-icon">{{ cat.icon || 'build' }}</span>
              <span class="category-name">{{ categoryName(cat) }}</span>
            </button>
          </div>
        </section>

        <section class="request-form-section">
          <div class="section-label">{{ 'REQUEST_FORM.PROPERTY_UNIT' | translate }}</div>
          <div class="field-grid">
            <label class="field-shell">
              <span>{{ 'REQUEST_FORM.PROPERTY' | translate }}</span>
              <select formControlName="propertyId">
                <option [ngValue]="null" disabled>{{ 'REQUEST_FORM.SELECT_PROPERTY' | translate }}</option>
                <option *ngFor="let p of properties" [ngValue]="p.id">
                  {{ p.propertyName }} ({{ p.propertyCode }})
                </option>
              </select>
            </label>

            <label class="field-shell">
              <span>{{ 'REQUEST_FORM.UNIT' | translate }}</span>
              <select formControlName="unitId" [disabled]="!form.get('propertyId')?.value || loadingUnits">
                <option [ngValue]="null" disabled>
                  {{ form.get('propertyId')?.value ? (loadingUnits ? ('REQUEST_FORM.LOADING_UNITS' | translate) : ('REQUEST_FORM.SELECT_UNIT' | translate)) : ('REQUEST_FORM.SELECT_PROPERTY_FIRST' | translate) }}
                </option>
                <option *ngFor="let u of units" [ngValue]="u.id">
                  {{ u.unitNumber }}<ng-container *ngIf="u.unitType"> - {{ u.unitType }}</ng-container>
                </option>
              </select>
            </label>
          </div>
        </section>

        <section class="request-form-section">
          <label class="field-shell full-width">
            <span>{{ 'REQUEST_FORM.REQUEST_TITLE' | translate }}</span>
            <input type="text" formControlName="title" [placeholder]="'REQUEST_FORM.REQUEST_TITLE_PLACEHOLDER' | translate">
          </label>
        </section>

        <section class="request-form-section">
          <label class="field-shell full-width">
            <span>{{ 'MAINTENANCE.DESCRIPTION' | translate }}</span>
            <textarea rows="4" formControlName="description" [placeholder]="'REQUEST_FORM.DESCRIPTION_PLACEHOLDER' | translate"></textarea>
          </label>
        </section>

        <section class="request-form-section">
          <div class="section-label">{{ 'MAINTENANCE.PRIORITY' | translate }}</div>
          <div class="priority-row">
            <button
              type="button"
              class="priority-pill"
              *ngFor="let p of priorities"
              [class.selected]="form.get('priority')?.value === p.value"
              [attr.data-priority]="p.value"
              (click)="form.patchValue({ priority: p.value })">
              {{ ('PRIORITY.' + p.value) | translate }}
            </button>
          </div>
        </section>

        <section class="request-form-section">
          <div class="section-label">{{ 'REQUEST_FORM.ATTACHMENTS' | translate }}</div>
          <div class="upload-frame">
            <app-upload-zone
              [multiple]="true"
              [label]="'REQUEST_FORM.UPLOAD_LABEL' | translate"
              (filesChanged)="onFilesChanged($event)"
              (filesUploaded)="onFilesUploaded($event)">
            </app-upload-zone>
          </div>
        </section>
      </form>
    </mat-dialog-content>
    <div mat-dialog-actions align="end" class="dialog-actions-row">
      <button mat-stroked-button type="button" (click)="ref.close(false)">{{ 'ACTIONS.CANCEL' | translate }}</button>
      <button mat-flat-button class="navy-btn" type="button" (click)="submit()" [disabled]="submitting">
        <mat-spinner *ngIf="submitting" diameter="18"></mat-spinner>
        <span *ngIf="!submitting">
          <span class="material-icons" style="font-size: 18px; margin-inline-end: 4px;">send</span>
          {{ 'REQUEST_FORM.SEND_BUTTON' | translate }}
        </span>
      </button>
    </div>
  `,
  styles: [`
    .request-dialog-form { display: grid; gap: 18px; padding-top: 6px; }
    .request-form-section { display: grid; gap: 10px; }
    .section-label { color: var(--text-muted); font-size: 0.72rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; }
    .category-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .category-tile { position: relative; display: grid; gap: 8px; justify-items: start; min-height: 90px; padding: 14px 12px; border: 1px solid var(--line); border-radius: 14px; background: var(--surface); color: var(--text-main); text-align: start; cursor: pointer; transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease; }
    .category-tile:hover { transform: translateY(-1px); border-color: var(--amber-500); }
    .category-tile.selected { border-color: var(--accent); background: rgba(200, 154, 61, 0.08); }
    .category-icon { font-size: 20px; color: var(--text-main); }
    .category-tile.selected .category-icon { color: var(--accent); }
    .category-name { font-size: 0.85rem; font-weight: 600; }
    .field-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .field-shell { display: grid; gap: 8px; }
    .field-shell span { color: var(--text-muted); font-size: 0.72rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; }
    .field-shell input, .field-shell textarea, .field-shell select { width: 100%; min-height: 46px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface-2); color: var(--text-main); font: inherit; outline: none; transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease; }
    .field-shell textarea { min-height: 110px; resize: vertical; }
    .field-shell input:focus, .field-shell textarea:focus, .field-shell select:focus { border-color: var(--amber-500); box-shadow: 0 0 0 3px rgba(200, 154, 61, 0.12); background: var(--surface); }
    .priority-row { display: flex; flex-wrap: wrap; gap: 8px; }
    .priority-pill { padding: 8px 14px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface); color: var(--text-muted); font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, color 0.18s ease; }
    .priority-pill.selected { transform: translateY(-1px); }
    .priority-pill[data-priority='LOW'].selected { color: #234d77; background: #d9e5f2; border-color: #83a3c7; }
    .priority-pill[data-priority='NORMAL'].selected { color: #6b5a2a; background: #ece3cd; border-color: #ceb478; }
    .priority-pill[data-priority='HIGH'].selected { color: #b25d17; background: #fae7d1; border-color: #ebb16a; }
    .priority-pill[data-priority='URGENT'].selected { color: #9f2f24; background: #f7ddd6; border-color: #dd8d80; }
    .upload-frame { border: 2px dashed rgba(14, 31, 51, 0.16); border-radius: 14px; background: var(--surface-2); overflow: hidden; }
    .loading-center { display: flex; justify-content: center; padding: 32px 0; }
    .full-width { width: 100%; }
    .dialog-actions-row { padding: 16px 24px; border-top: 1px solid var(--line); display: flex; gap: 12px; justify-content: flex-end; background: var(--surface-2); }
    .navy-btn { background: var(--navy-800) !important; color: white !important; }
    @media (max-width: 640px) { .category-grid, .field-grid { grid-template-columns: 1fr; } }
  `]
})
export class MaintenanceRequestDialogComponent implements OnInit, OnDestroy {
  form: FormGroup;
  loading = false;
  submitting = false;
  loadingUnits = false;

  uploadedFiles: UploadedFile[] = [];
  uploadedUrls: string[] = [];

  categories: { id: number; nameAr: string; nameEn: string; icon: string }[] = [];
  properties: Property[] = [];
  units: Unit[] = [];
  selectedCategoryIds = new Set<number>();

  private readonly destroy$ = new Subject<void>();

  readonly priorities = [
    { value: 'LOW' },
    { value: 'NORMAL' },
    { value: 'HIGH' },
    { value: 'URGENT' }
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly maintSvc: MaintenanceService,
    private readonly propertySvc: PropertyService,
    private readonly unitSvc: UnitService,
    private readonly snack: SnackService,
    readonly i18n: I18nService,
    readonly auth: AuthService,
    readonly ref: MatDialogRef<MaintenanceRequestDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) readonly data: MaintenanceRequestDialogData
  ) {
    this.form = this.fb.group({
      propertyId: [null, Validators.required],
      unitId: [null, Validators.required],
      categoryIds: [[], (c: AbstractControl): ValidationErrors | null =>
        Array.isArray(c.value) && c.value.length > 0 ? null : { required: true }],
      title: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['', [Validators.required, Validators.maxLength(2000)]],
      priority: ['NORMAL', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadInitialData();

    this.form.get('propertyId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((propertyId: number | null) => {
        this.units = [];
        this.form.patchValue({ unitId: null }, { emitEvent: false });
        if (propertyId) {
          this.loadUnitsByProperty(propertyId);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFilesChanged(files: UploadedFile[]): void {
    this.uploadedFiles = files;
  }

  onFilesUploaded(urls: string[]): void {
    this.uploadedUrls = urls;
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.snack.error(this.i18n.instant('COMMON.FILL_REQUIRED_FIELDS'));
      return;
    }
    if (this.submitting) return;
    this.submitting = true;

    const payload: RequestForm = this.form.getRawValue();

    this.maintSvc.create(payload).pipe(
      switchMap((res) => {
        const requestId = res?.data?.id;
        if (!requestId || this.uploadedUrls.length === 0) return of(res);

        const currentUserId = this.auth.getCurrentUser()?.id;
        const attachmentCalls = this.uploadedUrls.map((url, i) => {
          const file = this.uploadedFiles[i];
          const fileType = file?.type ?? 'DOCUMENT';
          const fileName = file?.file?.name ?? `attachment-${i + 1}`;
          const fileSizeKb = file?.file?.size ? Math.ceil(file.file.size / 1024) : undefined;
          return this.maintSvc.addAttachment(requestId, {
            fileUrl: url,
            fileType,
            fileName,
            fileSizeKb,
            uploadedBy: currentUserId
          });
        });
        return forkJoin(attachmentCalls).pipe(switchMap(() => of(res)));
      })
    ).subscribe({
      next: () => {
        this.submitting = false;
        this.snack.success(this.i18n.instant('REQUEST_FORM.SEND_SUCCESS'));
        this.ref.close(true);
      },
      error: (err: Error) => {
        this.submitting = false;
        this.snack.error(err.message || this.i18n.instant('REQUEST_FORM.SEND_ERROR'));
      }
    });
  }

  canSubmitRequest(): boolean {
    return this.auth.isTenant()
      ? true
      : true;
  }

  categoryName(category: { nameAr: string; nameEn: string }): string {
    return this.i18n.currentLang === 'ar' ? category.nameAr : (category.nameEn || category.nameAr);
  }

  toggleCategory(id: number): void {
    if (this.selectedCategoryIds.has(id)) {
      this.selectedCategoryIds.delete(id);
    } else {
      this.selectedCategoryIds.add(id);
    }
    this.form.patchValue({ categoryIds: [...this.selectedCategoryIds] });
    this.form.get('categoryIds')?.markAsTouched();
  }

  isCategorySelected(id: number): boolean {
    return this.selectedCategoryIds.has(id);
  }

  private loadInitialData(): void {
    this.loading = true;

    forkJoin({
      categoriesRes: this.maintSvc.getCategories(),
      propertiesRes: this.propertySvc.getAll(0, 200)
    }).subscribe({
      next: ({ categoriesRes, propertiesRes }) => {
        this.categories = categoriesRes.data ?? [];
        this.properties = propertiesRes.data?.content ?? [];

        const currentPropertyId = this.auth.getCurrentUser()?.propertyId;
        if (currentPropertyId && this.properties.some((p) => p.id === currentPropertyId)) {
          this.form.patchValue({ propertyId: currentPropertyId });
        }

        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.error(this.i18n.instant('REQUEST_FORM.LOAD_ERROR'));
      }
    });
  }

  private loadUnitsByProperty(propertyId: number): void {
    this.loadingUnits = true;
    this.unitSvc.getByProperty(propertyId, 0, 500).subscribe({
      next: (res) => {
        this.units = (res.data?.content ?? []).filter((u) => u.active);
        this.loadingUnits = false;
      },
      error: () => {
        this.units = [];
        this.loadingUnits = false;
        this.snack.error(this.i18n.instant('REQUEST_FORM.LOAD_UNITS_ERROR'));
      }
    });
  }
}
