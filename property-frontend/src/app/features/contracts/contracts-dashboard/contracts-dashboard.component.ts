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
import { MaintenanceContractDialogComponent } from '../maintenance-contract-dialog/maintenance-contract-dialog.component';
import { ContractTypeChoiceDialogComponent } from '../contract-type-choice-dialog/contract-type-choice-dialog.component';
import { TranslateModule } from '@ngx-translate/core';
import { PermissionService } from '../../../core/services/permission.service';
import { catchError, forkJoin, of } from 'rxjs';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ContractSummary } from '../../../core/models/contract.model';
import { ContractService } from '../../../core/services/contract.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { MaintenanceContractService } from '../../../core/services/maintenance-contract.service';
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
    activeRentalContracts: 0,
    cancelledRentalContracts: 0,
    rentalExpiringIn30Days: 0,
    activeMaintenanceContracts: 0,
    cancelledMaintenanceContracts: 0,
    maintenanceExpiringIn30Days: 0,
    draftContracts: 0,
    maintenancePendingApproval: 0,
    overduePayments: 0,
    openComplaints: 0
  };

  expiringContracts: ContractSummary[] = [];

  constructor(
    private readonly dashSvc: DashboardService,
    private readonly contractSvc: ContractService,
    private readonly maintenanceContractSvc: MaintenanceContractService,
    private readonly dialog: MatDialog,
    readonly permissions: PermissionService,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    // Owner-portal endpoints are used for maintenance counts because they are role-aware:
    // SUPER_ADMIN / GENERAL_MANAGER get all rows, OWNER gets rows scoped to their properties.
    // This is what lets the "pending approval" card render correctly under any role.
    forkJoin({
      all:               this.contractSvc.getAll({ size: 500 }).pipe(catchError(() => of(null))),
      maintenanceDrafts: this.maintenanceContractSvc.getOwnerDrafts().pipe(catchError(() => of(null))),
      maintenanceTerm:   this.maintenanceContractSvc.getOwnerPendingTerminations().pipe(catchError(() => of(null))),
      maintenanceRenew:  this.maintenanceContractSvc.getOwnerPendingRenewals().pipe(catchError(() => of(null))),
      maintenanceAll:    this.maintenanceContractSvc.listAll().pipe(catchError(() => of(null))),
      expiring:          this.contractSvc.getExpiring(30).pipe(catchError(() => of(null))),
      dash:              this.dashSvc.getStats().pipe(catchError(() => of(null)))
    }).subscribe(({ all, maintenanceDrafts, maintenanceTerm, maintenanceRenew, maintenanceAll, expiring, dash }) => {
      const contracts: any[] = all?.data?.content ?? all?.data ?? [];
      const mDrafts = Array.isArray(maintenanceDrafts?.data) ? maintenanceDrafts!.data! : [];
      const mTerm   = Array.isArray(maintenanceTerm?.data)   ? maintenanceTerm!.data!   : [];
      const mRenew  = Array.isArray(maintenanceRenew?.data)  ? maintenanceRenew!.data!  : [];
      const maintenanceContracts = Array.isArray(maintenanceAll?.data) ? maintenanceAll!.data! : [];

      this.stats.activeRentalContracts       = contracts.filter(c => c.status === 'ACTIVE').length;
      this.stats.cancelledRentalContracts    = contracts.filter(c => c.status === 'CANCELLED').length;
      this.stats.rentalExpiringIn30Days      = expiring?.data?.content?.length ?? expiring?.data?.length ?? 0;
      this.stats.activeMaintenanceContracts  = maintenanceContracts.filter(c => c.status === 'ACTIVE').length;
      this.stats.cancelledMaintenanceContracts = maintenanceContracts.filter(c => c.status === 'CANCELLED').length;
      this.stats.maintenanceExpiringIn30Days = maintenanceContracts.filter(c => this.isExpiringWithinDays(c.endDate, 30)).length;
      this.stats.draftContracts              = contracts.filter(c => c.status === 'DRAFT').length + mDrafts.length;
      this.stats.maintenancePendingApproval  = mDrafts.length + mTerm.length + mRenew.length;
      this.stats.overduePayments             = dash?.data?.overduePayments ?? 0;
      this.stats.openComplaints              = dash?.data?.openComplaints  ?? 0;

      if (expiring?.data) {
        this.expiringContracts = expiring.data.content ?? expiring.data ?? [];
      }
      this.loading = false;
    });
  }

  private isExpiringWithinDays(endDate: string | null | undefined, days: number): boolean {
    if (!endDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() + days);
    const expiry = new Date(endDate);
    expiry.setHours(0, 0, 0, 0);
    return expiry >= today && expiry <= cutoff;
  }

  openContractDialog(): void {
    this.dialog.open(ContractTypeChoiceDialogComponent, {
      width: '420px',
      maxWidth: '95vw',
      panelClass: 'app-dialog-panel',
      disableClose: true
    }).afterClosed().subscribe((contractType: 'rental' | 'maintenance' | null) => {
      if (contractType === 'rental') {
        this.openRentalContractDialog();
      } else if (contractType === 'maintenance') {
        this.openMaintenanceContractDialog();
      }
    });
  }

  private openRentalContractDialog(): void {
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

  canCreateMaintenanceContract(): boolean {
    return this.permissions.can('contracts', 'create');
  }

  openMaintenanceContractDialog(): void {
    this.dialog.open(MaintenanceContractDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      panelClass: 'app-dialog-panel',
      disableClose: true,
      data: { mode: 'create' }
    }).afterClosed().subscribe((saved) => {
      if (saved) this.loadData();
    });
  }

  loadData(): void {
    this.loading = true;
    this.ngOnInit();
  }
}
