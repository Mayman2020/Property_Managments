import { Component, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { AccountantPortalService, OwnerApprovalDecision } from '../../../core/services/accountant-portal.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LeaseContract } from '../../../core/models/contract.model';
import { OwnerDecisionDialogComponent } from '../owner-decision-dialog/owner-decision-dialog.component';

@Component({
  selector: 'app-contract-approvals',
  standalone: true,
  imports: [
    NgFor, NgIf, NgClass, DatePipe, DecimalPipe, ReactiveFormsModule,
    TranslateModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatIconModule, MatProgressSpinnerModule, MatDialogModule,
    PageHeaderComponent
  ],
  templateUrl: './contract-approvals.component.html',
  styleUrl: './contract-approvals.component.scss'
})
export class ContractApprovalsComponent implements OnInit {
  contracts: LeaseContract[] = [];
  loading = true;

  constructor(
    private readonly svc: AccountantPortalService,
    private readonly snack: SnackService,
    private readonly dialog: MatDialog,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.svc.getPendingApprovals().subscribe({
      next: res => { this.contracts = res.data ?? []; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  openDecision(contract: LeaseContract): void {
    const ref = this.dialog.open(OwnerDecisionDialogComponent, {
      width: '440px',
      data: { contract },
      disableClose: true
    });
    ref.afterClosed().subscribe((payload: OwnerApprovalDecision | undefined) => {
      if (!payload) return;
      this.svc.submitOwnerDecision(contract.id, payload).subscribe({
        next: () => {
          const msgKey = payload.decision === 'APPROVED'
            ? 'OWNER_PORTAL.CONTRACT_APPROVED'
            : 'OWNER_PORTAL.CONTRACT_REJECTED';
          this.snack.success(this.i18n.instant(msgKey));
          this.load();
        },
        error: (e) => this.snack.error(e?.error?.message || this.i18n.instant('COMMON.ERROR'))
      });
    });
  }
}
