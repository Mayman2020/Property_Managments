import { Component, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgFor, NgIf } from '@angular/common';
import { RouterLink, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { ContractDialogComponent } from '../contract-dialog/contract-dialog.component';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, forkJoin, of } from 'rxjs';

import { I18nService } from '../../../core/i18n/i18n.service';
import { ContractSummary } from '../../../core/models/contract.model';
import { ContractService } from '../../../core/services/contract.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-contracts-dashboard',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DecimalPipe,
    DatePipe,
    RouterLink,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    TranslateModule,
    PageHeaderComponent
  ],
  templateUrl: './contracts-dashboard.component.html',
  styleUrl: './contracts-dashboard.component.scss'
})
export class ContractsDashboardComponent implements OnInit {
  loading = true;

  stats = {
    activeContracts: 0,
    draftContracts: 0,
    expiringIn30Days: 0,
    overduePayments: 0,
    openComplaints: 0
  };

  expiringContracts: ContractSummary[] = [];

  constructor(
    private readonly dashSvc: DashboardService,
    private readonly contractSvc: ContractService,
    private readonly dialog: MatDialog,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    forkJoin({
      all:      this.contractSvc.getAll({ size: 500 }).pipe(catchError(() => of(null))),
      expiring: this.contractSvc.getExpiring(30).pipe(catchError(() => of(null))),
      dash:     this.dashSvc.getStats().pipe(catchError(() => of(null)))
    }).subscribe(({ all, expiring, dash }) => {
      // Count statuses from real contract data
      const contracts: any[] = all?.data?.content ?? all?.data ?? [];
      this.stats.activeContracts   = contracts.filter(c => c.status === 'ACTIVE').length;
      this.stats.draftContracts    = contracts.filter(c => c.status === 'DRAFT').length;
      this.stats.expiringIn30Days  = expiring?.data?.content?.length ?? expiring?.data?.length ?? 0;
      // Complaints from dashboard stats (optional)
      this.stats.overduePayments   = dash?.data?.overduePayments  ?? 0;
      this.stats.openComplaints    = dash?.data?.openComplaints    ?? 0;

      if (expiring?.data) {
        this.expiringContracts = expiring.data.content ?? expiring.data ?? [];
      }
      this.loading = false;
    });
  }

  openContractDialog(): void {
    this.dialog.open(ContractDialogComponent, {
      width: '980px',
      maxWidth: '95vw',
      maxHeight: '95vh',
      panelClass: 'app-dialog-panel',
      disableClose: true
    }).afterClosed().subscribe(saved => {
      if (saved) this.loadData();
    });
  }

  loadData(): void {
    this.loading = true;
    this.ngOnInit();
  }
}
