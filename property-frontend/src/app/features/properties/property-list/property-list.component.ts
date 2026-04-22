import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PropertyService, Property } from '../../../core/services/property.service';
import { SnackService } from '../../../core/services/snack.service';

@Component({
  selector: 'app-property-list',
  standalone: true,
  imports: [
    NgFor, NgIf, RouterLink,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule,
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

  constructor(
    private readonly propertySvc: PropertyService,
    private readonly snack: SnackService
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.propertySvc.getAll(this.page).subscribe({
      next: (res) => { this.properties = res.data?.content ?? []; this.totalElements = res.data?.totalElements ?? 0; this.loading = false; },
      error: () => { this.loading = false; this.snack.error('Failed to load properties'); }
    });
  }

  typeLabel(type: string): string {
    const m: Record<string, string> = { RESIDENTIAL: 'سكني', COMMERCIAL: 'تجاري', MIXED: 'مختلط' };
    return m[type] ?? type;
  }

  typeBadgeClass(type: string): string {
    const m: Record<string, string> = { RESIDENTIAL: 'type-res', COMMERCIAL: 'type-com', MIXED: 'type-mix' };
    return m[type] ?? '';
  }
}
