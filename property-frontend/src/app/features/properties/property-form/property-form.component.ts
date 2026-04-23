import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { PropertyService } from '../../../core/services/property.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LookupItem, LookupService } from '../../../core/services/lookup.service';
import { UploadZoneComponent } from '../../../shared/components/upload-zone/upload-zone.component';

@Component({
  selector: 'app-property-form',
  standalone: true,
  imports: [
    NgFor, NgIf, ReactiveFormsModule, RouterLink, TranslateModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    PageHeaderComponent, UploadZoneComponent
  ],
  templateUrl: './property-form.component.html',
  styleUrl: './property-form.component.scss'
})
export class PropertyFormComponent implements OnInit {
  form: FormGroup;
  submitting = false;
  loading = false;
  loadingLookups = false;

  propertyId: number | null = null;
  mode: 'create' | 'view' | 'edit' = 'create';

  omanCountry: LookupItem | null = null;
  cities: LookupItem[] = [];
  ownerDocumentUrls: string[] = [];

  readonly types = [
    { value: 'RESIDENTIAL' },
    { value: 'COMMERCIAL' },
    { value: 'MIXED' }
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly propertySvc: PropertyService,
    private readonly lookupSvc: LookupService,
    private readonly snack: SnackService,
    private readonly i18n: I18nService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      propertyName: [''],
      propertyNameAr: ['', Validators.required],
      propertyNameEn: ['', Validators.required],
      propertyCode: ['', Validators.required],
      propertyType: ['RESIDENTIAL', Validators.required],
      address: ['', Validators.required],
      cityId: [null, Validators.required],
      country: [{ value: '', disabled: true }, Validators.required],
      googleMapUrl: [''],
      coverImageUrl: [''],
      totalFloors: [1],
      description: [''],
      ownerId: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.resolveMode();
    this.loadLocationLookups();
  }

  get isViewMode(): boolean {
    return this.mode === 'view';
  }

  get pageTitleKey(): string {
    if (this.mode === 'edit') return 'PROPERTY_FORM.EDIT_TITLE';
    if (this.mode === 'view') return 'PROPERTY_FORM.VIEW_TITLE';
    return 'PROPERTY_FORM.TITLE';
  }

  cityLabel(city: LookupItem): string {
    return this.i18n.currentLang === 'ar' ? city.nameAr : city.nameEn;
  }

  onCoverUploaded(urls: string[]): void {
    if (urls.length > 0) {
      this.form.patchValue({ coverImageUrl: urls[0] });
    }
  }

  onOwnerDocumentsUploaded(urls: string[]): void {
    if (urls.length === 0) return;
    const merged = [...this.ownerDocumentUrls, ...urls];
    this.ownerDocumentUrls = Array.from(new Set(merged));
  }

  removeOwnerDocument(url: string): void {
    if (this.isViewMode) return;
    this.ownerDocumentUrls = this.ownerDocumentUrls.filter((u) => u !== url);
  }

  editCurrent(): void {
    if (!this.propertyId) return;
    void this.router.navigate(['/admin/properties', this.propertyId, 'edit']);
  }

