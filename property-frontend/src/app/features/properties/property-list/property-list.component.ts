import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PropertyService, Property } from '../../../core/services/property.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { UnitService } from '../../../core/services/unit.service';

@Component({
  selector: 'app-property-list',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    RouterLink,
    TranslateModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
    EmptyStateComponent
  ],
  templateUrl: './property-list.component.html',
  styleUrl: './property-list.component.scss'
})
export class PropertyListComponent implements OnInit {
  properties: Property[] = [];
  loading = true;
  totalElements = 0;
  page = 0;
  searchTerm = '';
  occupancyByPropertyId: Record<number, { occupied: number; total: number }> = {};

  constructor(
    private readonly propertySvc: PropertyService,
    private readonly unitSvc: UnitService,
    private readonly snack: SnackService,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.propertySvc.getAll(this.page, 20, this.searchTerm).subscribe({
      next: (res) => {
        this.properties = res.data?.content ?? [];
        this.totalElements = res.data?.totalElements ?? 0;

        if (!this.properties.length) {
          this.occupancyByPropertyId = {};
          this.loading = false;
          return;
        }

        forkJoin(
          this.properties.map((property) =>
            this.unitSvc.getByProperty(property.id, 0, 400).pipe(
              map((unitsRes) => ({
                propertyId: property.id,
                total: unitsRes.data?.content?.length ?? property.totalUnits ?? 0,
                occupied: (unitsRes.data?.content ?? []).filter((unit) => unit.rented).length
              })),
              catchError(() =>
                of({
                  propertyId: property.id,
                  total: property.totalUnits ?? 0,
                  occupied: property.totalUnits ?? 0
                })
              )
            )
          )
        ).subscribe({
          next: (stats) => {
            this.occupancyByPropertyId = stats.reduce((acc, item) => {
              acc[item.propertyId] = { occupied: item.occupied, total: item.total };
              return acc;
            }, {} as Record<number, { occupied: number; total: number }>);
            this.loading = false;
          },
          error: () => {
            this.loading = false;
          }
        });
      },
      error: () => {
        this.loading = false;
        this.snack.error(this.i18n.instant('PROPERTY_LIST.LOAD_ERROR'));
      }
    });
  }

  get pageEyebrow(): string {
    return this.i18n.currentLang === 'ar' ? 'الدليل' : 'Directory';
  }

  typeLabel(type: string): string {
    return this.i18n.instant(`PROPERTY_TYPE.${type}`);
  }

  occupancy(property: Property): number {
    const stats = this.occupancyByPropertyId[property.id];
    if (!stats?.total) return 0;
    return Math.round((stats.occupied / stats.total) * 100);
  }

  occupiedUnits(property: Property): number {
    return this.occupancyByPropertyId[property.id]?.occupied ?? property.totalUnits ?? 0;
  }

  vacantUnits(property: Property): number {
    const stats = this.occupancyByPropertyId[property.id];
    if (!stats) return 0;
    return Math.max(0, stats.total - stats.occupied);
  }

  onSearch(value: string): void {
    this.searchTerm = value;
    this.page = 0;
    this.load();
  }
}
