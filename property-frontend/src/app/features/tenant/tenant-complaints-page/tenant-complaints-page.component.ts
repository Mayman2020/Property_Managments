import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { DEFAULT_TABLE_PAGE_SIZE, paginatedSlice } from '../../../core/utils/pagination.util';
import { ComplaintService } from '../../../core/services/complaint.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ApiService } from '../../../core/services/api.service';
import { AppConstants } from '../../../core/constants/app-constants';
import { LookupCacheService } from '../../../core/services/lookup-cache.service';
import { LookupItem } from '../../../core/services/lookup.service';

export type RatingValue = 'VERY_SATISFIED' | 'SATISFIED' | 'DISSATISFIED' | 'VERY_DISSATISFIED';

export const RATINGS: { value: RatingValue; emoji: string; labelAr: string; labelEn: string }[] = [
  { value: 'VERY_SATISFIED', emoji: '😄', labelAr: 'راضٍ جداً',     labelEn: 'Very Satisfied' },
  { value: 'SATISFIED',      emoji: '😊', labelAr: 'راضٍ',           labelEn: 'Satisfied' },
  { value: 'DISSATISFIED',   emoji: '😕', labelAr: 'مستاء',          labelEn: 'Dissatisfied' },
  { value: 'VERY_DISSATISFIED', emoji: '😢', labelAr: 'مستاء جداً', labelEn: 'Very Dissatisfied' },
];

export interface ActiveUnit {
  contractId: number;
  unitId: number;
  unitNumber: string;
  propertyId: number;
  propertyName: string;
  propertyNameAr: string;
}

export interface ComplaintAttachment {
  fileUrl: string;
  fileType?: string;
  fileName?: string;
  fileSizeKb?: number;
}

@Component({
  selector: 'app-tenant-complaints-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatTabsModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatTooltipModule, TranslateModule, PageHeaderComponent, TablePagerComponent,
  ],
  templateUrl: './tenant-complaints-page.component.html',
  styleUrls: ['./tenant-complaints-page.component.scss'],
})
export class TenantComplaintsPageComponent implements OnInit {

  complaints: any[] = [];
  loading = false;
  readonly pageSize = DEFAULT_TABLE_PAGE_SIZE;
  activePageIndex = 0;
  historyPageIndex = 0;

  // Detail panel
  selected: any = null;
  detailLoading = false;
  replyText = '';
  replySending = false;
  closing = false;

  // New complaint dialog
  showNewDialog = false;
  newModel = { subject: '', category: '', description: '', unitId: null as number | null, propertyId: null as number | null };
  submitting = false;

  // Active units for pre-fill
  activeUnits: ActiveUnit[] = [];
  unitsLoading = false;
  selectedUnit: ActiveUnit | null = null;

  // File upload
  uploadingFiles = false;
  newAttachments: ComplaintAttachment[] = [];
  readonly MAX_FILES = 5;

  // Rating dialog
  showRatingDialog = false;
  ratingForId: number | null = null;
  selectedRating: RatingValue | null = null;
  ratingSending = false;
  private pendingComplaintId: number | null = null;

  readonly RATINGS = RATINGS;

