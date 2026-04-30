import { AfterViewInit, ChangeDetectorRef, Component, Inject, OnInit, Optional } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe, NgFor, NgIf, NgTemplateOutlet } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';

import { PropertyService } from '../../../core/services/property.service';
import { UserService } from '../../../core/services/user.service';
import { ContractorCompany, ContractorCompanyService } from '../../../core/services/contractor-company.service';
import { User } from '../../../core/models/user.model';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LookupItem, LookupService } from '../../../core/services/lookup.service';
import { UploadZoneComponent } from '../../../shared/components/upload-zone/upload-zone.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

export interface PropertyDialogData {
  propertyId?: number | null;
  mode?: 'create' | 'view' | 'edit';
}

@Component({
  selector: 'app-property-form',
  standalone: true,
  imports: [
    DatePipe,
    NgFor,
    NgIf,
    NgTemplateOutlet,
    ReactiveFormsModule,
    RouterLink,
    TranslateModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    PageHeaderComponent,
    UploadZoneComponent
  ],
  templateUrl: './property-form.component.html',
  styleUrl: './property-form.component.scss',
  providers: [DatePipe]
})
export class PropertyFormComponent implements OnInit, AfterViewInit {
  form: FormGroup;
  submitting = false;
  loading = false;
  loadingLookups = false;

  propertyId: number | null = null;
  mode: 'create' | 'view' | 'edit' = 'create';

  omanCountry: LookupItem | null = null;
  cities: LookupItem[] = [];
  ownerDocumentUrls: string[] = [];
  contractorCompanies: ContractorCompany[] = [];
  internalOfficerOptions: User[] = [];
  propertyRecord: {
    id: number;
    ownerId: number;
    ownerName?: string;
    ownerNameAr?: string;
    ownerNameEn?: string;
    ownerEmail?: string;
    ownerCivilId?: string;
    propertyName: string;
    propertyNameAr?: string;
    propertyNameEn?: string;
    propertyCode: string;
    propertyType: 'RESIDENTIAL' | 'COMMERCIAL' | 'MIXED';
    address: string;
    city?: string;
    country?: string;
    googleMapUrl?: string;
    totalFloors: number;
    totalUnits: number;
    description?: string;
    coverImageUrl?: string;
    ownerDocumentFiles?: string[];
    maintenanceInternalOfficerUserId?: number;
    maintenanceContractorCompanyId?: number;
    isActive: boolean;
    createdAt: string;
  } | null = null;

  readonly types = [{ value: 'RESIDENTIAL' }, { value: 'COMMERCIAL' }, { value: 'MIXED' }];

