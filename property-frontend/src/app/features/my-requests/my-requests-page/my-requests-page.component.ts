import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AuthService } from '../../../core/services/auth.service';
import { MyRequestItem, MyRequestsService } from '../../../core/services/my-requests.service';

@Component({
  selector: 'app-my-requests-page',
  standalone: true,
  imports: [
    NgIf, NgFor, NgClass, DatePipe, RouterLink,
    TranslateModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    PageHeaderComponent
  ],
  templateUrl: './my-requests-page.component.html',
  styleUrl: './my-requests-page.component.scss'
})
export class MyRequestsPageComponent implements OnInit {
  loading = true;
  requests: MyRequestItem[] = [];

  constructor(
    private readonly service: MyRequestsService,
    private readonly auth: AuthService,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.service.listMine().subscribe({
      next: (res) => {
        this.requests = res.data ?? [];
        this.loading = false;
      },
      error: () => {
        this.requests = [];
        this.loading = false;
      }
    });
  }

  typeLabel(item: MyRequestItem): string {
    const key = `MY_REQUESTS.TYPE_${item.sourceType}`;
    const translated = this.i18n.instant(key);
    return translated !== key ? translated : (item.title || item.sourceType);
  }

  statusLabel(status?: string | null): string {
    const value = status || 'PENDING';
    const translated = this.i18n.instant(`STATUS.${value}`);
    return translated !== `STATUS.${value}` ? translated : value;
  }

  statusTone(status?: string | null): 'success' | 'warn' | 'danger' | 'info' {
    const value = status || '';
    if (['COMPLETED', 'APPROVED', 'RENEWED', 'RESOLVED', 'CLOSED'].includes(value)) return 'success';
    if (['REJECTED', 'CANCELLED'].includes(value)) return 'danger';
    if (value.startsWith('PENDING') || value === 'OPEN' || value === 'DRAFT') return 'warn';
    return 'info';
  }

  itemRoute(item: MyRequestItem): string | null {
    if (item.sourceType === 'MAINTENANCE_REQUEST' && item.sourceId) {
      const role = this.auth.getRole();
      if (role === 'TENANT') return `/tenant/requests/${item.sourceId}`;
      if (role === 'MAINTENANCE_OFFICER_INTERNAL' || role === 'MAINTENANCE_OFFICER_COMPANY' || role === 'MAINTENANCE_COMPANY') {
        return `/officer/requests/${item.sourceId}`;
      }
      return `/admin/maintenance/${item.sourceId}`;
    }
    return item.route || null;
  }

  trackByRequest(_: number, item: MyRequestItem): string {
    return `${item.sourceType}-${item.sourceId}`;
  }
}
