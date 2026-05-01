import { AfterViewInit, ChangeDetectorRef, Component, Inject, OnInit, Optional } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe, DecimalPipe, NgFor, NgIf, NgTemplateOutlet } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TranslateModule } from '@ngx-translate/core';

import { PropertyService } from '../../../core/services/property.service';
import { UserService } from '../../../core/services/user.service';
import { ContractorCompany, ContractorCompanyService } from '../../../core/services/contractor-company.service';
import { User } from '../../../core/models/user.model';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LookupItem, LookupService } from '../../../core/services/lookup.service';
import { PropertyAttachment, PropertyAttachmentService } from '../../../core/services/property-attachment.service';
import { MaintenanceAssignment, MaintenanceAssignmentService } from '../../../core/services/maintenance-assignment.service';
import { MaintenanceContractResponse, MaintenanceContractService } from '../../../core/services/maintenance-contract.service';
import { MaintenanceContractInvoiceResponse, MaintenanceContractInvoiceService } from '../../../core/services/maintenance-contract-invoice.service';
import { AuthService } from '../../../core/services/auth.service';
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
    DecimalPipe,
    FormsModule,
    NgFor,
    NgIf,
    NgTemplateOutlet,
    ReactiveFormsModule,
    RouterLink,
    TranslateModule,
    MatButtonModule,
    MatCheckboxModule,
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
    propertyType: string;
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

  propertyTypes: LookupItem[] = [];

  constructor(
    private readonly fb: FormBuilder,
    private readonly propertySvc: PropertyService,
    private readonly userSvc: UserService,
    private readonly contractorCompanySvc: ContractorCompanyService,
    private readonly lookupSvc: LookupService,
    private readonly snack: SnackService,
    readonly i18n: I18nService,
    private readonly attachmentSvc: PropertyAttachmentService,
    private readonly assignmentSvc: MaintenanceAssignmentService,
    private readonly contractSvc: MaintenanceContractService,
    private readonly invoiceSvc: MaintenanceContractInvoiceService,
    private readonly authSvc: AuthService,
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
    // propertyCode is backend-generated; do not validate or send in create payload

    this.loadLocationLookups();
    this.loadPropertyTypes();
    this.loadPropertyStatuses();
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
    this.attachmentSvc.delete(this.propertyId, att.id).subscribe({
      next: () => {
        this.attachments = this.attachments.filter((a) => a.id !== att.id);
      },
      error: () => {
        this.snack.error(this.i18n.instant('PROPERTY_FORM.ATTACHMENT_DELETE_ERROR'));
      }
    });
  }

  get canManageAssignments(): boolean {
    const role = this.authSvc.getRole();
    return role === 'SUPER_ADMIN' || role === 'PROPERTY_ADMIN';
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

  markInvoicePaid(contractId: number, invoice: MaintenanceContractInvoiceResponse): void {
    this.invoiceSvc.markPaid(invoice.invoiceId).subscribe({
      next: (res) => {
        if (res.data) {
          this.invoicesByContract[contractId] = (this.invoicesByContract[contractId] ?? []).map(
            (inv) => inv.invoiceId === invoice.invoiceId ? res.data! : inv
          );
        }
        this.snack.success(this.i18n.instant('MAINTENANCE_CONTRACT.INVOICE_PAID'));
      },
      error: (err: Error) => { this.snack.error(err.message || this.i18n.instant('MAINTENANCE_CONTRACT.INVOICE_ERROR')); }
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
      error: (err: Error) => { this.snack.error(err.message || this.i18n.instant('MAINTENANCE_CONTRACT.TERMINATE_ERROR')); }
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
        this.loadAttachments(id);
        this.loadAssignments(id);
        this.loadContracts(id);
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
        this.maintenanceCompanies = this.contractorCompanies; // same source
      },
      error: () => {
        this.contractorCompanies = [];
        this.maintenanceCompanies = [];
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
}
