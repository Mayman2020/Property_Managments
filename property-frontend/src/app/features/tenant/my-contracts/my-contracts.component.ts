import { Component, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SearchDropdownComponent, SearchDropdownItem } from '../../../shared/components/search-dropdown/search-dropdown.component';
import { TenantPortalService } from '../../../core/services/tenant-portal.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LeaseContract } from '../../../core/models/contract.model';

@Component({
  selector: 'app-my-contracts',
  standalone: true,
  imports: [
    NgIf, NgFor, NgClass, DatePipe, DecimalPipe, RouterLink,
    TranslateModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    PageHeaderComponent, SearchDropdownComponent
  ],
  templateUrl: './my-contracts.component.html',
  styleUrl: './my-contracts.component.scss'
})
export class MyContractsComponent implements OnInit {
  loading = true;
  contracts: LeaseContract[] = [];
  selectedContractId: number | null = null;

  constructor(
    private readonly portalSvc: TenantPortalService,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.portalSvc.getMyContracts().subscribe({
      next: (res) => {
        this.contracts = res.data ?? [];
        const first = this.contracts.find(c => c.status === 'ACTIVE') ?? this.contracts[0];
        this.selectedContractId = first?.id ?? null;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  statusLabel(s: string): string {
    return this.i18n.instant(`CONTRACTS.STATUS_${s}`);
  }

  get selectedContract(): LeaseContract | null {
    return this.selectableContracts.find(c => c.id === this.selectedContractId) ?? null;
  }

  get selectableContracts(): LeaseContract[] {
    return this.contracts.filter(c => c.status === 'ACTIVE');
  }

  get contractDropdownItems(): SearchDropdownItem[] {
    return this.selectableContracts.map(c => ({
      label: c.contractNumber,
      subLabel: [c.propertyName, c.unitNumber ? (this.i18n.instant('INLINE_TEXT.UNIT_3')) + c.unitNumber : null]
        .filter(Boolean).join(' · '),
      badge: this.statusLabel(c.status),
      badgeClass: 'st-' + c.status,
      data: c
    }));
  }

  onContractSelect(contract: LeaseContract | null): void {
    this.selectedContractId = contract?.id ?? null;
  }

  /** 0..3 — which stage highlight in the tenant contract timeline. */
  flowStageIndex(st: string): number {
    switch (st) {
      case 'DRAFT':
      case 'PENDING_OWNER_APPROVAL':
        return 1;
      case 'ACTIVE':
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