  constructor(
    private readonly complaintSvc: ComplaintService,
    private readonly snack: SnackService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly api: ApiService,
    readonly i18n: I18nService,
    private readonly lookupCache: LookupCacheService,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const id = Number(params.get('complaintId'));
      this.pendingComplaintId = Number.isFinite(id) && id > 0 ? id : null;
      this.tryOpenPendingComplaint();
    });
    this.lookupCache.preload('COMPLAINT_TYPE', 'COMPLAINT_STATUS').subscribe(() => this.load());
  }

  load(): void {
    this.loading = true;
    this.complaintSvc.getMy().subscribe({
      next: (res: any) => {
        this.complaints = res?.data ?? res ?? [];
        this.loading = false;
        this.tryOpenPendingComplaint();
      },
      error: () => { this.loading = false; },
    });
  }

  private tryOpenPendingComplaint(): void {
    if (this.pendingComplaintId == null || this.loading) return;
    const onPage = this.complaints.find((c) => c.id === this.pendingComplaintId);
    if (onPage) {
      this.openDetail(onPage);
      this.pendingComplaintId = null;
      return;
    }
    const id = this.pendingComplaintId;
    this.complaintSvc.getById(id).subscribe({
      next: (res: any) => {
        const complaint = res?.data ?? res;
        if (complaint?.id) {
          this.openDetail(complaint);
        }
        this.pendingComplaintId = null;
      },
      error: () => { this.pendingComplaintId = null; },
    });
  }

  get activeComplaints()   { return this.complaints.filter(c => ['OPEN','IN_REVIEW'].includes(c.status)); }
  get previousComplaints() { return this.complaints.filter(c => ['RESOLVED','CLOSED'].includes(c.status)); }

  get pagedActiveComplaints() {
    return paginatedSlice(this.activeComplaints, this.activePageIndex, this.pageSize);
  }

  get pagedPreviousComplaints() {
    return paginatedSlice(this.previousComplaints, this.historyPageIndex, this.pageSize);
  }

  // ── Status helpers ────────────────────────────────────────────────────

  statusLabel(s: string): string {
    const lookupLabel = this.lookupCache.label('COMPLAINT_STATUS', s);
    if (lookupLabel && lookupLabel !== s) return lookupLabel;
    const map: Record<string, string> = {
      OPEN:       this.i18n.instant('INLINE_TEXT.OPEN'),
      IN_REVIEW:  this.i18n.instant('INLINE_TEXT.IN_REVIEW'),
      RESOLVED:   this.i18n.instant('INLINE_TEXT.RESOLVED'),
      CLOSED:     this.i18n.instant('INLINE_TEXT.CLOSED_2'),
    };
    return map[s] ?? s;
  }

  typeLabel(t: string): string {
    if (!t) return '-';
    return this.lookupCache.label('COMPLAINT_TYPE', t) || t;
  }

  get complaintTypes(): LookupItem[] {
    return this.lookupCache.items('COMPLAINT_TYPE');
  }

  lookupItemLabel(item: LookupItem): string {
    return this.i18n.currentLang === 'ar' ? item.nameAr : item.nameEn;
  }

  ratingLabel(r: string): string {
    return RATINGS.find(x => x.value === r)?.labelAr ?? r;
  }

  ratingEmoji(r: string): string {
    return RATINGS.find(x => x.value === r)?.emoji ?? '';
  }

  canClose(c: any): boolean { return ['OPEN','IN_REVIEW'].includes(c?.status); }
  canRate(c: any): boolean  { return ['CLOSED','RESOLVED'].includes(c?.status) && !c?.rating; }

  // ── Unit pre-fill ─────────────────────────────────────────────────────

  unitLabel(u: ActiveUnit): string {
    const prop = (this.i18n.currentLang === 'ar' && u.propertyNameAr) ? u.propertyNameAr : (u.propertyName ?? '');
    return `${u.unitNumber} — ${prop}`;
  }

  onUnitSelect(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    const unit = this.activeUnits.find(u => String(u.unitId) === val) ?? null;
    this.selectedUnit = unit;
    this.newModel.unitId = unit?.unitId ?? null;
    this.newModel.propertyId = unit?.propertyId ?? null;
  }

  // ── New complaint ─────────────────────────────────────────────────────

  openNew(): void {
    this.newModel = { subject: '', category: '', description: '', unitId: null, propertyId: null };
    this.newAttachments = [];
    this.selectedUnit = null;
    this.showNewDialog = true;
    this.loadActiveUnits();
  }

  private loadActiveUnits(): void {
    this.unitsLoading = true;
    this.complaintSvc.getMyActiveUnits().subscribe({
      next: (res: any) => {
        this.activeUnits = res?.data ?? res ?? [];
        if (this.activeUnits.length === 1) {
          this.selectedUnit = this.activeUnits[0];
          this.newModel.unitId = this.activeUnits[0].unitId;
          this.newModel.propertyId = this.activeUnits[0].propertyId;
        }
        this.unitsLoading = false;
      },
      error: () => { this.unitsLoading = false; },
    });
  }

  // ── File upload ────────────────────────────────────────────────────────

  onFilePick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;

    const remaining = this.MAX_FILES - this.newAttachments.length;
    const toUpload = files.slice(0, remaining);

    this.uploadingFiles = true;
    let done = 0;

    toUpload.forEach(file => {
      const form = new FormData();
      form.append('file', file);
      this.api.postFormData<any>(AppConstants.API.FILES_UPLOAD, form).subscribe({
        next: (res: any) => {
          const url = res?.data?.url ?? res?.url ?? '';
          if (url) {
            const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
            const fileType = ['jpg','jpeg','png','gif','webp','bmp','avif'].includes(ext) ? 'IMAGE' : 'DOCUMENT';
            this.newAttachments = [...this.newAttachments, {
              fileUrl: url,
              fileType,
              fileName: file.name,
              fileSizeKb: Math.round(file.size / 1024),
            }];
          }
          if (++done === toUpload.length) this.uploadingFiles = false;
        },
        error: () => { if (++done === toUpload.length) this.uploadingFiles = false; },
      });
    });

    input.value = '';
  }

  removeAttachment(index: number): void {
    this.newAttachments = this.newAttachments.filter((_, i) => i !== index);
  }

  fileIcon(a: ComplaintAttachment): string {
    return a.fileType === 'IMAGE' ? 'image' : 'description';
  }

  isImage(a: ComplaintAttachment): boolean {
    return a.fileType === 'IMAGE';
  }

  submitNew(form: NgForm): void {
    if (form.invalid || this.submitting || this.uploadingFiles) return;
    this.submitting = true;
    this.complaintSvc.create({
      title: this.newModel.subject,
      complaintType: this.newModel.category || null,
      description: this.newModel.description,
      unitId: this.newModel.unitId ?? null,
      propertyId: this.newModel.propertyId ?? null,
      attachments: this.newAttachments,
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.showNewDialog = false;
        this.snack.success(this.i18n.instant('COMPLAINT.SUBMITTED_SUCCESS'));
        this.load();
      },
      error: () => { this.submitting = false; this.snack.error(this.i18n.instant('COMMON.ERROR')); },
    });
  }

  // ── Detail panel ──────────────────────────────────────────────────────

  openDetail(c: any): void {
    this.selected = null;
    this.replyText = '';
    this.detailLoading = true;
    this.complaintSvc.getById(c.id).subscribe({
      next: (res: any) => { this.selected = res?.data ?? res; this.detailLoading = false; },
      error: () => { this.detailLoading = false; },
    });
  }

  closePanel(): void { this.selected = null; }

  // ── Close complaint ───────────────────────────────────────────────────

  closeComplaint(): void {
    if (!this.selected || this.closing) return;
    this.closing = true;
    this.complaintSvc.close(this.selected.id).subscribe({
      next: (res: any) => {
        this.closing = false;
        const updated = res?.data ?? res;
        this.selected = { ...this.selected, status: updated.status, resolvedAt: updated.resolvedAt };
        this.snack.success(this.i18n.instant('INLINE_TEXT.COMPLAINT_CLOSED'));
        this.load();
        this.ratingForId = this.selected.id;
        this.selectedRating = null;
        this.showRatingDialog = true;
      },
      error: () => { this.closing = false; this.snack.error(this.i18n.instant('COMMON.ERROR')); },
    });
  }

  // ── Rating ────────────────────────────────────────────────────────────

  openRating(c: any): void {
    this.ratingForId = c.id;
    this.selectedRating = null;
    this.showRatingDialog = true;
  }

  submitRating(): void {
    if (!this.selectedRating || !this.ratingForId || this.ratingSending) return;
    this.ratingSending = true;
    this.complaintSvc.submitRating(this.ratingForId, this.selectedRating).subscribe({
      next: () => {
        this.ratingSending = false;
        this.showRatingDialog = false;
        this.snack.success(this.i18n.instant('COMPLAINT.RATING_SUBMITTED'));
        this.load();
        if (this.selected?.id === this.ratingForId) {
          this.selected = { ...this.selected, rating: { rating: this.selectedRating } };
        }
      },
      error: () => { this.ratingSending = false; this.snack.error(this.i18n.instant('COMMON.ERROR')); },
    });
  }

  skipRating(): void { this.showRatingDialog = false; }

  goBack(): void { void this.router.navigate(['/tenant/my-unit']); }
}
