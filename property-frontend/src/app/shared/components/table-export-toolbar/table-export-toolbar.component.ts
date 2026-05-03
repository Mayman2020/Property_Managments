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
    <div class="export-toolbar" *ngIf="canExport">
      <button mat-stroked-button type="button" (click)="exportExcel()" [disabled]="disabled || !hasRows" [matTooltip]="excelLabel">
        <span class="material-icons">table_view</span>
        Excel
      </button>
      <button mat-stroked-button *ngIf="showPdf" mat-stroked-button type="button" (click)="exportPdf()" [disabled]="disabled || !hasRows" [matTooltip]="pdfLabel">
        <span class="material-icons">picture_as_pdf</span>
        PDF
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
  `]
})
export class TableExportToolbarComponent<T = unknown> {
  @Input() title = 'Export';
  @Input() fileName = 'export';
  @Input() permissionKey?: string;
  @Input() columns: ExportColumn<T>[] = [];
  @Input() rows: T[] = [];
  @Input() loadRows?: () => Promise<T[]>;
  @Input() disabled = false;
  // PDF export is disabled by default to align with the new standard (privacy/size considerations).
  @Input() showPdf = false;

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

  get pdfLabel(): string {
    return this.i18n.instant('COMMON.EXPORT_PDF');
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

  async exportPdf(): Promise<void> {
    const table = this.tableRows(await this.resolveRows());
    import('jspdf').then(({ default: jsPDF }) => {
      import('jspdf-autotable').then(() => {
        const doc = new jsPDF({ orientation: this.headers().length > 5 ? 'landscape' : 'portrait' });
        doc.setFontSize(15);
        doc.text(this.title || this.fileName, 14, 18);
        doc.setFontSize(9);
        doc.text(this.fileDate('/'), 14, 25);

        (doc as any).autoTable({
          startY: 32,
          head: [this.headers()],
          body: table,
          styles: { font: 'helvetica', fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [19, 78, 74], textColor: 255 },
          didDrawPage: () => {
            const pageCount = (doc as any).internal.getNumberOfPages();
            const pageSize = doc.internal.pageSize;
            doc.setFontSize(8);
            doc.text(`${pageCount}`, pageSize.getWidth() - 14, pageSize.getHeight() - 8);
          }
        });

        doc.save(`${this.safeFileName()}-${this.fileDate()}.pdf`);
      });
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
