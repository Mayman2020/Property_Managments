import { NativeDateAdapter } from '@angular/material/core';
import { formatDate } from '@angular/common';

export class DateFormatAdapter extends NativeDateAdapter {
  override format(date: Date, displayFormat: string): string {
    if (!this.isValid(date)) {
      throw Error('DateFormatAdapter: Cannot format invalid date.');
    }
    return formatDate(date, displayFormat, this.locale as string);
  }
}
