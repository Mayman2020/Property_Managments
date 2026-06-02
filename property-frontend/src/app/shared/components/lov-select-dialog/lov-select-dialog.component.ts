import { Component, Inject, OnDestroy } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { DialogTitleCloseDirective } from '../../directives/dialog-title-close.directive';

export interface LovSelectDialogData {
  title: string;
  items: unknown[];
  selectedValue?: unknown;
  bindValue?: string;
  getItemLabel: (item: unknown) => string;
  getItemValue: (item: unknown) => unknown;
  onSearch?: (query: string) => void;
  serverSide?: boolean;
}

@Component({
  selector: 'app-lov-select-dialog',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    ReactiveFormsModule,
    TranslateModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    DialogTitleCloseDirective
  ],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon class="dialog-title-icon">search</mat-icon>
      {{ data.title | translate }}
    </h2>

    <mat-dialog-content class="lov-dialog-body">
      <div class="lov-dialog-search">
        <mat-icon>search</mat-icon>
        <input
          type="text"
          [formControl]="searchControl"
          [placeholder]="'LOV.SEARCH_PLACEHOLDER' | translate"
          autocomplete="off">
      </div>

      <div class="lov-dialog-loading" *ngIf="loading">
        <mat-spinner diameter="36"></mat-spinner>
      </div>

      <div class="app-table-wrap lov-dialog-table-wrap" *ngIf="!loading">
        <table class="app-data-table lov-dialog-table" *ngIf="visibleItems.length; else emptyTpl">
          <tbody>
            <tr
              *ngFor="let item of visibleItems"
              [class.selected]="isSelected(item)"
              tabindex="0"
              (click)="pick(item)"
              (keydown.enter)="pick(item)">
              <td>{{ data.getItemLabel(item) }}</td>
              <td class="pick-col">
                <mat-icon *ngIf="isSelected(item)">check_circle</mat-icon>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ng-template #emptyTpl>
        <div class="lov-dialog-empty">{{ 'COMMON.NO_RESULTS' | translate }}</div>
      </ng-template>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="close()">{{ 'COMMON.CANCEL' | translate }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .lov-dialog-body {
      display: grid;
      gap: 14px;
      min-width: min(680px, 92vw);
      padding-top: 4px !important;
    }

    .lov-dialog-search {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 42px;
      padding: 0 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface-2);
    }

    .lov-dialog-search mat-icon {
      color: var(--text-muted);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .lov-dialog-search input {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      color: var(--text-main);
      font-size: 0.92rem;
    }

    .lov-dialog-table-wrap {
      max-height: min(52vh, 420px);
      overflow: auto;
      border: 1px solid var(--line);
      border-radius: 8px;
    }

    .lov-dialog-table {
      margin: 0;
    }

    .lov-dialog-table tbody tr {
      cursor: pointer;
      transition: background 0.15s;
    }

    .lov-dialog-table tbody tr:hover,
    .lov-dialog-table tbody tr:focus-visible {
      background: color-mix(in srgb, var(--navy-400) 8%, transparent);
      outline: none;
    }

    .lov-dialog-table tbody tr.selected {
      background: color-mix(in srgb, var(--navy-400) 14%, transparent);
      font-weight: 600;
    }

    .lov-dialog-table td {
      padding: 10px 14px;
      font-size: 0.88rem;
    }

    .pick-col {
      width: 44px;
      text-align: center;
      color: var(--navy-500);
    }

    .pick-col mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .lov-dialog-empty {
      padding: 28px 12px;
      text-align: center;
      color: var(--text-muted);
      border: 1px dashed var(--line);
      border-radius: 8px;
    }

    .lov-dialog-loading {
      display: flex;
      justify-content: center;
      padding: 28px 0;
    }
  `]
})
export class LovSelectDialogComponent implements OnDestroy {
  searchControl = new FormControl('', { nonNullable: true });
  visibleItems: unknown[] = [];
  loading = false;

  private readonly destroy$ = new Subject<void>();
  private readonly bindValue: string;

  constructor(
    private readonly dialogRef: MatDialogRef<LovSelectDialogComponent, unknown | undefined>,
    @Inject(MAT_DIALOG_DATA) readonly data: LovSelectDialogData
  ) {
    this.bindValue = data.bindValue ?? 'id';
    this.visibleItems = [...(data.items ?? [])];

    this.searchControl.valueChanges.pipe(
      debounceTime(data.serverSide ? 300 : 120),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe((query) => this.applySearch(query));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  updateItems(items: unknown[]): void {
    this.data.items = items;
    this.loading = false;
    const q = this.searchControl.value.trim();
    if (this.data.serverSide) {
      this.visibleItems = [...items];
      return;
    }
    this.applySearch(q);
  }

  setLoading(loading: boolean): void {
    this.loading = loading;
  }

  pick(item: unknown): void {
    this.dialogRef.close(item);
  }

  close(): void {
    this.dialogRef.close(undefined);
  }

  isSelected(item: unknown): boolean {
    return String(this.data.getItemValue(item)) === String(this.data.selectedValue ?? '');
  }

  private applySearch(query: string): void {
    const q = query.trim();
    if (this.data.serverSide && this.data.onSearch) {
      this.loading = true;
      this.data.onSearch(q);
      if (!q) {
        this.visibleItems = [...(this.data.items ?? [])];
      }
      return;
    }

    if (!q) {
      this.visibleItems = [...(this.data.items ?? [])];
      return;
    }

    const lower = q.toLowerCase();
    this.visibleItems = (this.data.items ?? []).filter((item) =>
      this.data.getItemLabel(item).toLowerCase().includes(lower)
    );
  }
}
