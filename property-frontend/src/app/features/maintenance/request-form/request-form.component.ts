import { Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators, ReactiveFormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, forkJoin, of, switchMap, takeUntil } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { UploadZoneComponent, UploadedFile } from '../../../shared/components/upload-zone/upload-zone.component';
import { MaintenanceService, RequestForm } from '../../../core/services/maintenance.service';
import { SnackService } from '../../../core/services/snack.service';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionService } from '../../../core/services/permission.service';
import { Property, PropertyService } from '../../../core/services/property.service';
import { Unit, UnitService } from '../../../core/services/unit.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-request-form',
  standalone: true,
  imports: [
    NgFor, NgIf, ReactiveFormsModule, RouterLink, TranslateModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    PageHeaderComponent, UploadZoneComponent
  ],
  templateUrl: './request-form.component.html',
  styleUrl: './request-form.component.scss'
})
export class RequestFormComponent implements OnInit, OnDestroy {
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
    private readonly router: Router,
    readonly permissions: PermissionService,
    readonly auth: AuthService
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
    if (this.form.invalid || this.submitting || !this.canSubmitRequest()) return;
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
        void this.router.navigateByUrl(this.auth.isTenant() ? '/tenant/requests' : '/admin/maintenance');
      },
      error: (err: Error) => {
        this.submitting = false;
        this.snack.error(err.message || this.i18n.instant('REQUEST_FORM.SEND_ERROR'));
      }
    });
  }

  cancelRoute(): string {
    return this.auth.isTenant() ? '/tenant/requests' : '/admin/maintenance';
  }

  categoryName(category: { nameAr: string; nameEn: string }): string {
    return this.i18n.currentLang === 'ar' ? category.nameAr : (category.nameEn || category.nameAr);
  }

  canSubmitRequest(): boolean {
    return this.auth.isTenant()
      ? this.permissions.can('new_request', 'create')
      : this.permissions.can('maintenance', 'create');
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