  submit(): void {
    if (this.isViewMode || this.form.invalid || this.submitting) return;

    const raw = this.form.getRawValue();
    const selectedCity = this.cities.find((c) => c.id === raw.cityId);
    if (!selectedCity || !this.omanCountry) {
      this.snack.error(this.i18n.instant('PROPERTY_FORM.LOCATION_REQUIRED'));
      return;
    }
    if (this.ownerDocumentUrls.length === 0) {
      this.snack.error(this.i18n.instant('PROPERTY_FORM.OWNER_DOCS_REQUIRED'));
      return;
    }

    const payload = {
      ownerId: raw.ownerId,
      propertyName: raw.propertyNameAr || raw.propertyName || raw.propertyNameEn,
      propertyNameAr: raw.propertyNameAr || raw.propertyName,
      propertyNameEn: raw.propertyNameEn || raw.propertyName,
      propertyCode: raw.propertyCode,
      propertyType: raw.propertyType,
      address: raw.address,
      city: selectedCity.nameAr,
      country: this.omanCountry.nameAr,
      googleMapUrl: raw.googleMapUrl || undefined,
      coverImageUrl: raw.coverImageUrl || undefined,
      totalFloors: raw.totalFloors,
      description: raw.description,
      ownerDocumentFiles: [...this.ownerDocumentUrls]
    };

    this.submitting = true;
    const req$ = this.propertyId
      ? this.propertySvc.update(this.propertyId, payload)
      : this.propertySvc.create(payload);

    req$.subscribe({
      next: () => {
        this.submitting = false;
        this.snack.success(this.i18n.instant('PROPERTY_FORM.SAVE_SUCCESS'));
        void this.router.navigateByUrl('/admin/properties');
      },
      error: (err: Error) => {
        this.submitting = false;
        this.snack.error(err.message || this.i18n.instant('PROPERTY_FORM.SAVE_ERROR'));
      }
    });
  }

  private resolveMode(): void {
    const url = this.router.url;
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.propertyId = Number.isFinite(id) && id > 0 ? id : null;

    if (this.propertyId && url.endsWith('/edit')) this.mode = 'edit';
    else if (this.propertyId) this.mode = 'view';
    else this.mode = 'create';

    if (this.isViewMode) {
      this.form.disable({ emitEvent: false });
      this.form.get('country')?.enable({ emitEvent: false });
    }
  }

  private loadLocationLookups(): void {
    this.loadingLookups = true;
    this.lookupSvc.getOmanCountry().subscribe({
      next: (res) => {
        this.omanCountry = res.data ?? null;
        if (!this.omanCountry) {
          this.loadingLookups = false;
          this.snack.error(this.i18n.instant('PROPERTY_FORM.LOAD_LOCATION_ERROR'));
          return;
        }

        this.form.patchValue({ country: this.cityLabel(this.omanCountry) });

        this.lookupSvc.getCities(this.omanCountry.id).subscribe({
          next: (citiesRes) => {
            this.cities = citiesRes.data ?? [];
            this.loadingLookups = false;
            if (this.propertyId) this.loadProperty(this.propertyId);
          },
          error: () => {
            this.loadingLookups = false;
            this.snack.error(this.i18n.instant('PROPERTY_FORM.LOAD_LOCATION_ERROR'));
          }
        });
      },
      error: () => {
        this.loadingLookups = false;
        this.snack.error(this.i18n.instant('PROPERTY_FORM.LOAD_LOCATION_ERROR'));
      }
    });
  }

  private loadProperty(id: number): void {
    this.loading = true;
    this.propertySvc.getById(id).subscribe({
      next: (res) => {
        const p = res.data;
        if (!p) {
          this.loading = false;
          return;
        }

        const cityMatch = this.cities.find((c) => c.nameAr === p.city || c.nameEn === p.city);

        this.form.patchValue({
          propertyName: p.propertyNameAr || p.propertyName || p.propertyNameEn,
          propertyNameAr: p.propertyNameAr || p.propertyName,
          propertyNameEn: p.propertyNameEn || p.propertyName,
          propertyCode: p.propertyCode,
          propertyType: p.propertyType,
          address: p.address,
          cityId: cityMatch?.id ?? null,
          country: this.omanCountry ? this.cityLabel(this.omanCountry) : (p.country || ''),
          googleMapUrl: p.googleMapUrl || '',
          coverImageUrl: p.coverImageUrl || '',
          totalFloors: p.totalFloors,
          description: p.description || '',
          ownerId: p.ownerId
        });
        this.ownerDocumentUrls = p.ownerDocumentFiles ?? [];

        this.loading = false;
      },
      error: (err: Error) => {
        this.loading = false;
        this.snack.error(err.message || this.i18n.instant('PROPERTY_LIST.LOAD_ERROR'));
      }
    });
  }
}
