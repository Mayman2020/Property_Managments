import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf, NgTemplateOutlet } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { catchError } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { ExportColumn, TableExportToolbarComponent } from '../../../shared/components/table-export-toolbar/table-export-toolbar.component';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LookupItem, LookupService, LookupType } from '../../../core/services/lookup.service';
import { SnackService } from '../../../core/services/snack.service';
import { DeleteConfirmService } from '../../../core/services/delete-confirm.service';
import { LookupDialogComponent, LookupDialogData } from '../lookup-dialog/lookup-dialog.component';
import { ClassificationDialogComponent, ClassificationDialogData } from '../classification-dialog/classification-dialog.component';

type CityRow = LookupItem & { governorateNameAr: string; governorateNameEn: string };

interface ClassificationList {
  type: LookupType;
  /** i18n key under assets/i18n (e.g. LOOKUPS.LIST_PROPERTY_TYPE) */
  labelKey: string;
  icon: string;
  items: LookupItem[];
  pageIndex: number;
  loading: boolean;
}

@Component({
  selector: 'app-lookup-management',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    NgTemplateOutlet,
    TranslateModule,
    MatButtonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatTabsModule,
    MatTooltipModule,
    PageHeaderComponent,
    TablePagerComponent,
    TableExportToolbarComponent
  ],
  templateUrl: './lookup-management.component.html',
  styleUrl: './lookup-management.component.scss'
})
export class LookupManagementComponent implements OnInit {
  loading = true;
  deletingLookupId: number | null = null;

  governorates: LookupItem[] = [];
  allCities: CityRow[] = [];
  cityGovernorateFilter: number | null = null;

  readonly pageSize = 5;
  governoratesPageIndex = 0;
  citiesPageIndex = 0;

  readonly propertyLists: ClassificationList[] = [
    { type: 'PROPERTY_TYPE', labelKey: 'LOOKUPS.LIST_PROPERTY_TYPE', icon: 'apartment', items: [], pageIndex: 0, loading: false },
    { type: 'PROPERTY_STATUS', labelKey: 'LOOKUPS.LIST_PROPERTY_STATUS', icon: 'toggle_on', items: [], pageIndex: 0, loading: false },
    { type: 'UNIT_TYPE', labelKey: 'LOOKUPS.LIST_UNIT_TYPE', icon: 'meeting_room', items: [], pageIndex: 0, loading: false },
    { type: 'FLOOR_TYPE', labelKey: 'LOOKUPS.LIST_FLOOR_TYPE', icon: 'layers', items: [], pageIndex: 0, loading: false }
  ];

  readonly contractLists: ClassificationList[] = [
    { type: 'CONTRACT_TYPE', labelKey: 'LOOKUPS.LIST_CONTRACT_TYPE', icon: 'description', items: [], pageIndex: 0, loading: false },
    { type: 'PAYMENT_FREQUENCY', labelKey: 'LOOKUPS.LIST_PAYMENT_FREQUENCY', icon: 'event_repeat', items: [], pageIndex: 0, loading: false },
    { type: 'TERMINATION_REASON', labelKey: 'LOOKUPS.LIST_TERMINATION_REASON', icon: 'cancel', items: [], pageIndex: 0, loading: false },
    { type: 'RENT_DISCOUNT_REASON', labelKey: 'LOOKUPS.LIST_RENT_DISCOUNT_REASON', icon: 'local_offer', items: [], pageIndex: 0, loading: false },
    { type: 'CONTRACT_DRAFT_AMEND_REASON', labelKey: 'LOOKUPS.LIST_CONTRACT_DRAFT_AMEND_REASON', icon: 'edit_note', items: [], pageIndex: 0, loading: false }
  ];

  readonly financeLists: ClassificationList[] = [
    { type: 'CURRENCY', labelKey: 'LOOKUPS.LIST_CURRENCY', icon: 'payments', items: [], pageIndex: 0, loading: false },
    { type: 'PAYMENT_METHOD', labelKey: 'LOOKUPS.LIST_PAYMENT_METHOD', icon: 'account_balance_wallet', items: [], pageIndex: 0, loading: false },
    { type: 'MONTH', labelKey: 'LOOKUPS.LIST_MONTHS', icon: 'calendar_month', items: [], pageIndex: 0, loading: false },
    { type: 'YEAR', labelKey: 'LOOKUPS.LIST_YEARS', icon: 'calendar_today', items: [], pageIndex: 0, loading: false }
  ];

