import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { I18nService } from '../../../core/i18n/i18n.service';
import { PermissionService } from '../../../core/services/permission.service';

export interface ExportColumn<T = unknown> {
  header: string;
  value: keyof T | ((row: T, index: number) => unknown);
}

@Component({
  selector: 'app-table-export-toolbar',
  standalone: true,
  imports: [NgIf, MatButtonModule, MatTooltipModule],
  template: `
    <div class="export-toolbar" *ngIf="canExport" [class.export-toolbar--inline]="inline">
      <button mat-stroked-button type="button" (click)="exportExcel()" [disabled]="disabled || !hasRows" [matTooltip]="excelLabel">
        <span class="material-icons">table_view</span>
        Excel
      </button>
    </div>
  `,
  styles: [`
    .export-toolbar {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 8px;
      padding: 0 0 12px;
      flex-wrap: wrap;
    }

    .export-toolbar button {
      border-radius: 8px;
    }

    .export-toolbar .material-icons {
      font-size: 18px;
      margin-inline-end: 6px;
    }

    .export-toolbar--inline {
      padding: 0;
      justify-content: flex-start;
    }
  `]
})
export class TableExportToolbarComponent<T = unknown> {
  /** When true, no extra vertical padding — use beside other buttons in a toolbar row. */
  @Input() inline = false;
  @Input() title = 'Export';
  @Input() fileName = 'export';
  @Input() permissionKey?: string;
  @Input() columns: ExportColumn<T>[] = [];
  @Input() rows: T[] = [];
  @Input() loadRows?: () => Promise<T[]>;
  @Input() disabled = false;

  constructor(
    private readonly permissions: PermissionService,
    private readonly i18n: I18nService
  ) {}

  get canExport(): boolean {
    return !this.permissionKey || this.permissions.can(this.permissionKey, 'export');
  }

  get hasRows(): boolean {
    return !!this.loadRows || this.rows.length > 0;
  }

  get excelLabel(): string {
    return this.i18n.instant('COMMON.EXPORT_EXCEL');
  }

  async exportExcel(): Promise<void> {
    const table = this.tableRows(await this.resolveRows());
    import('xlsx').then((XLSX) => {
      const ws = XLSX.utils.aoa_to_sheet([this.headers(), ...table]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, this.sheetName());
      XLSX.writeFile(wb, `${this.safeFileName()}-${this.fileDate()}.xlsx`);
    });
  }

  private headers(): string[] {
    return this.columns.map((column) => column.header);
  }

  private tableRows(rows: T[]): unknown[][] {
    return rows.map((row, rowIndex) =>
      this.columns.map((column) => {
        const value = typeof column.value === 'function'
          ? column.value(row, rowIndex)
          : (row as Record<string, unknown>)[String(column.value)];
        return value ?? '-';
      })
    );
  }

  private safeFileName(): string {
    return (this.fileName || this.title || 'export').replace(/[\\/:*?"<>|]+/g, '-').trim();
  }

  private sheetName(): string {
    return (this.title || this.fileName || 'Export').replace(/[\\/?*[\]:]+/g, ' ').slice(0, 31);
  }

  private resolveRows(): Promise<T[]> {
    return this.loadRows ? this.loadRows() : Promise.resolve(this.rows);
  }

  private fileDate(separator = '-'): string {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}${separator}${month}${separator}${date.getFullYear()}`;
  }
}
