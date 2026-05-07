import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { NgForOf, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { TranslateModule } from '@ngx-translate/core';

export interface FilterSpec {
  key: string;
  label: string;
  type: 'text'|'number'|'select';
  options?: { value: any; label: string }[];
}

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatOptionModule, TranslateModule],
  template: `
    <div class="estate-filter-bar" style="display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding:8px 0 0;">
      <ng-container *ngFor="let f of filters">
        <mat-form-field appearance="outline" [class]="'filter-field filter-field--' + f.key" floatLabel="always" *ngIf="f.type !== 'select'">
          <mat-label>{{ f.label | translate }}</mat-label>
          <input matInput [type]="f.type === 'number' ? 'number' : 'text'" [(ngModel)]="values[f.key]" (ngModelChange)="emit()">
        </mat-form-field>
        <mat-form-field appearance="outline" [class]="'filter-field filter-field--' + f.key" floatLabel="always" *ngIf="f.type === 'select'">
          <mat-label>{{ f.label | translate }}</mat-label>
          <mat-select [(ngModel)]="values[f.key]" (selectionChange)="emit()">
            <mat-option [value]="null">—</mat-option>
            <mat-option *ngFor="let o of f.options || []" [value]="o.value">{{ o.label }}</mat-option>
          </mat-select>
        </mat-form-field>
      </ng-container>
    </div>
  `,
  styles: [`
    .estate-filter-bar { align-items: center; }
    .filter-field { width: 240px; min-width: 180px; }
  `]
})
export class FilterBarComponent implements OnChanges {
  @Input() filters: FilterSpec[] = [];
  @Input() filterValues: { [key: string]: any } = {};
  @Output() filtersChange = new EventEmitter<any>();

  // Holds current values for all keys
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

  emit() {
    this.filtersChange.emit({ ...this.values });
  }

  clear() {
    for (const k of Object.keys(this.values)) {
      this.values[k] = null;
    }
    this.emit();
  }
}