  readonly jobLists: ClassificationList[] = [
    { type: 'JOB_TITLE', labelKey: 'LOOKUPS.LIST_JOB_TITLE', icon: 'badge', items: [], pageIndex: 0, loading: false }
  ];

  readonly inventoryLists: ClassificationList[] = [
    { type: 'UNIT_OF_MEASURE', labelKey: 'LOOKUPS.LIST_UNIT_OF_MEASURE', icon: 'straighten', items: [], pageIndex: 0, loading: false }
  ];

  constructor(
    private readonly dialog: MatDialog,
    private readonly lookups: LookupService,
    private readonly snack: SnackService,
    private readonly deleteConfirm: DeleteConfirmService,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.loadLocationData();
    [...this.propertyLists, ...this.contractLists, ...this.financeLists, ...this.jobLists, ...this.inventoryLists].forEach((list) => this.loadClassification(list));
  }

  get isArabic(): boolean {
    return this.i18n.currentLang === 'ar';
  }

  get filteredCities(): CityRow[] {
    return this.cityGovernorateFilter
      ? this.allCities.filter((item) => item.parentId === this.cityGovernorateFilter)
      : this.allCities;
  }

  get pagedGovernorates(): LookupItem[] {
    const start = this.governoratesPageIndex * this.pageSize;
    return this.governorates.slice(start, start + this.pageSize);
  }

  get pagedCities(): CityRow[] {
    const start = this.citiesPageIndex * this.pageSize;
    return this.filteredCities.slice(start, start + this.pageSize);
  }

  get lookupExportColumns(): ExportColumn<LookupItem>[] {
    return [
      { header: this.i18n.instant('COMMON.NAME'), value: (row) => this.nameOf(row) },
      { header: this.i18n.instant('LOOKUPS.CODE'), value: 'code' },
      { header: this.i18n.instant('COMMON.ACTIVE'), value: (row) => row.active ? this.i18n.instant('COMMON.ACTIVE') : this.i18n.instant('COMMON.INACTIVE') }
    ];
  }

  get cityExportColumns(): ExportColumn<CityRow>[] {
    return [
      { header: this.i18n.instant('LOOKUPS.COUNTRY'), value: (row) => this.cityGovernorateName(row) },
      { header: this.i18n.instant('COMMON.NAME'), value: (row) => this.nameOf(row) },
      { header: this.i18n.instant('LOOKUPS.CODE'), value: 'code' },
      { header: this.i18n.instant('COMMON.ACTIVE'), value: (row) => row.active ? this.i18n.instant('COMMON.ACTIVE') : this.i18n.instant('COMMON.INACTIVE') }
    ];
  }

  nameOf(item: LookupItem): string {
    return this.isArabic ? item.nameAr : item.nameEn;
  }

  cityGovernorateName(city: CityRow): string {
    return this.isArabic ? city.governorateNameAr : city.governorateNameEn;
  }

  pagedListItems(list: ClassificationList): LookupItem[] {
    const start = list.pageIndex * this.pageSize;
    return list.items.slice(start, start + this.pageSize);
  }

  onCityGovernorateFilter(value: number | null): void {
    this.cityGovernorateFilter = value;
    this.citiesPageIndex = 0;
  }

  openAddGovernorate(): void {
    const data: LookupDialogData = { mode: 'governorate', item: null };
    this.dialog.open(LookupDialogComponent, { data, panelClass: 'app-dialog-panel', width: '540px', disableClose: true })
      .afterClosed().subscribe((saved) => { if (saved) this.loadLocationData(); });
  }

  openEditGovernorate(item: LookupItem): void {
    const data: LookupDialogData = { mode: 'governorate', item };
    this.dialog.open(LookupDialogComponent, { data, panelClass: 'app-dialog-panel', width: '540px', disableClose: true })
      .afterClosed().subscribe((saved) => { if (saved) this.loadLocationData(); });
  }

