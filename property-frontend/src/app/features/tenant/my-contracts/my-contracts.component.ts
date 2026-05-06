import { Component, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass, NgFor, NgIf } from '@angular/common';
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
  selector: 'app-my-contracts',
  standalone: true,
  imports: [
    NgIf, NgFor, NgClass, DatePipe, DecimalPipe, RouterLink,
    TranslateModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    PageHeaderComponent
  ],
  templateUrl: './my-contracts.component.html',
  styleUrl: './my-contracts.component.scss'
})
export class MyContractsComponent implements OnInit {
  loading = true;
  contracts: LeaseContract[] = [];

  constructor(
    private readonly portalSvc: TenantPortalService,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.portalSvc.getMyContracts().subscribe({
      next: (res) => {
        this.contracts = res.data ?? [];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  statusLabel(s: string): string {
    return this.i18n.instant(`CONTRACTS.STATUS_${s}`);
  }

  get activeContract(): LeaseContract | null {
    return this.contracts.find((c) => c.status === 'ACTIVE') ?? this.contracts[0] ?? null;
  }

  /** 0..3 — which stage highlight in the tenant contract timeline. */
  flowStageIndex(st: string): number {
    switch (st) {
      case 'DRAFT':
      case 'PENDING_OWNER_APPROVAL':
        return 1;
      case 'ACTIVE':
      case 'SUSPENDED':
        return 2;
      case 'EXPIRED':
      case 'TERMINATED':
      case 'RENEWED':
      case 'CANCELLED':
        return 3;
      default:
        return 0;
    }
  }

  nodeClass(st: string, node: 0 | 1 | 2 | 3): string {
    const idx = this.flowStageIndex(st);
    if (node === 0) return 'done';
    if (idx > node) return 'done';
    if (idx === node) return 'current';
    return 'todo';
  }
}
