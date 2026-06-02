import { DialogTitleCloseDirective } from './../../../shared/directives/dialog-title-close.directive';
import { AfterViewInit, ChangeDetectorRef, Component, Inject, OnInit, Optional } from '@angular/core';
import { debounceTime, distinctUntilChanged, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe, DecimalPipe, NgFor, NgIf, NgTemplateOutlet } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TranslateModule } from '@ngx-translate/core';

import { PropertyService } from '../../../core/services/property.service';
import { Unit, UnitService } from '../../../core/services/unit.service';
import { Tenant, TenantService } from '../../../core/services/tenant.service';
import { UserService } from '../../../core/services/user.service';
import { ContractorCompany, ContractorCompanyService } from '../../../core/services/contractor-company.service';
import { User } from '../../../core/models/user.model';
import { SnackService } from '../../../core/services/snack.service';
import { DeleteConfirmService } from '../../../core/services/delete-confirm.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LookupItem, LookupService } from '../../../core/services/lookup.service';
import { PropertyAttachment, PropertyAttachmentService } from '../../../core/services/property-attachment.service';
import { MaintenanceAssignment, MaintenanceAssignmentService } from '../../../core/services/maintenance-assignment.service';
import { MaintenanceContractResponse, MaintenanceContractService } from '../../../core/services/maintenance-contract.service';
import { MaintenanceContractInvoiceResponse, MaintenanceContractInvoiceService } from '../../../core/services/maintenance-contract-invoice.service';
import { AuthService } from '../../../core/services/auth.service';
import { Owner, OwnerService, ownerDisplayName } from '../../../core/services/owner.service';
import { LegalEntity, LegalEntityService } from '../../../core/services/legal-entity.service';
import { ApiResponse, PagedResponse } from '../../../core/models/api-response.model';
import { UploadZoneComponent } from '../../../shared/components/upload-zone/upload-zone.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';
import { MapPreviewComponent } from '../../../shared/components/map-preview/map-preview.component';
import { AuditTrailComponent } from '../../../shared/components/audit-trail/audit-trail.component';

export interface PropertyDialogData {
  propertyId?: number | null;
  mode?: 'create' | 'view' | 'edit';
}

import { ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-property-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    DecimalPipe,
    FormsModule,
    NgFor,
    NgIf,
    NgTemplateOutlet,
    ReactiveFormsModule,
    RouterLink,
    TranslateModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
    PageHeaderComponent,
    UploadZoneComponent,
    SearchableSelectComponent,
    MapPreviewComponent,
    AuditTrailComponent, DialogTitleCloseDirective],
  templateUrl: './property-form.component.html',
  styleUrl: './property-form.component.scss',
  providers: [DatePipe, DecimalPipe]
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
  propertyStatuses: LookupItem[] = [];
  ownerDocumentUrls: string[] = [];
  /** Bound to cover upload zone (single image as one-element array). */
  coverUploadUrls: string[] = [];
  attachments: PropertyAttachment[] = [];
  attachmentUploading = false;
  assignments: MaintenanceAssignment[] = [];
  assignmentsLoading = false;
  showAssignForm = false;
  assignSubmitting = false;
  assignProviderType: 'USER' | 'COMPANY' = 'USER';
  assignUserId: number | null = null;
  assignCompanyId: number | null = null;
  assignIsPrimary = true;
  assignStartDate = '';
  assignNotes = '';
  assignContractStart = '';
  assignContractEnd = '';
  assignSlaHours: number | null = null;
  assignContractValue: number | null = null;
  showContractFields = false;
  // Contracts
  contracts: MaintenanceContractResponse[] = [];
  contractsLoading = false;
  expandedContractId: number | null = null;
  invoicesByContract: Record<number, MaintenanceContractInvoiceResponse[]> = {};
  invoicesLoading: Record<number, boolean> = {};
  generatingInvoices: Record<number, boolean> = {};
  contractorCompanies: ContractorCompany[] = [];
  maintenanceCompanies: ContractorCompany[] = [];
  legalEntities: LegalEntity[] = [];
  internalOfficerOptions: User[] = [];
  floorUnitsConfig: Record<number, number> = {};
  liveUnitCount: number | null = null;
  /** Units and tenants loaded for full-page property view (detail workspace). */
  propertyUnits: Unit[] = [];
  propertyTenants: Tenant[] = [];
  unitsTenantsLoading = false;
  propertyRecord: {
    id: number;
    ownerId: number;
    propertyName: string;
    propertyNameAr?: string;
    propertyNameEn?: string;
    propertyCode: string;
    propertyType: string;
    address: string;
    city?: string;
    country?: string;
    googleMapUrl?: string;
    totalFloors: number;
    /** Max units from floor config; mirrored in {@link floorUnitsConfig} after load. */
    floorUnitsConfig?: Record<number, number>;
    totalUnits: number;
    description?: string;
    coverImageUrl?: string;
    ownerDocumentFiles?: string[];
    isActive: boolean;
    createdAt: string;
    updatedAt?: string;
    createdBy?: number;
    createdByName?: string;
    modifiedBy?: number;
    modifiedByName?: string;
    legalEntityId?: number;
    legalEntityNameAr?: string;
    legalEntityNameEn?: string;
  } | null = null;

  propertyTypes: LookupItem[] = [];
  owners: Owner[] = [];
  ownersLoading = false;
  selectedOwners: (Owner & { ownershipPercentage: number })[] = [];
  ownerTouched = false;
  ownerSearchControl = new FormControl('');

  /** mat-autocomplete may set the control to the selected object; only strings are user-typed search. */
  private autocompleteSearchText(raw: unknown): string {
    return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  }

  get filteredOwners(): Owner[] {
    const q = this.autocompleteSearchText(this.ownerSearchControl.value);
    return this.owners.filter((o) => {
      if (!q) return true;
      const blob = [o.fullName, o.fullNameAr, o.fullNameEn, o.nationalId]
        .filter((x): x is string => !!x && String(x).trim().length > 0)
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }

  isOwnerSelected(owner: Owner): boolean {
    return this.selectedOwners.some((o) => o.id === owner.id);
  }

  addOwner(owner: Owner): void {
    if (!this.isOwnerSelected(owner)) {
      const pct = this.selectedOwners.length === 0 ? 100 : 0;
      this.selectedOwners = [...this.selectedOwners, { ...owner, ownershipPercentage: pct }];
      this.redistributeOwnerPercentages();
    }
    this.ownerSearchControl.setValue('', { emitEvent: false });
    this.cdr.markForCheck();
  }

  removeOwner(owner: Owner): void {
    this.selectedOwners = this.selectedOwners.filter((o) => o.id !== owner.id);
    this.redistributeOwnerPercentages();
    this.cdr.markForCheck();
  }

  redistributeOwnerPercentages(): void {
    const n = this.selectedOwners.length;
    if (n === 0) return;
    const each = Math.round((100 / n) * 100) / 100;
    this.selectedOwners = this.selectedOwners.map((o, idx) => ({
      ...o,
      ownershipPercentage: idx === n - 1
        ? Math.round((100 - each * (n - 1)) * 100) / 100
        : each
    }));
  }

  ownerDisplayFn = (o: Owner | null): string => {
    if (!o) return '';
    return ownerDisplayName(o, this.i18n.currentLang);
  };

  ownerLabel(o: Owner): string {
    return ownerDisplayName(o, this.i18n.currentLang);
  }

  // Maintenance provider multi-select state
  maintenanceProviderType: 'USER' | 'COMPANY' = 'USER';
  selectedMaintenanceProviders: Array<{id: number; name: string; providerType: 'USER' | 'COMPANY'}> = [];
  maintenanceProviderSearchControl = new FormControl('');

  get filteredMaintenanceProviderOptions(): Array<{id: number; name: string}> {
    const q = this.autocompleteSearchText(this.maintenanceProviderSearchControl.value);
    const selectedIds = new Set(this.selectedMaintenanceProviders.map((p) => p.id));
    if (this.maintenanceProviderType === 'USER') {
      return this.internalOfficerOptions
        .filter((u) => !selectedIds.has(u.id))
        .filter((u) => !q || u.fullName.toLowerCase().includes(q))
        .map((u) => ({ id: u.id, name: u.fullName }));
    } else {
      return this.contractorCompanies
        .filter((c) => !selectedIds.has(c.id))
        .filter((c) => !q || this.contractorCompanyLabel(c).toLowerCase().includes(q))
        .map((c) => ({ id: c.id, name: this.contractorCompanyLabel(c) }));
    }
  }

  isMaintenanceProviderSelected(id: number): boolean {
    return this.selectedMaintenanceProviders.some((p) => p.id === id);
  }

  addMaintenanceProvider(item: {id: number; name: string}): void {
    if (!this.isMaintenanceProviderSelected(item.id)) {
      this.selectedMaintenanceProviders = [
        ...this.selectedMaintenanceProviders,
        { ...item, providerType: this.maintenanceProviderType }
      ];
    }
    this.maintenanceProviderSearchControl.setValue('', { emitEvent: false });
    this.cdr.markForCheck();
  }

  removeMaintenanceProvider(item: {id: number}): void {
    this.selectedMaintenanceProviders = this.selectedMaintenanceProviders.filter((p) => p.id !== item.id);
    this.cdr.markForCheck();
  }

  onMaintenanceProviderTypeChange(): void {
    this.selectedMaintenanceProviders = [];
    this.maintenanceProviderSearchControl.setValue('', { emitEvent: false });
    this.cdr.markForCheck();
  }

  maintenanceProviderDisplayFn = (): string => '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly propertySvc: PropertyService,
    private readonly unitSvc: UnitService,
    private readonly tenantSvc: TenantService,
    private readonly userSvc: UserService,
    private readonly contractorCompanySvc: ContractorCompanyService,
    private readonly lookupSvc: LookupService,
    private readonly snack: SnackService,
    private readonly deleteConfirm: DeleteConfirmService,
    readonly i18n: I18nService,
    private readonly attachmentSvc: PropertyAttachmentService,
    private readonly assignmentSvc: MaintenanceAssignmentService,
    private readonly contractSvc: MaintenanceContractService,
    private readonly invoiceSvc: MaintenanceContractInvoiceService,
    private readonly authSvc: AuthService,
    private readonly ownerSvc: OwnerService,
    private readonly legalEntitySvc: LegalEntityService,
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
      propertyType: ['RESIDENTIAL', Validators.required],
      address: ['', Validators.required],
      cityId: [null, Validators.required],
      country: [{ value: '', disabled: true }, Validators.required],
      googleMapUrl: [''],
      coverImageUrl: [''],
      totalFloors: [1],
      description: [''],
      legalEntityId: [null]
    });
  }

  ngAfterViewInit(): void {
    if (this.isDialogMode) {
      this.cdr.detectChanges();
    }
  }

    ngOnInit(): void {
    this.resolveMode();
    // propertyCode is backend-generated; do not validate or send in create payload

    this.loadLocationLookups();
    this.loadPropertyTypes();
    this.loadPropertyStatuses();
    this.loadContractorCompanies();
    this.loadOwners();
    this.loadMaintenanceOfficers();
    this.loadLegalEntities();

    this.form.get('googleMapUrl')?.valueChanges
      .pipe(debounceTime(600), distinctUntilChanged())
      .subscribe(() => {
        this.cdr.markForCheck();
      });

    this.form.get('totalFloors')?.valueChanges.subscribe(() => this.cdr.markForCheck());
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

  get coverImageUrl(): string {
    return this.form.get('coverImageUrl')?.value || this.propertyRecord?.coverImageUrl || '';
  }

  openGoogleMaps(): void {
    window.open('https://www.google.com/maps', '_blank', 'noopener');
  }

  documentName(url: string): string {
    const cleanUrl = url.split('?')[0];
    return cleanUrl.split('/').pop() || url;
  }

  cityLabel(city: LookupItem): string {
    return this.i18n.currentLang === 'ar' ? city.nameAr : city.nameEn;
  }

  get floorArray(): number[] {
    const count = this.form.get('totalFloors')?.value || 0;
    return Array.from({ length: count > 100 ? 100 : count }, (_, i) => i + 1);
  }

  updateFloorUnit(floor: number, event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      this.floorUnitsConfig[floor] = num;
    } else {
      delete this.floorUnitsConfig[floor];
    }
    this.cdr.markForCheck();
  }

  /** Sum of per-floor limits for floors 1..totalFloors (matches backend capacity cap). */
  private sumFloorUnitsConfig(totalFloors: number, config: Record<number, number>): number {
    const nF = Math.min(100, Math.max(0, Number(totalFloors) || 0));
    let sum = 0;
    for (let f = 1; f <= nF; f++) {
      const raw = config[f];
      const n = typeof raw === 'number' && !Number.isNaN(raw) ? raw : 0;
      sum += Math.max(0, n);
    }
    return sum;
  }

  /** Create / edit form: uses form totalFloors + floorUnitsConfig. */
  plannedTotalUnitsFromConfig(): number {
    return this.sumFloorUnitsConfig(Number(this.form.get('totalFloors')?.value) || 0, this.floorUnitsConfig);
  }

  /** Property view page: uses loaded record + floorUnitsConfig (set in loadProperty). */
  plannedTotalUnitsForView(): number {
    if (!this.propertyRecord) return 0;
    return this.sumFloorUnitsConfig(this.propertyRecord.totalFloors, this.floorUnitsConfig);
  }

  getFloorUnitValue(floor: number): number | string {
    return this.floorUnitsConfig[floor] || '';
  }

  lookupLabel(item: LookupItem): string {
    return this.i18n.currentLang === 'ar' ? item.nameAr : item.nameEn;
  }

  propertyTypeLabel(code: string | null | undefined): string {
    if (!code) return '-';
    const item = this.propertyTypes.find((type) => type.code === code);
    return item ? this.lookupLabel(item) : code;
  }

  propertyStatusLabel(active: boolean): string {
    const status = this.propertyStatuses.find((item) => this.statusCodeToBoolean(item.code) === active);
    return status ? this.lookupLabel(status) : this.i18n.instant(active ? 'COMMON.ACTIVE' : 'COMMON.INACTIVE');
  }

  private statusCodeToBoolean(code: string): boolean | null {
    if (code === 'ACTIVE') return true;
    if (code === 'INACTIVE') return false;
    return null;
  }

  contractorCompanyLabel(company: ContractorCompany): string {
    const ar = company.nameAr?.trim();
    const en = company.nameEn?.trim();
    const base = company.name?.trim();
    if (this.i18n.currentLang === 'ar' && ar) return ar;
    if (this.i18n.currentLang !== 'ar' && en) return en;
    return ar || en || base || String(company.id);
  }

  onCoverUrlListChange(urls: string[]): void {
    this.coverUploadUrls = [...urls];
    this.form.patchValue({ coverImageUrl: (urls[0] || '').trim() });
    this.cdr.markForCheck();
  }

  onOwnerDocumentUrlsChange(urls: string[]): void {
    this.ownerDocumentUrls = [...urls];
    this.cdr.markForCheck();
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

  attachmentIcon(att: PropertyAttachment): string {
    return this.attachmentSvc.iconFor(att.mimeType);
  }

  attachmentSize(att: PropertyAttachment): string {
    return this.attachmentSvc.formatSize(att.fileSize);
  }

  viewAttachment(att: PropertyAttachment): void {
    if (!this.propertyId) return;
    window.open(this.attachmentSvc.viewUrl(this.propertyId, att.id), '_blank', 'noopener');
  }

  downloadAttachment(att: PropertyAttachment): void {
    if (!this.propertyId) return;
    const a = document.createElement('a');
    a.href = this.attachmentSvc.downloadUrl(this.propertyId, att.id);
    a.download = att.originalName;
    a.click();
  }

  onAttachmentFilesChosen(event: Event): void {
    if (!this.propertyId) return;
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const files = Array.from(input.files);
    input.value = '';
    this.uploadAttachmentFiles(files);
  }

  private uploadAttachmentFiles(files: File[]): void {
    if (!this.propertyId || !files.length) return;
    this.attachmentUploading = true;
    let remaining = files.length;
    files.forEach((file) => {
      this.attachmentSvc.upload(this.propertyId!, file).subscribe({
        next: (res) => {
          if (res.data) this.attachments = [res.data, ...this.attachments];
          remaining--;
          if (remaining === 0) this.attachmentUploading = false;
        },
        error: () => {
          remaining--;
          if (remaining === 0) this.attachmentUploading = false;
          this.snack.error(this.i18n.instant('PROPERTY_FORM.ATTACHMENT_UPLOAD_ERROR'));
        }
      });
    });
  }

  deleteAttachment(att: PropertyAttachment): void {
    if (!this.propertyId) return;
    const label = att.originalName?.trim() || `#${att.id}`;
    this.deleteConfirm.openDeleteConfirm({
      messageKey: 'DIALOG.DELETE_NAMED',
      messageParams: { name: label }
    }).subscribe((ok) => {
      if (!ok) return;
      this.attachmentSvc.delete(this.propertyId!, att.id).subscribe({
        next: () => {
          this.attachments = this.attachments.filter((a) => a.id !== att.id);
          this.cdr.markForCheck();
        },
        error: (err: Error) => this.deleteConfirm.handleDeleteError(err, this.snack)
      });
    });
  }

  get canManageAssignments(): boolean {
    const role = this.authSvc.getRole();
    return role === 'SUPER_ADMIN' || role === 'GENERAL_MANAGER';
  }

  toggleAssignForm(): void {
    this.showAssignForm = !this.showAssignForm;
    if (this.showAssignForm) {
      this.assignProviderType = 'USER';
      this.assignUserId = null;
      this.assignCompanyId = null;
      this.assignIsPrimary = true;
      this.assignStartDate = '';
      this.assignNotes = '';
      this.assignContractStart = '';
      this.assignContractEnd = '';
      this.assignSlaHours = null;
      this.assignContractValue = null;
      this.showContractFields = false;
    }
  }

  onAssignProviderTypeChange(): void {
    this.assignUserId = null;
    this.assignCompanyId = null;
    this.showContractFields = false;
  }

  submitAssignment(): void {
    if (!this.propertyId || this.assignSubmitting) return;

    if (this.assignProviderType === 'USER' && !this.assignUserId) {
      this.snack.error(this.i18n.instant('MAINTENANCE_ASSIGNMENT.USER_REQUIRED'));
      return;
    }
    if (this.assignProviderType === 'COMPANY' && !this.assignCompanyId) {
      this.snack.error(this.i18n.instant('MAINTENANCE_ASSIGNMENT.COMPANY_REQUIRED'));
      return;
    }

    const req: import('../../../core/services/maintenance-assignment.service').AssignMaintenanceRequest = {
      providerType: this.assignProviderType,
      userId: this.assignProviderType === 'USER' ? this.assignUserId : null,
      companyId: this.assignProviderType === 'COMPANY' ? this.assignCompanyId : null,
      isPrimary: this.assignIsPrimary,
      startDate: this.assignStartDate || null,
      notes: this.assignNotes || null,
      contract: this.assignProviderType === 'COMPANY' && this.showContractFields && this.assignContractStart
        ? {
            startDate: this.assignContractStart,
            endDate: this.assignContractEnd || null,
            slaHours: this.assignSlaHours,
            contractValue: this.assignContractValue
          }
        : null
    };

    this.assignSubmitting = true;
    this.assignmentSvc.assign(this.propertyId, req).subscribe({
      next: (res) => {
        if (res.data) this.assignments = [res.data, ...this.assignments];
        this.assignSubmitting = false;
        this.showAssignForm = false;
        this.snack.success(this.i18n.instant('MAINTENANCE_ASSIGNMENT.ASSIGN_SUCCESS'));
        // Reload contracts if COMPANY assignment was made
        if (req.providerType === 'COMPANY' && this.propertyId) {
          this.loadContracts(this.propertyId);
        }
      },
      error: (err: Error) => {
        this.assignSubmitting = false;
        this.snack.error(err.message || this.i18n.instant('MAINTENANCE_ASSIGNMENT.ASSIGN_ERROR'));
      }
    });
  }

  endAssignment(assignment: MaintenanceAssignment): void {
    if (!this.propertyId) return;
    this.assignmentSvc.endAssignment(this.propertyId, assignment.assignmentId).subscribe({
      next: (res) => {
        if (res.data) {
          this.assignments = this.assignments.map((a) =>
            a.assignmentId === assignment.assignmentId ? res.data! : a
          );
        }
        this.snack.success(this.i18n.instant('MAINTENANCE_ASSIGNMENT.END_SUCCESS'));
      },
      error: (err: Error) => {
        this.snack.error(err.message || this.i18n.instant('MAINTENANCE_ASSIGNMENT.END_ERROR'));
      }
    });
  }

  assignmentProviderLabel(a: MaintenanceAssignment): string {
    if (a.providerType === 'USER') return a.userFullName || String(a.userId);
    if (a.providerType === 'COMPANY') {
      if (this.i18n.currentLang === 'ar') return a.companyNameAr || a.companyName || String(a.companyId);
      return a.companyNameEn || a.companyName || String(a.companyId);
    }
    return '-';
  }

  contractCompanyLabel(c: MaintenanceContractResponse): string {
    if (this.i18n.currentLang === 'ar') return c.contractorCompanyNameAr || c.contractorCompanyName || String(c.contractorCompanyId);
    return c.contractorCompanyNameEn || c.contractorCompanyName || String(c.contractorCompanyId);
  }

  toggleContractInvoices(contract: MaintenanceContractResponse): void {
    if (this.expandedContractId === contract.contractId) {
      this.expandedContractId = null;
      return;
    }
    this.expandedContractId = contract.contractId;
    if (!this.invoicesByContract[contract.contractId]) {
      this.invoicesLoading[contract.contractId] = true;
      this.invoiceSvc.listByContract(contract.contractId).subscribe({
        next: (res) => {
          this.invoicesByContract[contract.contractId] = res.data ?? [];
          this.invoicesLoading[contract.contractId] = false;
        },
        error: () => { this.invoicesLoading[contract.contractId] = false; }
      });
    }
  }

  generateInvoices(contract: MaintenanceContractResponse): void {
    this.generatingInvoices[contract.contractId] = true;
    this.invoiceSvc.generateMonthlyInvoices(contract.contractId).subscribe({
      next: (res) => {
        const existing = this.invoicesByContract[contract.contractId] ?? [];
        const newInvs = res.data ?? [];
        const merged = [...existing, ...newInvs].filter(
          (v, i, arr) => arr.findIndex((x) => x.invoiceId === v.invoiceId) === i
        );
        this.invoicesByContract[contract.contractId] = merged.sort(
          (a, b) => a.invoiceYear !== b.invoiceYear ? a.invoiceYear - b.invoiceYear : a.invoiceMonth - b.invoiceMonth
        );
        this.expandedContractId = contract.contractId;
        this.generatingInvoices[contract.contractId] = false;
        // Update invoice count on the contract object
        const idx = this.contracts.findIndex((c) => c.contractId === contract.contractId);
        if (idx >= 0) {
          this.contracts[idx] = { ...this.contracts[idx], invoiceCount: this.invoicesByContract[contract.contractId].length };
        }
        this.snack.success(this.i18n.instant('MAINTENANCE_CONTRACT.INVOICES_GENERATED', { count: newInvs.length }));
      },
      error: (err: Error) => {
        this.generatingInvoices[contract.contractId] = false;
        this.snack.error(err.message || this.i18n.instant('MAINTENANCE_CONTRACT.GENERATE_ERROR'));
      }
    });
  }

  openMaintenanceInvoice(contractId: number, invoice: MaintenanceContractInvoiceResponse): void {
    void this.router.navigate(['/admin/contracts/maintenance', contractId], {
      queryParams: { invoiceId: invoice.invoiceId }
    });
  }

  cancelInvoice(contractId: number, invoice: MaintenanceContractInvoiceResponse): void {
    this.invoiceSvc.cancel(invoice.invoiceId).subscribe({
      next: (res) => {
        if (res.data) {
          this.invoicesByContract[contractId] = (this.invoicesByContract[contractId] ?? []).map(
            (inv) => inv.invoiceId === invoice.invoiceId ? res.data! : inv
          );
        }
        this.snack.success(this.i18n.instant('MAINTENANCE_CONTRACT.INVOICE_CANCELLED'));
      },
      error: (err: Error) => { this.snack.error(err.message || this.i18n.instant('MAINTENANCE_CONTRACT.INVOICE_ERROR')); }
    });
  }

  terminateContract(contract: MaintenanceContractResponse): void {
    this.contractSvc.terminate(contract.contractId).subscribe({
      next: (res) => {
        if (res.data) {
          this.contracts = this.contracts.map((c) => c.contractId === contract.contractId ? res.data! : c);
        }
        this.snack.success(this.i18n.instant('MAINTENANCE_CONTRACT.TERMINATED'));
      },
      error: (err: Error) => {
        this.snack.error(err.message || this.i18n.instant('MAINTENANCE_CONTRACT.TERMINATE_ERROR'));
        this.cdr.markForCheck();
      }
    });
  }

  invoiceMonthName(inv: MaintenanceContractInvoiceResponse): string {
    return this.invoiceSvc.monthName(inv.invoiceMonth, this.i18n.currentLang);
  }

  close(): void {
    if (this.isDialogMode) {
      this.dialogRef?.close(false);
      return;
    }
    void this.router.navigateByUrl('/admin/properties');
  }

  submit(): void {
    if (this.isViewMode || this.submitting) return;

    this.form.markAllAsTouched();
    this.ownerTouched = true;
    this.cdr.markForCheck();

    if (this.selectedOwners.length === 0) {
      this.snack.error(this.i18n.instant('PROPERTY_FORM.OWNER_REQUIRED'));
      return;
    }
    const pctSum = this.selectedOwners.reduce((s, o) => s + (o.ownershipPercentage ?? 0), 0);
    if (Math.abs(pctSum - 100) > 0.01) {
      this.snack.error(this.i18n.instant('PROPERTY_FORM.OWNER_PERCENT_SUM_INVALID'));
      return;
    }

    if (this.form.invalid) {
      const missing: string[] = [];
      if (this.form.get('propertyNameAr')?.invalid) missing.push('اسم العقار (عربي)');
      if (this.form.get('propertyNameEn')?.invalid) missing.push('اسم العقار (إنجليزي)');
      if (this.form.get('address')?.invalid) missing.push(this.i18n.instant('PROPERTY_FORM.ADDRESS'));
      if (this.form.get('cityId')?.invalid) missing.push(this.i18n.instant('PROPERTY_FORM.CITY'));
      const msg = missing.length > 0
        ? 'الحقول المطلوبة: ' + missing.join(' ، ')
        : this.i18n.instant('COMMON.REQUIRED');
      this.snack.error(msg);
      return;
    }

    const raw = this.form.getRawValue();
    const selectedCity = this.cities.find((city) => city.id === raw.cityId);
    if (!selectedCity || !this.omanCountry) {
      this.snack.error(this.i18n.instant('PROPERTY_FORM.LOCATION_REQUIRED'));
      return;
    }

    const payload = {
      ownerIds: this.selectedOwners.map((o) => o.id),
      ownerShares: this.selectedOwners.map((o) => ({
        ownerId: o.id,
        ownershipPercentage: o.ownershipPercentage
      })),
      propertyName: raw.propertyNameAr || raw.propertyName || raw.propertyNameEn,
      propertyNameAr: raw.propertyNameAr || raw.propertyName,
      propertyNameEn: raw.propertyNameEn || raw.propertyName,
      propertyCode: (raw.propertyCode && String(raw.propertyCode).trim()) || undefined,
      propertyType: raw.propertyType,
      address: raw.address,
      city: selectedCity.nameAr,
      country: this.omanCountry.nameAr,
      googleMapUrl: raw.googleMapUrl || undefined,
      coverImageUrl: (this.coverUploadUrls[0] || raw.coverImageUrl || '').trim() || undefined,
      coverImageUrls: this.coverUploadUrls.length > 0 ? [...this.coverUploadUrls] : undefined,
      totalFloors: raw.totalFloors,
      floorUnitsConfig: this.floorUnitsConfig,
      description: raw.description,
      ownerDocumentFiles: [...this.ownerDocumentUrls],
      maintenanceProviderType: this.selectedMaintenanceProviders.length > 0 ? this.maintenanceProviderType : undefined,
      maintenanceProviderIds: this.selectedMaintenanceProviders.length > 0
        ? this.selectedMaintenanceProviders.map((p) => p.id)
        : undefined,
      legalEntityId: raw.legalEntityId || undefined
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
        this.cdr.markForCheck();
      },
      error: (err: Error) => {
        this.submitting = false;
        this.snack.error(err.message || this.i18n.instant('PROPERTY_FORM.SAVE_ERROR'));
        this.cdr.markForCheck();
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
              this.loadProperty(this.propertyId);
            }
            this.cdr.markForCheck();
          },
          error: () => {
            this.loadingLookups = false;
            this.snack.error(this.i18n.instant('PROPERTY_FORM.LOAD_LOCATION_ERROR'));
            this.cdr.markForCheck();
          }
        });
      },
      error: () => {
        this.loadingLookups = false;
        this.snack.error(this.i18n.instant('PROPERTY_FORM.LOAD_LOCATION_ERROR'));
        this.cdr.markForCheck();
      }
    });
  }

  private loadLegalEntities(): void {
    this.legalEntitySvc.getAll().subscribe({
      next: (res) => { this.legalEntities = res.data ?? []; this.cdr.markForCheck(); },
      error: () => { this.legalEntities = []; }
    });
  }

  private loadPropertyTypes(): void {
    this.lookupSvc.getByType('PROPERTY_TYPE').subscribe({
      next: (res) => {
        this.propertyTypes = res.data ?? [];
        const currentType = this.form.get('propertyType')?.value;
        if (!currentType && this.propertyTypes.length) {
          this.form.patchValue({ propertyType: this.propertyTypes[0].code }, { emitEvent: false });
        }
      },
      error: () => {
        this.propertyTypes = [];
        this.cdr.markForCheck();
      }
    });
  }

  private loadPropertyStatuses(): void {
    this.lookupSvc.getByType('PROPERTY_STATUS').subscribe({
      next: (res) => {
        this.propertyStatuses = res.data ?? [];
      },
      error: () => {
        this.propertyStatuses = [];
        this.cdr.markForCheck();
      }
    });
  }

  tenantDisplayName(t: Tenant): string {
    return this.i18n.currentLang === 'ar' ? (t.fullNameAr || t.fullName) : (t.fullNameEn || t.fullName);
  }

  unitNumberForTenant(t: Tenant): string {
    if (!t.unitId) return '—';
    const u = this.propertyUnits.find((x) => x.id === t.unitId);
    return u?.unitNumber || `#${t.unitId}`;
  }

  private loadPropertyUnitsAndTenants(propertyId: number): void {
    this.unitsTenantsLoading = true;
    this.propertyUnits = [];
    this.propertyTenants = [];
    forkJoin({
      units: this.unitSvc.getByProperty(propertyId, 0, 500).pipe(
        catchError(() => of({ data: { content: [] as Unit[] } } as ApiResponse<PagedResponse<Unit>>))
      ),
      tenants: this.tenantSvc.getAll(0, 500, '', propertyId).pipe(
        catchError(() => of({ data: { content: [] as Tenant[] } } as ApiResponse<PagedResponse<Tenant>>))
      )
    }).subscribe({
      next: ({ units, tenants }) => {
        this.propertyUnits = units.data?.content ?? [];
        this.liveUnitCount = this.propertyUnits.length;
        this.propertyTenants = tenants.data?.content ?? [];
        this.unitsTenantsLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.liveUnitCount = null;
        this.unitsTenantsLoading = false;
        this.cdr.markForCheck();
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
        this.loadPropertyUnitsAndTenants(property.id);
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
          legalEntityId: property.legalEntityId ?? null
        });
        if (property.maintenanceProviders && property.maintenanceProviders.length > 0) {
          this.maintenanceProviderType = property.maintenanceProviders[0].providerType;
          this.selectedMaintenanceProviders = property.maintenanceProviders.map((mp) => ({
            id: mp.id,
            name: mp.name,
            providerType: mp.providerType
          }));
        }
        const owners = property.owners ?? [];
        const defaultPct = owners.length > 0 ? Math.round((100 / owners.length) * 100) / 100 : 100;
        this.selectedOwners = owners.map((o, idx) => ({
          id: o.id,
          fullName: o.fullName,
          fullNameAr: o.fullNameAr,
          fullNameEn: o.fullNameEn,
          nationalId: o.nationalId,
          phone: o.phone,
          email: o.email,
          active: true,
          portalAccess: false,
          ownershipPercentage: o.ownershipPercentage ?? (idx === owners.length - 1
            ? Math.round((100 - defaultPct * (owners.length - 1)) * 100) / 100
            : defaultPct)
        }));
        this.floorUnitsConfig = (property as any).floorUnitsConfig || {};
        this.ownerDocumentUrls = property.ownerDocumentFiles ?? [];
        const coverUrls = (property as any).coverImageUrls as string[] | undefined;
        if (coverUrls && coverUrls.length > 0) {
          this.coverUploadUrls = coverUrls.filter((u: string) => u && u.trim());
        } else {
          const cover = (property.coverImageUrl || '').trim();
          this.coverUploadUrls = cover ? [cover] : [];
        }
        this.loading = false;
        this.loadAttachments(id);
        this.loadAssignments(id);
        this.loadContracts(id);
        this.cdr.markForCheck();
      },
      error: (err: Error) => {
        this.loading = false;
        this.snack.error(err.message || this.i18n.instant('PROPERTY_LIST.LOAD_ERROR'));
        this.cdr.markForCheck();
      }
    });
  }

  private loadContractorCompanies(): void {
    this.contractorCompanySvc.list(true).subscribe({
      next: (res) => {
        this.contractorCompanies = (res.data ?? []).filter((company) => company.active);
        this.maintenanceCompanies = this.contractorCompanies; // same source
      },
      error: () => {
        this.contractorCompanies = [];
        this.maintenanceCompanies = [];
      }
    });
  }

  private loadMaintenanceOfficers(): void {
    this.userSvc.getAll(0, 200, undefined, 'MAINTENANCE_OFFICER_INTERNAL').subscribe({
      next: (res) => {
        this.internalOfficerOptions = (res.data?.content ?? []).filter((u) => u.isActive !== false);
        this.cdr.markForCheck();
      },
      error: () => { this.internalOfficerOptions = []; }
    });
  }

  private loadAttachments(propertyId: number): void {
    this.attachmentSvc.list(propertyId).subscribe({
      next: (res) => { this.attachments = res.data ?? []; },
      error: () => { this.attachments = []; }
    });
  }

  private loadAssignments(propertyId: number): void {
    this.assignmentsLoading = true;
    this.assignmentSvc.list(propertyId).subscribe({
      next: (res) => { this.assignments = res.data ?? []; this.assignmentsLoading = false; },
      error: () => { this.assignments = []; this.assignmentsLoading = false; }
    });
  }

  private loadContracts(propertyId: number): void {
    this.contractsLoading = true;
    this.contractSvc.listByProperty(propertyId).subscribe({
      next: (res) => { this.contracts = res.data ?? []; this.contractsLoading = false; },
      error: () => { this.contracts = []; this.contractsLoading = false; }
    });
  }

  openMaintenanceContractDialog(): void {
    if (!this.propertyId) return;
    void this.router.navigate(['/admin/contracts/list'], {
      queryParams: { propertyId: this.propertyId, type: 'MAINTENANCE', openDialog: '1' }
    });
  }

  private loadOwners(): void {
    this.ownersLoading = true;
    this.ownerSvc.getAll(0, 200).subscribe({
      next: (res: ApiResponse<PagedResponse<Owner>>) => {
        this.owners = res.data?.content || [];
        this.ownersLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.owners = [];
        this.ownersLoading = false;
        this.cdr.markForCheck();
      }
    });
  }
}
