import { Component, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TenantPortalService } from '../../../core/services/tenant-portal.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LeaseContract } from '../../../core/models/contract.model';

@Component({
  selector: 'app-my-contract',
  standalone: true,
  imports: [
    NgIf, DatePipe, DecimalPipe, RouterLink,
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

  constructor(
    private readonly portalSvc: TenantPortalService,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.portalSvc.getMyContract().subscribe({
      next: res => { this.contract = res.data ?? null; this.loading = false; },
      error: () => { this.error = true; this.loading = false; }
    });
  }

  get daysLabel(): string {
    if (!this.contract) return '';
    const d = this.contract.daysUntilExpiry;
    if (d < 0) return this.i18n.currentLang === 'ar' ? 'منتهي' : 'Expired';
    if (d === 0) return this.i18n.currentLang === 'ar' ? 'ينتهي اليوم' : 'Expires today';
    return this.i18n.currentLang === 'ar' ? `${d} يوم متبقي` : `${d} days remaining`;
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
}
