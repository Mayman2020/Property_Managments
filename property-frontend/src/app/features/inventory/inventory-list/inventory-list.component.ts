import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { FilterBarComponent, FilterSpec } from '../../../shared/components/filter-bar/filter-bar.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { ExportColumn, TableExportToolbarComponent } from '../../../shared/components/table-export-toolbar/table-export-toolbar.component';
import { DeleteConfirmService } from '../../../core/services/delete-confirm.service';
import { InventoryService, InventoryItem } from '../../../core/services/inventory.service';
import { PropertyService, Property } from '../../../core/services/property.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { InventoryItemDialogComponent } from '../inventory-item-dialog.component';

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [
    NgFor, NgIf, DecimalPipe, FormsModule, TranslateModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule,
    PageHeaderComponent, EmptyStateComponent, TablePagerComponent, TableExportToolbarComponent, FilterBarComponent
  ],
  templateUrl: './inventory-list.component.html',
  styleUrl: './inventory-list.component.scss'
})
export class InventoryListComponent implements OnInit {
  items: InventoryItem[] = [];
  properties: Property[] = [];
  readonly pageSize = 5;
  pageIndex = 0;
  loading = true;
  searchTerm = '';
  filterPropertyId: number | null = null;
  pageFilters: FilterSpec[] = [];

  get isAr(): boolean { return this.i18n.currentLang === 'ar'; }

  constructor(
    private readonly invSvc: InventoryService,
    private readonly propertySvc: PropertyService,
    private readonly snack: SnackService,
    private readonly deleteConfirm: DeleteConfirmService,
    private readonly dialog: MatDialog,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.propertySvc.getAll(0, 100).subscribe({
      next: (res) => {
        this.properties = res.data?.content ?? [];
        if (this.properties.length === 1) {
          this.filterPropertyId = this.properties[0].id;
        }
        this.setupFilters();
        this.load();
      },
      error: () => this.load()
    });
  }

  load(): void {
    this.loading = true;
    this.invSvc.getItems(this.filterPropertyId ?? undefined, 0, 200, this.searchTerm).subscribe({
      next: (res) => {
        this.items = res.data?.content ?? [];
        this.pageIndex = 0;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.error(this.i18n.instant('INVENTORY.LOAD_ERROR'));
      }
    });
  }

  openAddDialog(): void {
    this.dialog.open(InventoryItemDialogComponent, {
      data: { item: null, properties: this.properties },
      width: '560px',
      panelClass: 'app-dialog-panel',
      disableClose: true
    }).afterClosed().subscribe((ok) => { if (ok) this.load(); });
  }

  openEditDialog(item: InventoryItem): void {
    this.dialog.open(InventoryItemDialogComponent, {
      data: { item, properties: this.properties },
      width: '560px',
      panelClass: 'app-dialog-panel',
      disableClose: true
    }).afterClosed().subscribe((ok) => { if (ok) this.load(); });
  }

  confirmDelete(item: InventoryItem): void {
    const name = this.isAr ? item.itemNameAr : (item.itemNameEn || item.itemNameAr);
    this.deleteConfirm.openDeleteConfirm({
      messageKey: 'DIALOG.DELETE_NAMED',
      messageParams: { name }
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.invSvc.delete(item.id).subscribe({
        next: () => { this.snack.success(this.i18n.instant('COMMON.SUCCESS')); this.load(); },
        error: (err: Error) => this.deleteConfirm.handleDeleteError(err, this.snack)
      });
    });
  }

  private setupFilters(): void {
    this.pageFilters = [
      {
        key: 'filterPropertyId',
        label: 'REQUEST_FORM.PROPERTY',
        type: 'select',
        options: this.properties.map(p => ({
          value: p.id,
          label: this.i18n.currentLang === 'ar' ? (p.propertyNameAr || p.propertyName) : (p.propertyNameEn || p.propertyName)
        }))
      }
    ];
  }

  onFilterBarChange(values: any): void {
    if (values?.filterPropertyId !== undefined) this.filterPropertyId = values.filterPropertyId;
    this.pageIndex = 0;
    this.load();
  }

  clearFiltersFromBar(): void {
    this.filterPropertyId = null;
    this.pageIndex = 0;
    this.load();
  }

  hasFiltersBar(): boolean {
    return !!this.filterPropertyId;
  }

  onPropertyChange(): void {
    this.pageIndex = 0;
    this.load();
  }

  stockPercent(item: InventoryItem): number {
    if (item.minQuantity <= 0) return 100;
    return Math.min(100, Math.round((item.quantity / item.minQuantity) * 100));
  }

  onSearch(value: string): void {
    this.searchTerm = value;
    this.pageIndex = 0;
    this.load();
  }

  get pagedItems(): InventoryItem[] {
    const start = this.pageIndex * this.pageSize;
    return this.items.slice(start, start + this.pageSize);
  }

  get exportColumns(): ExportColumn<InventoryItem>[] {
    return [
      { header: this.i18n.instant('INVENTORY.ITEM_CODE'), value: 'itemCode' },
      { header: this.i18n.instant('INVENTORY.ITEM_NAME'), value: (row) => this.isAr ? row.itemNameAr : (row.itemNameEn || row.itemNameAr) },
      { header: this.i18n.instant('INVENTORY.CURRENT_QTY'), value: (row) => `${row.quantity} ${row.unitOfMeasure || ''}` },
      { header: this.i18n.instant('INVENTORY.MIN_QUANTITY'), value: (row) => `${row.minQuantity} ${row.unitOfMeasure || ''}` },
      { header: this.i18n.instant('INVENTORY.LOCATION'), value: (row) => row.location || '-' },
      { header: this.i18n.instant('INVENTORY.LEVEL'), value: (row) => row.isLowStock ? this.i18n.instant('INVENTORY.LOW') : this.i18n.instant('INVENTORY.OK') }
    ];
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.items.length / this.pageSize));
  }

  changePage(step: number): void {
    this.pageIndex = Math.max(0, Math.min(this.pageIndex + step, this.totalPages - 1));
  }
}
