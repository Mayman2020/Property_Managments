import { Component, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { ContractFormComponent } from '../contract-form/contract-form.component';
import { RecordPaymentFormComponent } from '../record-payment-form/record-payment-form.component';
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
    openViolations: 0,
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
      dash: this.dashSvc.getStats().pipe(catchError(() => of(null))),
      expiring: this.contractSvc.getExpiring(30).pipe(catchError(() => of(null)))
    }).subscribe(({ dash, expiring }) => {
      if (dash?.data) {
        const data = dash.data;
        this.stats.activeContracts = data.activeContracts ?? 0;
        this.stats.draftContracts = data.draftContracts ?? 0;
        this.stats.expiringIn30Days = data.expiringIn30Days ?? 0;
        this.stats.overduePayments = data.overduePayments ?? 0;
        this.stats.openViolations = data.openViolations ?? 0;
        this.stats.openComplaints = data.openComplaints ?? 0;
      }
      if (expiring?.data) {
        this.expiringContracts = expiring.data.content ?? expiring.data ?? [];
      }
      this.loading = false;
    });
  }

  openContractDialog(): void {
    this.dialog.open(ContractFormComponent, {
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
