import { Component, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TenantPortalService } from '../../../core/services/tenant-portal.service';
import { AuthService } from '../../../core/services/auth.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LeaseContract } from '../../../core/models/contract.model';

@Component({
  selector: 'app-my-contract',
  standalone: true,
  imports: [
    NgFor, NgIf, DatePipe, DecimalPipe, RouterLink,
    TranslateModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    PageHeaderComponent
  ],
  templateUrl: './my-contract.component.html',
  styleUrl: './my-contract.component.scss'
})
export class MyContractComponent implements OnInit {
  loading = true;
  contract: LeaseContract | null = null;
  error = false;

  leaseContractFiles: string[] = [];

  constructor(
    private readonly portalSvc: TenantPortalService,
    private readonly auth: AuthService,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.leaseContractFiles = this.auth.getCurrentUser()?.leaseContractFiles ?? [];
    this.portalSvc.getMyContract().subscribe({
      next: res => { this.contract = res.data ?? null; this.loading = false; },
      error: () => { this.error = true; this.loading = false; }
    });
  }

  get daysLabel(): string {
    if (!this.contract) return '';
    const d = this.contract.daysUntilExpiry;
    if (d < 0) return this.i18n.instant('TENANT.CONTRACT_EXPIRES_EXPIRED');
    if (d === 0) return this.i18n.instant('TENANT.CONTRACT_EXPIRES_TODAY');
    return this.i18n.instant('TENANT.CONTRACT_DAYS_REMAINING', { days: d });
  }

  get expiryClass(): string {
    if (!this.contract) return '';
    const d = this.contract.daysUntilExpiry;
    if (d < 0) return 'expired';
    if (d <= 30) return 'critical';
    if (d <= 60) return 'warning';
    return 'ok';
  }

  statusLabel(s: string): string { return this.i18n.instant(`CONTRACT_STATUS.${s}`); }

  documentName(url: string): string {
    try {
      const decoded = decodeURIComponent(url.split('/').pop() ?? 'Document');
      return decoded || 'Document';
    } catch {
      return 'Document';
    }
  }
}
