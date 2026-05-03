import { Component, OnInit } from '@angular/core';
import { Location, NgIf, NgFor, DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, forkJoin, of } from 'rxjs';
import { RecordPaymentFormComponent } from '../record-payment-form/record-payment-form.component';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { AuditTrailComponent } from '../../../shared/components/audit-trail/audit-trail.component';
import { ContractService } from '../../../core/services/contract.service';
import { PaymentService } from '../../../core/services/payment.service';
import { ViolationService } from '../../../core/services/violation.service';
import { ComplaintService } from '../../../core/services/complaint.service';
import { InspectionService } from '../../../core/services/inspection.service';
import {
  LeaseContract, RentPaymentSchedule, RentPayment,
  ContractFee, TenantViolation, TenantComplaint, UnitInspection
} from '../../../core/models/contract.model';

@Component({
  selector: 'app-contract-detail',
  standalone: true,
  imports: [
    NgIf, NgFor, DatePipe, DecimalPipe, NgClass, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule,
    MatTabsModule, MatProgressSpinnerModule,
    MatTableModule, MatDialogModule,
    TranslateModule, PageHeaderComponent, AuditTrailComponent
  ],
  templateUrl: './contract-detail.component.html',
  styleUrl: './contract-detail.component.scss'
})
export class ContractDetailComponent implements OnInit {
  loading = true;
  actionLoading = false;
  contractId!: number;

  contract: LeaseContract | null = null;
  schedule: RentPaymentSchedule[] = [];
  payments: RentPayment[] = [];
  fees: ContractFee[] = [];
  violations: TenantViolation[] = [];
  complaints: TenantComplaint[] = [];
  inspections: UnitInspection[] = [];

  scheduleColumns = ['dueDate', 'period', 'amount', 'status'];
  paymentColumns = ['paymentDate', 'amount', 'method', 'reference'];
  feeColumns = ['feeType', 'amount', 'dueDate', 'paid'];
  violationColumns = ['type', 'severity', 'status', 'fine'];
  complaintColumns = ['title', 'type', 'priority', 'status'];
  inspectionColumns = ['date', 'type', 'overall', 'officer'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private contractSvc: ContractService,
    private paymentSvc: PaymentService,
    private violationSvc: ViolationService,
    private complaintSvc: ComplaintService,
    private inspectionSvc: InspectionService,
    private location: Location,
    private dialog: MatDialog
  ) {}

  goBack(): void { this.location.back(); }

  ngOnInit(): void {
    this.contractId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    forkJoin({
      contract: this.contractSvc.getById(this.contractId).pipe(catchError(() => of(null))),
      schedule: this.contractSvc.getPaymentSchedule(this.contractId).pipe(catchError(() => of(null))),
      payments: this.paymentSvc.getByContract(this.contractId).pipe(catchError(() => of(null))),
      violations: this.violationSvc.getAll({ contractId: this.contractId }).pipe(catchError(() => of(null))),
      complaints: this.complaintSvc.getAll({ contractId: this.contractId }).pipe(catchError(() => of(null))),
      inspections: this.inspectionSvc.getByContract(this.contractId).pipe(catchError(() => of(null)))
    }).subscribe(({ contract, schedule, payments, violations, complaints, inspections }) => {
      this.contract = contract?.data ?? null;
      this.schedule = schedule?.data?.content ?? schedule?.data ?? [];
      this.payments = payments?.data?.content ?? payments?.data ?? [];
      this.violations = violations?.data?.content ?? violations?.data ?? [];
      this.complaints = complaints?.data?.content ?? complaints?.data ?? [];
      this.inspections = inspections?.data?.content ?? inspections?.data ?? [];
      this.loading = false;
    });
  }

  activate(): void {
    if (!this.contract) return;
    this.actionLoading = true;
    this.contractSvc.activate(this.contractId).subscribe({
      next: () => { this.actionLoading = false; this.loadAll(); },
      error: () => { this.actionLoading = false; }
    });
  }

  goToRenew(): void {
    this.router.navigate(['/admin/contracts', this.contractId, 'renew']);
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      ACTIVE: 'chip-success', DRAFT: 'chip-default', EXPIRED: 'chip-danger',
      TERMINATED: 'chip-danger', RENEWED: 'chip-info', SUSPENDED: 'chip-warn',
      PENDING: 'chip-default', PAID: 'chip-success', OVERDUE: 'chip-danger',
      PARTIAL: 'chip-warn', WAIVED: 'chip-info',
      OPEN: 'chip-warn', RESOLVED: 'chip-success', NOTIFIED: 'chip-info',
      IN_REVIEW: 'chip-info', CLOSED: 'chip-default'
    };
    return map[status] ?? 'chip-default';
  }

  openRecordPaymentDialog(row?: RentPaymentSchedule): void {
    this.dialog.open(RecordPaymentFormComponent, {
      width: '600px',
      maxWidth: '95vw',
      panelClass: 'app-dialog-panel',
      disableClose: true,
      data: {
        contractId: this.contractId,
        scheduleId: row?.id,
        amountDue: row?.amount
      }
    }).afterClosed().subscribe(saved => {
      if (saved) this.loadAll();
    });
  }
}
