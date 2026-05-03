import { Component, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { AccountantPortalService, RenewalRequestWithDetails, ProcessRenewalPayload } from '../../../core/services/accountant-portal.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ProcessRenewalDialogComponent } from '../process-renewal-dialog/process-renewal-dialog.component';

@Component({
  selector: 'app-renewal-requests',
  standalone: true,
  imports: [
    NgFor, NgIf, NgClass, DatePipe, DecimalPipe, ReactiveFormsModule,
    TranslateModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatIconModule, MatProgressSpinnerModule, MatDialogModule,
    PageHeaderComponent
  ],
  templateUrl: './renewal-requests.component.html',
  styleUrl: './renewal-requests.component.scss'
})
export class RenewalRequestsComponent implements OnInit {
  requests: RenewalRequestWithDetails[] = [];
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
    this.svc.getPendingRenewalRequests().subscribe({
      next: res => { this.requests = res.data ?? []; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  openProcess(request: RenewalRequestWithDetails): void {
    const ref = this.dialog.open(ProcessRenewalDialogComponent, {
      width: '520px',
      data: { request },
      disableClose: true
    });
    ref.afterClosed().subscribe((payload: ProcessRenewalPayload | undefined) => {
      if (!payload) return;
      this.svc.processRenewal(request.id, payload).subscribe({
        next: () => {
          this.snack.success(this.i18n.instant('ACCOUNTANT_PORTAL.RENEWAL_PROCESSED'));
          this.load();
        },
        error: (e) => this.snack.error(e?.error?.message || this.i18n.instant('COMMON.ERROR'))
      });
    });
  }

  statusClass(s: string): string {
    return s === 'APPROVED' ? 'approved' : s === 'REJECTED' ? 'rejected' : 'pending';
  }

  viewFile(url: string): void {
    window.open(url, '_blank');
  }
}
