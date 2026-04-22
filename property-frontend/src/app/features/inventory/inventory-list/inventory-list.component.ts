import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { InventoryService, InventoryItem } from '../../../core/services/inventory.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [
    NgFor, NgIf, DecimalPipe, TranslateModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule,
    PageHeaderComponent, EmptyStateComponent
  ],
  templateUrl: './inventory-list.component.html',
  styleUrl: './inventory-list.component.scss'
})
export class InventoryListComponent implements OnInit {
  items: InventoryItem[] = [];
  loading = true;

  constructor(
    private readonly invSvc: InventoryService,
    private readonly snack: SnackService,
    private readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.invSvc.getItems().subscribe({
      next: (res) => {
        this.items = res.data?.content ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.error(this.i18n.instant('INVENTORY.LOAD_ERROR'));
      }
    });
  }

  stockPercent(item: InventoryItem): number {
    if (item.minQuantity <= 0) return 100;
    return Math.min(100, Math.round((item.quantity / item.minQuantity) * 100));
  }
}
