import { Pipe, PipeTransform } from '@angular/core';

/** Sequential row number for paginated tables (1, 2, 3…), independent of record id or sort order. */
export function tableRowNumber(pageIndex: number, pageSize: number, rowIndex: number): number {
  const page = Number(pageIndex) || 0;
  const size = Number(pageSize) || 1;
  const index = Number(rowIndex) || 0;
  return page * size + index + 1;
}

@Pipe({ name: 'tableRowIndex', standalone: true })
export class TableRowIndexPipe implements PipeTransform {
  transform(rowIndex: number, pageIndex = 0, pageSize = 10): number {
    return tableRowNumber(pageIndex, pageSize, rowIndex);
  }
}