  constructor(
    private readonly fb: FormBuilder,
    private readonly propertySvc: PropertyService,
    private readonly userSvc: UserService,
    private readonly contractorCompanySvc: ContractorCompanyService,
    private readonly lookupSvc: LookupService,
    private readonly snack: SnackService,
    readonly i18n: I18nService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly cdr: ChangeDetectorRef,
    private readonly datePipe: DatePipe,
    private readonly sanitizer: DomSanitizer,
    @Optional() private readonly dialogRef?: MatDialogRef<PropertyFormComponent, boolean>,
    @Optional() @Inject(MAT_DIALOG_DATA) private readonly dialogData?: PropertyDialogData | null
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
      ownerId: [null, Validators.required],
      ownerNameAr: [''],
      ownerNameEn: [''],
      ownerEmail: [''],
      ownerCivilId: [''],
      maintenanceInternalOfficerUserId: [null as number | null],
      maintenanceContractorCompanyId: [null as number | null]
    });
  }

  ngAfterViewInit(): void {
    if (this.isDialogMode) {
      this.cdr.detectChanges();
    }
  }

  ngOnInit(): void {
    this.resolveMode();
    if (this.mode === 'create') {
      this.form.get('propertyCode')?.clearValidators();
      this.form.patchValue({ propertyCode: '' }, { emitEvent: false });
      this.form.get('propertyCode')?.updateValueAndValidity({ emitEvent: false });
    }

    this.loadLocationLookups();
    this.loadContractorCompanies();

    this.form.get('maintenanceInternalOfficerUserId')?.valueChanges.subscribe((value) => {
      if (value != null && value !== '') {
        this.form.patchValue({ maintenanceContractorCompanyId: null }, { emitEvent: false });
      }
    });

    this.form.get('maintenanceContractorCompanyId')?.valueChanges.subscribe((value) => {
      if (value != null && value !== '') {
        this.form.patchValue({ maintenanceInternalOfficerUserId: null }, { emitEvent: false });
      }
    });
  }

  get isViewMode(): boolean {
    return this.mode === 'view';
  }

  get isDialogMode(): boolean {
    return !!this.dialogRef;
  }

  get pageTitleKey(): string {
    if (this.mode === 'edit') return 'PROPERTY_FORM.EDIT_TITLE';
    if (this.mode === 'view') return 'PROPERTY_FORM.VIEW_TITLE';
    return 'PROPERTY_FORM.TITLE';
  }

  get pageSubtitleKey(): string {
    if (this.mode === 'edit') return 'PROPERTY_FORM.EDIT_SUBTITLE';
    if (this.mode === 'view') return 'PROPERTY_FORM.VIEW_SUBTITLE';
    return 'PROPERTY_FORM.SUBTITLE';
  }

  get propertyDisplayName(): string {
    const raw = this.propertyRecord;
    if (!raw) return '';
    return this.i18n.currentLang === 'ar'
      ? (raw.propertyNameAr || raw.propertyName)
      : (raw.propertyNameEn || raw.propertyName);
  }

  get cityName(): string {
    const cityId = this.form.get('cityId')?.value;
    const city = this.cities.find((item) => item.id === cityId);
    if (city) return this.cityLabel(city);
    return this.propertyRecord?.city || '-';
  }

  get countryName(): string {
    return this.form.get('country')?.value || this.propertyRecord?.country || '-';
  }

  get internalOfficerName(): string {
    const officerId = this.form.get('maintenanceInternalOfficerUserId')?.value;
    if (!officerId) return '-';
    return this.internalOfficerOptions.find((user) => user.id === officerId)?.fullName || String(officerId);
  }

  get contractorCompanyName(): string {
    const companyId = this.form.get('maintenanceContractorCompanyId')?.value;
    if (!companyId) return '-';
    const company = this.contractorCompanies.find((item) => item.id === companyId);
    return company ? this.contractorCompanyLabel(company) : String(companyId);
  }

  get coverImageUrl(): string {
    return this.form.get('coverImageUrl')?.value || this.propertyRecord?.coverImageUrl || '';
  }

  get mapEmbedUrl(): SafeResourceUrl | null {
    const url: string = this.propertyRecord?.googleMapUrl || this.form.get('googleMapUrl')?.value || '';
    if (!url) return null;
    const embed = this.computeEmbedUrl(url);
    return embed ? this.sanitizer.bypassSecurityTrustResourceUrl(embed) : null;
  }

  openGoogleMaps(): void {
    window.open('https://www.google.com/maps', '_blank', 'noopener');
  }

  private computeEmbedUrl(url: string): string | null {
    const coordMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (coordMatch) {
      return `https://maps.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}&output=embed`;
    }
    if (url.includes('google.com/maps')) {
      try {
        const u = new URL(url);
        u.searchParams.set('output', 'embed');
        return u.toString();
      } catch { return null; }
    }
    return null;
  }

  get createdAtLabel(): string {
    return this.propertyRecord?.createdAt
      ? this.datePipe.transform(this.propertyRecord.createdAt, 'dd MMM yyyy') || '-'
      : '-';
  }

  documentName(url: string): string {
    const cleanUrl = url.split('?')[0];
    return cleanUrl.split('/').pop() || url;
  }

  cityLabel(city: LookupItem): string {
    return this.i18n.currentLang === 'ar' ? city.nameAr : city.nameEn;
  }

  contractorCompanyLabel(company: ContractorCompany): string {
    const ar = company.nameAr?.trim();
    const en = company.nameEn?.trim();
    const base = company.name?.trim();
    if (this.i18n.currentLang === 'ar' && ar) return ar;
    if (this.i18n.currentLang !== 'ar' && en) return en;
    return ar || en || base || String(company.id);
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
    this.ownerDocumentUrls = this.ownerDocumentUrls.filter((item) => item !== url);
  }

  editCurrent(): void {
    if (!this.propertyId) return;
    if (this.isDialogMode) {
      this.mode = 'edit';
      this.form.enable({ emitEvent: false });
      this.form.get('country')?.enable({ emitEvent: false });
      return;
    }
    void this.router.navigate(['/admin/properties', this.propertyId, 'edit']);
  }

  close(): void {
    if (this.isDialogMode) {
      this.dialogRef?.close(false);
      return;
    }
    void this.router.navigateByUrl('/admin/properties');
  }

  submit(): void {
    if (this.isViewMode || this.form.invalid || this.submitting) return;

    const raw = this.form.getRawValue();
    const selectedCity = this.cities.find((city) => city.id === raw.cityId);
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
      ownerNameAr: raw.ownerNameAr || undefined,
      ownerNameEn: raw.ownerNameEn || undefined,
      ownerEmail: raw.ownerEmail || undefined,
      ownerCivilId: raw.ownerCivilId || undefined,
      propertyName: raw.propertyNameAr || raw.propertyName || raw.propertyNameEn,
      propertyNameAr: raw.propertyNameAr || raw.propertyName,
      propertyNameEn: raw.propertyNameEn || raw.propertyName,
      propertyCode: (raw.propertyCode && String(raw.propertyCode).trim()) || undefined,
      propertyType: raw.propertyType,
      address: raw.address,
      city: selectedCity.nameAr,
      country: this.omanCountry.nameAr,
      googleMapUrl: raw.googleMapUrl || undefined,
      coverImageUrl: raw.coverImageUrl || undefined,
      totalFloors: raw.totalFloors,
      description: raw.description,
      ownerDocumentFiles: [...this.ownerDocumentUrls],
      maintenanceInternalOfficerUserId: raw.maintenanceInternalOfficerUserId || undefined,
      maintenanceContractorCompanyId: raw.maintenanceContractorCompanyId || undefined
    };

    this.submitting = true;
    const request$ = this.propertyId
      ? this.propertySvc.update(this.propertyId, payload)
      : this.propertySvc.create(payload);

    request$.subscribe({
      next: () => {
        this.submitting = false;
        this.snack.success(this.i18n.instant('PROPERTY_FORM.SAVE_SUCCESS'));
        if (this.isDialogMode) {
          this.dialogRef?.close(true);
          return;
        }
        void this.router.navigateByUrl('/admin/properties');
      },
      error: (err: Error) => {
        this.submitting = false;
        this.snack.error(err.message || this.i18n.instant('PROPERTY_FORM.SAVE_ERROR'));
      }
    });
  }

  private resolveMode(): void {
    if (this.dialogData) {
      this.propertyId = this.dialogData.propertyId ?? null;
      this.mode = this.dialogData.mode ?? (this.propertyId ? 'edit' : 'create');
    } else {
      const url = this.router.url;
      const id = Number(this.route.snapshot.paramMap.get('id'));
      this.propertyId = Number.isFinite(id) && id > 0 ? id : null;

      if (this.propertyId && url.endsWith('/edit')) this.mode = 'edit';
      else if (this.propertyId) this.mode = 'view';
      else this.mode = 'create';
    }

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
            if (this.propertyId) {
              this.loadInternalOfficers(this.propertyId);
              this.loadProperty(this.propertyId);
            }
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
        const property = res.data;
        if (!property) {
          this.loading = false;
          return;
        }

        this.propertyRecord = property;
        const cityMatch = this.cities.find((city) => city.nameAr === property.city || city.nameEn === property.city);

        this.form.patchValue({
          propertyName: property.propertyNameAr || property.propertyName || property.propertyNameEn,
          propertyNameAr: property.propertyNameAr || property.propertyName,
          propertyNameEn: property.propertyNameEn || property.propertyName,
          propertyCode: property.propertyCode,
          propertyType: property.propertyType,
          address: property.address,
          cityId: cityMatch?.id ?? null,
          country: this.omanCountry ? this.cityLabel(this.omanCountry) : (property.country || ''),
          googleMapUrl: property.googleMapUrl || '',
          coverImageUrl: property.coverImageUrl || '',
          totalFloors: property.totalFloors,
          description: property.description || '',
          ownerId: property.ownerId,
          ownerNameAr: property.ownerNameAr || '',
          ownerNameEn: property.ownerNameEn || '',
          ownerEmail: property.ownerEmail || '',
          ownerCivilId: property.ownerCivilId || '',
          maintenanceInternalOfficerUserId: property.maintenanceInternalOfficerUserId ?? null,
          maintenanceContractorCompanyId: property.maintenanceContractorCompanyId ?? null
        });
        this.ownerDocumentUrls = property.ownerDocumentFiles ?? [];
        this.loading = false;
      },
      error: (err: Error) => {
        this.loading = false;
        this.snack.error(err.message || this.i18n.instant('PROPERTY_LIST.LOAD_ERROR'));
      }
    });
  }

  private loadContractorCompanies(): void {
    this.contractorCompanySvc.list(true).subscribe({
      next: (res) => {
        this.contractorCompanies = (res.data ?? []).filter((company) => company.active);
      },
      error: () => {
        this.contractorCompanies = [];
      }
    });
  }

  private loadInternalOfficers(propertyId: number): void {
    this.userSvc.getAll(0, 200, undefined, 'MAINTENANCE_OFFICER').subscribe({
      next: (res) => {
        const rows = res.data?.content ?? [];
        this.internalOfficerOptions = rows.filter(
          (user) =>
            user.maintenanceOfficerType === 'INTERNAL_PROPERTY'
            && user.propertyId != null
            && user.propertyId === propertyId
        );
      },
      error: () => {
        this.internalOfficerOptions = [];
      }
    });
  }
}
