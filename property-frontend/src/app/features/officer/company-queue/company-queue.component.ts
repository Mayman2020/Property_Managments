import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

import { MaintenanceRequest, MaintenanceService } from '../../../core/services/maintenance.service';
import { AuthService } from '../../../core/services/auth.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { MaintenanceInvoiceService, CompanyProperty } from '../../../core/services/maintenance-invoice.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-company-queue',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    RouterLink,
    FormsModule,
    TranslateModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
    EmptyStateComponent
  ],
  templateUrl: './company-queue.component.html',
  styleUrl: './company-queue.component.scss'
})
export class CompanyQueueComponent implements OnInit {
  loading = true;
  error = false;
  requests: MaintenanceRequest[] = [];
  claimingId: number | null = null;
  properties: CompanyProperty[] = [];
  selectedPropertyId: number | null = null;

  constructor(
    private readonly maintenanceService: MaintenanceService,
    private readonly invoiceService: MaintenanceInvoiceService,
    private readonly auth: AuthService,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.loadProperties();
    this.load();
  }

  loadProperties(): void {
    this.invoiceService.getMyProperties().subscribe({
      next: (res) => {
        this.properties = res.data ?? [];
        if (this.properties.length === 1) {
          this.selectedPropertyId = this.properties[0].id;
          this.load();
        }
      }
    });
  }

  load(): void {
    this.loading = true;
    this.error = false;
    const params: Record<string, string | number | boolean> = { page: 0, size: 50 };
    if (this.selectedPropertyId != null) params['propertyId'] = this.selectedPropertyId;
    this.maintenanceService.getCompanyQueue(params).subscribe({
      next: (res) => {
        this.requests = res.data?.content ?? [];
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      }
    });
  }

  onPropertyFilterChange(propertyId: number | null): void {
    this.selectedPropertyId = propertyId;
    this.load();
  }

  claim(req: MaintenanceRequest): void {
    const currentUser = this.auth.getCurrentUser();
    if (!currentUser?.id || this.claimingId != null) return;
    this.claimingId = req.id;
    this.maintenanceService.assign(req.id, currentUser.id).subscribe({
      next: () => {
        this.claimingId = null;
        this.load();
      },
      error: () => {
        this.claimingId = null;
      }
    });
  }

  priorityClass(req: MaintenanceRequest): string {
    return req.priority?.toLowerCase() ?? 'normal';
  }

  propertyLabel(p: CompanyProperty): string {
    return this.i18n.currentLang === 'ar'
      ? (p.propertyNameAr || p.propertyName)
      : (p.propertyNameEn || p.propertyName);
  }
}
