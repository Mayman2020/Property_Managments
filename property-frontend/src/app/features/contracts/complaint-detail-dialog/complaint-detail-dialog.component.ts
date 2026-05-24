import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, of } from 'rxjs';

import { ComplaintService } from '../../../core/services/complaint.service';
import { ComplaintDetail } from '../../../core/models/contract.model';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LookupCacheService } from '../../../core/services/lookup-cache.service';
import { PermissionService } from '../../../core/services/permission.service';

export interface ComplaintDetailDialogData {
  complaintId: number;
}

@Component({
  selector: 'app-complaint-detail-dialog',
  standalone: true,
  imports: [
    NgIf, NgFor, NgClass, DatePipe, RouterLink,
    MatButtonModule, MatDialogModule, MatIconModule,
    MatProgressSpinnerModule, MatTooltipModule, TranslateModule
  ],
  templateUrl: './complaint-detail-dialog.component.html',
  styleUrl: './complaint-detail-dialog.component.scss'
})
export class ComplaintDetailDialogComponent implements OnInit {
  loading = true;
  acting = false;
  changed = false;
  complaint: ComplaintDetail | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) readonly data: ComplaintDetailDialogData,
    private readonly dialogRef: MatDialogRef<ComplaintDetailDialogComponent>,
    private readonly complaintSvc: ComplaintService,
    readonly i18n: I18nService,
    readonly lookupCache: LookupCacheService,
    readonly permissions: PermissionService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading = true;
    this.complaintSvc.getById(this.data.complaintId).pipe(catchError(() => of(null))).subscribe(res => {
      this.complaint = res?.data ?? null;
      this.loading = false;
    });
  }

  close(): void {
    this.dialogRef.close(this.changed);
  }

  canResolve(): boolean {
    return (this.permissions.can('contracts', 'approve') || this.permissions.can('contracts', 'edit'))
      && !!this.complaint
      && this.complaint.status !== 'RESOLVED'
      && this.complaint.status !== 'CLOSED';
  }

  canCreateMaintenance(): boolean {
    return !!this.complaint
      && !this.complaint.maintenanceRequestId
      && (this.complaint.status === 'OPEN' || this.complaint.status === 'IN_REVIEW');
  }

  resolve(): void {
    if (!this.complaint || this.acting) return;
    this.acting = true;
    this.complaintSvc.resolve(this.complaint.id).subscribe({
      next: () => {
        this.changed = true;
        this.acting = false;
        this.load();
      },
      error: () => { this.acting = false; }
    });
  }

  createMaintenanceRequest(): void {
    if (!this.complaint || this.acting) return;
    this.acting = true;
    this.complaintSvc.createMaintenanceRequest(this.complaint.id).subscribe({
      next: () => {
        this.changed = true;
        this.acting = false;
        this.load();
      },
      error: () => { this.acting = false; }
    });
  }

  tenantDisplayName(): string {
    if (!this.complaint) return '—';
    const ar = this.i18n.currentLang === 'ar';
    return ar
      ? (this.complaint.tenantNameAr || this.complaint.tenantNameEn || this.complaint.tenantName || '—')
      : (this.complaint.tenantNameEn || this.complaint.tenantNameAr || this.complaint.tenantName || '—');
  }

  propertyDisplayName(): string {
    if (!this.complaint) return '—';
    const ar = this.i18n.currentLang === 'ar';
    return ar
      ? (this.complaint.propertyNameAr || this.complaint.propertyNameEn || this.complaint.propertyName || '—')
      : (this.complaint.propertyNameEn || this.complaint.propertyNameAr || this.complaint.propertyName || '—');
  }

  complaintDisplayTitle(): string {
    if (!this.complaint) return '—';
    const title = (this.complaint.title || '').trim();
    if (title && !/^Complaint\s[A-Z]+-\d/i.test(title)) {
      return title;
    }
    return this.complaintTypeLabel(this.complaint.complaintType);
  }

  complaintTypeLabel(code?: string | null): string {
    return this.lookupCache.label('COMPLAINT_TYPE', code) || code || '—';
  }

  statusLabel(code?: string | null): string {
    return this.lookupCache.label('COMPLAINT_STATUS', code) || code || '—';
  }

  priorityLabel(code?: string | null): string {
    return this.lookupCache.label('COMPLAINT_PRIORITY', code) || code || '—';
  }

  contractStatusLabel(code?: string | null): string {
    if (!code) return '—';
    const key = `CONTRACTS.STATUS_${code}`;
    const translated = this.i18n.instant(key);
    return translated !== key ? translated : code;
  }

  getPriorityClass(code?: string | null): string {
    const m: Record<string, string> = { URGENT: 'chip-danger', HIGH: 'chip-warn', NORMAL: 'chip-info', LOW: 'chip-default' };
    return m[code ?? ''] ?? 'chip-default';
  }

  getStatusClass(code?: string | null): string {
    const m: Record<string, string> = { OPEN: 'chip-warn', IN_REVIEW: 'chip-info', RESOLVED: 'chip-success', CLOSED: 'chip-default' };
    return m[code ?? ''] ?? 'chip-default';
  }
}
