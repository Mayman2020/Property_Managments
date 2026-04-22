import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PropertyService, Property } from '../../../core/services/property.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-property-list',
  standalone: true,
  imports: [
    NgFor, NgIf, RouterLink, TranslateModule,
    MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule, MatTooltipModule,
    PageHeaderComponent, EmptyStateComponent
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

  constructor(
    private readonly propertySvc: PropertyService,
    private readonly snack: SnackService,
    private readonly i18n: I18nService
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
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.error(this.i18n.instant('PROPERTY_LIST.LOAD_ERROR'));
      }
    });
  }

  typeLabel(type: string): string {
    return this.i18n.instant(`PROPERTY_TYPE.${type}`);
  }

  typeBadgeClass(type: string): string {
    const m: Record<string, string> = { RESIDENTIAL: 'type-res', COMMERCIAL: 'type-com', MIXED: 'type-mix' };
    return m[type] ?? '';
  }

  onSearch(value: string): void {
    this.searchTerm = value;
    this.page = 0;
    this.load();
  }
}
