import { Component, OnInit } from '@angular/core';
import { NgIf, NgFor, DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, of } from 'rxjs';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { PaymentService } from '../../../core/services/payment.service';
import { RentPayment } from '../../../core/models/contract.model';
import { PropertyService, Property } from '../../../core/services/property.service';
import { LookupCacheService } from '../../../core/services/lookup-cache.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-payment-list',
  standalone: true,
  imports: [
    NgIf, NgFor, DatePipe, DecimalPipe, NgClass, FormsModule, RouterLink,
    MatButtonModule, MatIconModule,
    MatInputModule, MatSelectModule,
    MatProgressSpinnerModule,
    TranslateModule, PageHeaderComponent, TablePagerComponent
  ],
  templateUrl: './payment-list.component.html',
  styleUrl: './payment-list.component.scss'
})
export class PaymentListComponent implements OnInit {
  loading = true;
  payments: RentPayment[] = [];
  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;
  showOverdueOnly = false;
  filterPropertyId: number | null = null;

  properties: Property[] = [];
  loadingProperties = false;

  constructor(
    private readonly paymentSvc: PaymentService,
    private readonly propertySvc: PropertyService,
    readonly lookupCache: LookupCacheService,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.loadProperties();
    this.lookupCache.preload('PAYMENT_METHOD').subscribe(() => {
      this.load();
    });
  }

  load(): void {
    this.loading = true;
    const params: Record<string, string | number> = { page: this.pageIndex, size: this.pageSize };
    if (this.filterPropertyId) params['propertyId'] = this.filterPropertyId;

    const obs = this.showOverdueOnly
      ? this.paymentSvc.getOverdue()
      : this.paymentSvc.getAll(params);

    obs.pipe(catchError(() => of(null))).subscribe(res => {
      if (res?.data) {
        const d = res.data;
        this.payments = d.content ?? d ?? [];
        this.totalElements = d.totalElements ?? this.payments.length;
      }
      this.loading = false;
    });
  }

  private loadProperties(): void {
    this.loadingProperties = true;
    this.propertySvc.getAll(0, 200).subscribe({
      next: (res) => { this.properties = (res.data?.content ?? []).filter(p => p.isActive); this.loadingProperties = false; },
      error: () => { this.loadingProperties = false; }
    });
  }

  onFilterChange(): void {
    this.pageIndex = 0;
    this.load();
  }

  goToPage(pageIndex: number): void {
    this.pageIndex = pageIndex;
    this.load();
  }

  toggleOverdue(): void {
    this.showOverdueOnly = !this.showOverdueOnly;
    this.pageIndex = 0;
    this.load();
  }

  propertyLabel(p: Property): string {
    return this.i18n.currentLang === 'ar'
      ? (p.propertyNameAr || p.propertyName)
      : (p.propertyNameEn || p.propertyName);
  }

  getBalanceClass(balance: number): string {
    if (balance < 0) return 'chip-danger';
    if (balance > 0) return 'chip-success';
    return 'chip-default';
  }
}
