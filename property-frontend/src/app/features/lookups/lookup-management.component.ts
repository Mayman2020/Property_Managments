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
import { TranslateModule } from '@ngx-translate/core';
import { catchError } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';

import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { TablePagerComponent } from '../../shared/components/table-pager/table-pager.component';
import { ExportColumn, TableExportToolbarComponent } from '../../shared/components/table-export-toolbar/table-export-toolbar.component';
import { I18nService } from '../../core/i18n/i18n.service';
import { LookupItem, LookupService, LookupType } from '../../core/services/lookup.service';
import { SnackService } from '../../core/services/snack.service';
import { LookupDialogComponent, LookupDialogData } from './lookup-dialog.component';
import { ClassificationDialogComponent, ClassificationDialogData } from './classification-dialog.component';

type CityRow = LookupItem & { governorateNameAr: string; governorateNameEn: string };

interface ClassificationList {
  type: LookupType;
  labelAr: string;
  labelEn: string;
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
    { type: 'PROPERTY_TYPE', labelAr: 'نوع العقار', labelEn: 'Property Type', icon: 'apartment', items: [], pageIndex: 0, loading: false },
    { type: 'UNIT_TYPE', labelAr: 'نوع الوحدة', labelEn: 'Unit Type', icon: 'meeting_room', items: [], pageIndex: 0, loading: false },
    { type: 'FLOOR_TYPE', labelAr: 'نوع الطابق', labelEn: 'Floor Type', icon: 'layers', items: [], pageIndex: 0, loading: false }
  ];

  readonly contractLists: ClassificationList[] = [
    { type: 'CONTRACT_TYPE', labelAr: 'نوع العقد', labelEn: 'Contract Type', icon: 'description', items: [], pageIndex: 0, loading: false },
    { type: 'TERMINATION_REASON', labelAr: 'أسباب إنهاء العقد', labelEn: 'Termination Reasons', icon: 'cancel', items: [], pageIndex: 0, loading: false }
  ];

  readonly jobLists: ClassificationList[] = [
    { type: 'JOB_TITLE', labelAr: 'المسميات الوظيفية', labelEn: 'Job Titles', icon: 'badge', items: [], pageIndex: 0, loading: false }
  ];

  readonly inventoryLists: ClassificationList[] = [
    { type: 'UNIT_OF_MEASURE', labelAr: 'وحدات القياس', labelEn: 'Units of Measure', icon: 'straighten', items: [], pageIndex: 0, loading: false }
  ];

  constructor(
    private readonly dialog: MatDialog,
    private readonly lookups: LookupService,
    private readonly snack: SnackService,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.loadLocationData();
    [...this.propertyLists, ...this.contractLists, ...this.jobLists, ...this.inventoryLists].forEach((list) => this.loadClassification(list));
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
      { header: this.isArabic ? 'الاسم' : 'Name', value: (row) => this.nameOf(row) },
      { header: this.i18n.instant('LOOKUPS.CODE'), value: 'code' },
      { header: this.i18n.instant('COMMON.ACTIVE'), value: (row) => row.active ? this.i18n.instant('COMMON.ACTIVE') : this.i18n.instant('COMMON.INACTIVE') }
    ];
  }

  get cityExportColumns(): ExportColumn<CityRow>[] {
    return [
      { header: this.i18n.instant('LOOKUPS.COUNTRY'), value: (row) => this.cityGovernorateName(row) },
      { header: this.isArabic ? 'الاسم' : 'Name', value: (row) => this.nameOf(row) },
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

  listLabel(list: ClassificationList): string {
    return this.isArabic ? list.labelAr : list.labelEn;
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
    this.dialog.open(LookupDialogComponent, { data, panelClass: 'app-dialog-panel', width: '540px' })
      .afterClosed().subscribe((saved) => { if (saved) this.loadLocationData(); });
  }

  openEditGovernorate(item: LookupItem): void {
    const data: LookupDialogData = { mode: 'governorate', item };
    this.dialog.open(LookupDialogComponent, { data, panelClass: 'app-dialog-panel', width: '540px' })
      .afterClosed().subscribe((saved) => { if (saved) this.loadLocationData(); });
  }

  openAddCity(): void {
    const data: LookupDialogData = { mode: 'city', item: null, governorates: this.governorates };
    this.dialog.open(LookupDialogComponent, { data, panelClass: 'app-dialog-panel', width: '540px' })
      .afterClosed().subscribe((saved) => { if (saved) this.loadLocationData(); });
  }

  openEditCity(item: CityRow): void {
    const data: LookupDialogData = { mode: 'city', item, governorates: this.governorates };
    this.dialog.open(LookupDialogComponent, { data, panelClass: 'app-dialog-panel', width: '540px' })
      .afterClosed().subscribe((saved) => { if (saved) this.loadLocationData(); });
  }

  openAddClassification(list: ClassificationList): void {
    const data: ClassificationDialogData = { type: list.type, item: null };
    this.dialog.open(ClassificationDialogComponent, { data, panelClass: 'app-dialog-panel', width: '520px' })
      .afterClosed().subscribe((saved) => { if (saved) this.loadClassification(list); });
  }

  openEditClassification(list: ClassificationList, item: LookupItem): void {
    const data: ClassificationDialogData = { type: list.type, item };
    this.dialog.open(ClassificationDialogComponent, { data, panelClass: 'app-dialog-panel', width: '520px' })
      .afterClosed().subscribe((saved) => { if (saved) this.loadClassification(list); });
  }

  deleteLookup(item: LookupItem, reload?: () => void): void {
    if (item.locked || this.deletingLookupId) return;
    if (!window.confirm(this.i18n.instant('ACTIONS.DELETE'))) return;

    this.deletingLookupId = item.id;
    this.lookups.delete(item.id).subscribe({
      next: () => {
        this.deletingLookupId = null;
        this.snack.success(this.i18n.instant('COMMON.SUCCESS'));
        reload ? reload() : this.loadLocationData();
      },
      error: (err: Error) => {
        this.deletingLookupId = null;
        this.snack.error(err.message || this.i18n.instant('COMMON.ERROR'));
      }
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
