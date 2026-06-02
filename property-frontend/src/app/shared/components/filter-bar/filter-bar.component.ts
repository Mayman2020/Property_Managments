import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { NgForOf, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { TranslateModule } from '@ngx-translate/core';

import { SearchableSelectComponent } from '../searchable-select/searchable-select.component';

export interface FilterSpec {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'lov';
  options?: { value: any; label: string }[];
  dialogThreshold?: number;
  serverSide?: boolean;
}

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    TranslateModule,
    SearchableSelectComponent
  ],
  template: `
    <div class="estate-filter-bar">
      <ng-container *ngFor="let f of filters">
        <mat-form-field
          appearance="outline"
          [class]="'filter-field filter-field--' + f.key"
          floatLabel="always"
          *ngIf="f.type === 'text' || f.type === 'number'">
          <mat-label>{{ f.label | translate }}</mat-label>
          <input matInput [type]="f.type === 'number' ? 'number' : 'text'" [(ngModel)]="values[f.key]" (ngModelChange)="emit()">
        </mat-form-field>

        <app-searchable-select
          *ngIf="usesLov(f)"
          [class]="'filter-lov filter-lov--' + f.key"
          [label]="f.label"
          [items]="lovItems(f)"
          bindLabel="label"
          bindValue="value"
          variant="toolbar"
          [serverSide]="!!f.serverSide"
          [(ngModel)]="values[f.key]"
          (ngModelChange)="emit()">
        </app-searchable-select>
      </ng-container>
    </div>
  `,
  styles: [`
    .estate-filter-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      padding: 0;
    }

    .filter-field,
    .filter-lov {
      flex: 0 1 auto;
      width: 180px;
      min-width: 0;
      margin-bottom: 0;
    }

    .filter-field .mat-mdc-form-field-wrapper {
      padding-bottom: 0;
    }

    .filter-field .mat-mdc-text-field-wrapper {
      height: 40px !important;
      background: var(--surface-2) !important;
      border-radius: 6px;
    }

    .filter-field .mat-mdc-form-field-flex {
      height: 40px !important;
      align-items: center !important;
    }

    .filter-field .mat-mdc-form-field-infix {
      display: flex;
      align-items: center;
      min-height: 40px !important;
      padding: 10px 0 6px !important;
      font-size: 0.82rem;
    }

    .filter-field .mat-mdc-form-field-subscript-wrapper {
      display: none;
    }

    .filter-field .mat-mdc-floating-label {
      font-size: 0.72rem;
    }

    .filter-field .mat-mdc-select-trigger {
      height: 22px;
      display: flex;
      align-items: center;
    }

    .filter-field .mat-mdc-select-value,
    .filter-field input {
      font-size: 0.82rem;
      line-height: 20px;
    }
  `]
})
export class FilterBarComponent implements OnChanges {
  @Input() filters: FilterSpec[] = [];
  @Input() filterValues: { [key: string]: any } = {};
  @Output() filtersChange = new EventEmitter<any>();

  values: { [key: string]: any } = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filterValues'] || changes['filters']) {
      const nextValues: { [key: string]: any } = {};
      let changed = Object.keys(this.values).length !== this.filters.length;
      for (const filter of this.filters) {
        nextValues[filter.key] = this.filterValues?.[filter.key] ?? null;
        if (this.values[filter.key] !== nextValues[filter.key]) {
          changed = true;
        }
      }
      if (changed) {
        this.values = nextValues;
      }
    }
  }

  usesLov(filter: FilterSpec): boolean {
    return filter.type === 'lov' || filter.type === 'select';
  }

  lovItems(filter: FilterSpec): { value: unknown; label: string }[] {
    return filter.options ?? [];
  }

  emit(): void {
    this.filtersChange.emit({ ...this.values });
  }

  clear(): void {
    for (const k of Object.keys(this.values)) {
      this.values[k] = null;
    }
    this.emit();
  }
}