  openAddCity(): void {
    const data: LookupDialogData = { mode: 'city', item: null, governorates: this.governorates };
    this.dialog.open(LookupDialogComponent, { data, panelClass: 'app-dialog-panel', width: '540px', disableClose: true })
      .afterClosed().subscribe((saved) => { if (saved) this.loadLocationData(); });
  }

  openEditCity(item: CityRow): void {
    const data: LookupDialogData = { mode: 'city', item, governorates: this.governorates };
    this.dialog.open(LookupDialogComponent, { data, panelClass: 'app-dialog-panel', width: '540px', disableClose: true })
      .afterClosed().subscribe((saved) => { if (saved) this.loadLocationData(); });
  }

  openAddClassification(list: ClassificationList): void {
    const data: ClassificationDialogData = { type: list.type, item: null };
    this.dialog.open(ClassificationDialogComponent, { data, panelClass: 'app-dialog-panel', width: '520px', disableClose: true })
      .afterClosed().subscribe((saved) => { if (saved) this.loadClassification(list); });
  }

  openEditClassification(list: ClassificationList, item: LookupItem): void {
    const data: ClassificationDialogData = { type: list.type, item };
    this.dialog.open(ClassificationDialogComponent, { data, panelClass: 'app-dialog-panel', width: '520px', disableClose: true })
      .afterClosed().subscribe((saved) => { if (saved) this.loadClassification(list); });
  }

  deleteLookup(item: LookupItem, reload?: () => void): void {
    if (item.locked || this.deletingLookupId) return;
    this.deleteConfirm.openDeleteConfirm({
      messageKey: 'DIALOG.DELETE_NAMED',
      messageParams: { name: this.nameOf(item) }
    }).subscribe((ok) => {
      if (!ok) return;
      this.deletingLookupId = item.id;
      this.lookups.delete(item.id).subscribe({
        next: () => {
          this.deletingLookupId = null;
          this.snack.success(this.i18n.instant('COMMON.SUCCESS'));
          reload ? reload() : this.loadLocationData();
        },
        error: (err: Error) => {
          this.deletingLookupId = null;
          this.deleteConfirm.handleDeleteError(err, this.snack);
        }
      });
    });
  }

  deleteClassification(list: ClassificationList, item: LookupItem): void {
    this.deleteLookup(item, () => this.loadClassification(list));
  }

  private loadLocationData(): void {
    this.loading = true;
    this.lookups.getCountries().subscribe({
      next: (res) => {
        this.governorates = res.data ?? [];
        const requests = this.governorates.map((g) =>
          this.lookups.getCities(g.id).pipe(catchError(() => of({ data: [] as LookupItem[] })))
        );

        if (!requests.length) {
          this.allCities = [];
          this.loading = false;
          return;
        }

        forkJoin(requests).subscribe({
          next: (responses) => {
            this.allCities = responses.flatMap((response, index) => {
              const gov = this.governorates[index];
              return (response.data ?? []).map((city) => ({
                ...city,
                governorateNameAr: gov?.nameAr ?? '',
                governorateNameEn: gov?.nameEn ?? ''
              }));
            });
            this.loading = false;
          },
          error: () => {
            this.loading = false;
            this.snack.error(this.i18n.instant('LOOKUPS.LOAD_ERROR'));
          }
        });
      },
      error: () => {
        this.loading = false;
        this.governorates = [];
        this.allCities = [];
        this.snack.error(this.i18n.instant('LOOKUPS.LOAD_ERROR'));
      }
    });
  }

  loadClassification(list: ClassificationList): void {
    list.loading = true;
    this.lookups.getAllByType(list.type).subscribe({
      next: (res) => {
        list.items = res.data ?? [];
        list.pageIndex = Math.min(list.pageIndex, Math.max(Math.ceil(list.items.length / this.pageSize) - 1, 0));
        list.loading = false;
      },
      error: () => {
        list.items = [];
        list.loading = false;
        this.snack.error(this.i18n.instant('LOOKUPS.LOAD_ERROR'));
      }
    });
  }
}
