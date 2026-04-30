import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { VendorItem, VendorService } from '../../core/services/vendor.service';
import { Property, PropertyService } from '../../core/services/property.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { VendorDialogComponent } from './vendor-dialog.component';

@Component({
  selector: 'app-vendor-workspace',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule, MatButtonModule, TranslateModule, PageHeaderComponent],
  template: `
    <div class="app-page">
      <app-page-header [eyebrow]="'VENDOR.EYEBROW' | translate" [title]="'VENDOR.TITLE' | translate" [subtitle]="'VENDOR.SUBTITLE' | translate">
        <button mat-flat-button (click)="openAddVendor()">
          <span class="material-icons">add</span>{{ 'VENDOR.ADD' | translate }}
        </button>
      </app-page-header>

      <div class="workspace-filter-bar" *ngIf="properties.length > 1">
        <select [(ngModel)]="filterPropertyId" (change)="onPropertyChange()" class="estate-property-select">
          <option [ngValue]="null">{{ 'COMMON.ALL_PROPERTIES' | translate }}</option>
          <option *ngFor="let p of properties" [ngValue]="p.id">
            {{ i18n.currentLang === 'ar' ? (p.propertyNameAr || p.propertyName) : (p.propertyNameEn || p.propertyName) }}
          </option>
        </select>
      </div>

      <div class="app-card">
        <div class="app-table-wrap" *ngIf="vendors.length; else emptyTpl">
          <table class="app-data-table">
            <thead>
              <tr>
                <th>{{ 'VENDOR.CODE_COL' | translate }}</th>
                <th>{{ 'VENDOR.VENDOR_COL' | translate }}</th>
                <th>{{ 'VENDOR.TYPE_COL' | translate }}</th>
                <th>{{ 'VENDOR.CONTACT_COL' | translate }}</th>
                <th>{{ 'VENDOR.RATING_COL' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of vendors">
                <td>{{ item.vendorCode || '-' }}</td>
                <td>{{ item.vendorName }}</td>
                <td>{{ item.vendorType || '-' }}</td>
                <td>{{ item.phone || item.email || '-' }}</td>
                <td>{{ item.rating || 0 }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <ng-template #emptyTpl>
        <div class="app-empty-state">
          <span class="material-icons empty-icon">engineering</span>
          <h4>{{ 'VENDOR.NO_DATA' | translate }}</h4>
          <p>{{ 'VENDOR.NO_DATA_DESC' | translate }}</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .workspace-filter-bar { margin-bottom: 16px; }
  `]
})
export class VendorWorkspaceComponent implements OnInit {
  vendors: VendorItem[] = [];
  properties: Property[] = [];
  filterPropertyId: number | null = null;

  constructor(
    private readonly service: VendorService,
    private readonly propertySvc: PropertyService,
    private readonly dialog: MatDialog,
    private readonly translate: TranslateService,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.propertySvc.getAll(0, 500).subscribe({ next: (res) => { this.properties = res.data?.content ?? []; }, error: () => {} });
    this.loadVendors();
  }

  openAddVendor(): void {
    this.dialog.open(VendorDialogComponent, {
      data: { properties: this.properties, defaultPropertyId: this.filterPropertyId ?? undefined },
      width: '560px',
      panelClass: 'app-dialog-panel'
    }).afterClosed().subscribe((ok) => { if (ok) this.loadVendors(); });
  }

  onPropertyChange(): void {
    this.loadVendors();
  }

  private loadVendors(): void {
    const params: Record<string, string | number> = { page: 0, size: 50 };
    if (this.filterPropertyId) params['propertyId'] = this.filterPropertyId;
    this.service.getVendors(params).subscribe({
      next: (res) => { this.vendors = res.data?.content ?? []; },
      error: () => { this.vendors = []; }
    });
  }
}
