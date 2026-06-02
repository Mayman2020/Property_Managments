import {
  Component,
  EventEmitter,
  Input,
  Output,
  forwardRef,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { NgIf } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import { I18nService } from '../../../core/i18n/i18n.service';
import { LovSelectDialogComponent } from '../lov-select-dialog/lov-select-dialog.component';

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [NgIf, MatIconModule, TranslateModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true
    }
  ],
  template: `
    <div
      class="app-lov-field"
      [class.app-lov-field--toolbar]="variant === 'toolbar'"
      [class.app-lov-field--form]="variant === 'form'"
      [class.app-lov-field--disabled]="disabled">
      <label class="app-lov-label" *ngIf="label">{{ label | translate }}</label>

      <div class="app-lov-control">
        <input
          type="text"
          class="app-lov-input"
          [value]="displayText"
          readonly
          [disabled]="disabled"
          [placeholder]="isEmpty ? (placeholder | translate) : ''"
          (click)="openPicker($event)"
          (keydown.enter)="openPicker($event); $event.preventDefault()"
          (blur)="onBlur()">

        <button
          *ngIf="clearable && !isEmpty && !disabled"
          type="button"
          class="app-lov-clear-btn"
          tabindex="-1"
          (mousedown)="$event.preventDefault()"
          (click)="clearSelection($event)"
          [attr.aria-label]="'LOV.CLEAR' | translate">
          <mat-icon>close</mat-icon>
        </button>

        <button
          type="button"
          class="app-lov-search-btn"
          tabindex="-1"
          [disabled]="disabled"
          (mousedown)="$event.preventDefault()"
          (click)="openPicker($event)"
          [attr.aria-label]="'LOV.OPEN' | translate">
          <mat-icon>search</mat-icon>
        </button>
      </div>

      <div class="app-lov-error" *ngIf="required && touched && isEmpty">
        {{ 'COMMON.REQUIRED' | translate }}
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .app-lov-field {
      position: relative;
      display: block;
      width: 100%;
    }

    .app-lov-label {
      display: block;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-muted);
      line-height: 1.2;
      margin-bottom: 6px;
    }

    .app-lov-control {
      display: flex;
      align-items: stretch;
      min-height: 42px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface-2);
      overflow: hidden;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .app-lov-control:focus-within {
      border-color: var(--navy-400);
      background: var(--surface);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--navy-400) 16%, transparent);
    }

    .app-lov-input {
      flex: 1;
      min-width: 0;
      border: none;
      background: transparent;
      outline: none;
      padding: 0 12px;
      color: var(--text-main);
      font-size: 0.88rem;
      line-height: 1.3;
      cursor: pointer;
    }

    .app-lov-input::placeholder {
      color: var(--text-muted);
      opacity: 0.85;
    }

    .app-lov-input:disabled {
      cursor: not-allowed;
      opacity: 0.65;
    }

    .app-lov-clear-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      flex: 0 0 32px;
      border: none;
      border-inline-start: 1px solid var(--line);
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }

    .app-lov-clear-btn:hover {
      background: color-mix(in srgb, var(--bad) 10%, transparent);
      color: var(--bad);
    }

    .app-lov-clear-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .app-lov-search-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 42px;
      flex: 0 0 42px;
      border: none;
      border-inline-start: 1px solid var(--line);
      background: color-mix(in srgb, var(--navy-700) 8%, var(--surface-2));
      color: var(--navy-600);
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }

    .app-lov-search-btn:hover:not(:disabled) {
      background: color-mix(in srgb, var(--navy-700) 14%, var(--surface-2));
      color: var(--navy-700);
    }

    .app-lov-search-btn:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }

    .app-lov-search-btn mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .app-lov-error {
      font-size: 0.72rem;
      color: var(--bad);
      margin-top: 4px;
    }

    /* Toolbar / filter row — same 40px line as mat-form-field filters */
    .app-lov-field--toolbar {
      height: 40px;
    }

    .app-lov-field--toolbar .app-lov-label {
      position: absolute;
      top: -7px;
      inset-inline-start: 8px;
      z-index: 2;
      margin: 0;
      padding: 0 4px;
      font-size: 0.72rem;
      font-weight: 500;
      line-height: 1;
      background: var(--surface);
      color: var(--text-muted);
      pointer-events: none;
    }

    .app-lov-field--toolbar .app-lov-control {
      height: 40px;
      min-height: 40px;
      border-radius: 6px;
    }

    .app-lov-field--toolbar .app-lov-input {
      font-size: 0.82rem;
      padding-inline: 10px;
      padding-top: 2px;
    }

    .app-lov-field--toolbar .app-lov-clear-btn {
      width: 30px;
      flex-basis: 30px;
    }

    .app-lov-field--toolbar .app-lov-clear-btn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .app-lov-field--toolbar .app-lov-search-btn {
      width: 40px;
      flex-basis: 40px;
    }

    .app-lov-field--toolbar .app-lov-search-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .app-lov-field--disabled .app-lov-control {
      opacity: 0.72;
    }
  `]
})
export class SearchableSelectComponent implements ControlValueAccessor, OnChanges, OnDestroy {
  @Input() items: any[] = [];
  @Input() label = '';
  @Input() placeholder = 'LOV.SELECT_PLACEHOLDER';
  @Input() appearance: 'fill' | 'outline' = 'outline';
  @Input() variant: 'form' | 'toolbar' = 'form';
  @Input() bindLabel: string | null = null;
  @Input() bindValue = 'id';
  @Input() required = false;
  @Input() clearable = true;
  @Input() serverSide = false;
  /** @deprecated LOV always opens dialog; kept for API compatibility. */
  @Input() dialogThreshold = 10;
  @Output() searchTextChange = new EventEmitter<string>();

  displayText = '';
  touched = false;
  disabled = false;

  private _value: unknown;
  private openDialogRef: ReturnType<MatDialog['open']> | null = null;
  private readonly dialog = inject(MatDialog);

  onChange: (value: unknown) => void = () => {};
  onTouched: () => void = () => {};

  constructor(private readonly i18n: I18nService) {}

  get isEmpty(): boolean {
    return this._value === null || this._value === undefined || this._value === '';
  }

  ngOnDestroy(): void {
    this.openDialogRef?.close();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items']) {
      this.syncDisplayFromValue();
      this.refreshOpenDialogItems();
    }
  }

  openPicker(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.disabled) return;
    this.openLovDialog();
  }

  onBlur(): void {
    this.touched = true;
    this.onTouched();
  }

  clearSelection(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled) return;
    this._value = null;
    this.displayText = '';
    this.touched = true;
    this.onChange(null);
    this.onTouched();
  }

  getItemLabel(item: any): string {
    if (!item) return '';
    if (this.bindLabel) return String(item[this.bindLabel] ?? '');

    let name = '';
    if (this.i18n.currentLang === 'ar') {
      name = item.nameAr || item.propertyNameAr || item.label || item.fullName || item.name || item.propertyName || item.unitNumber || '';
    } else {
      name = item.nameEn || item.propertyNameEn || item.fullName || item.name || item.label || item.propertyName || item.unitNumber || '';
    }
    const code = (item.propertyCode || '').trim();
    if (code && name && !name.includes(code)) return `${code} — ${name}`;
    return code || name || String(item[this.bindValue] ?? '');
  }

  writeValue(value: unknown): void {
    this._value = value;
    this.syncDisplayFromValue();
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  private itemValue(item: any): unknown {
    return item?.[this.bindValue];
  }

  private onSelected(item: any): void {
    this._value = item ? this.itemValue(item) : null;
    this.displayText = item ? this.getItemLabel(item) : '';
    this.onChange(this._value);
  }

  private syncDisplayFromValue(): void {
    if (!this.isEmpty && this.items?.length) {
      const item = this.items.find((i) => String(this.itemValue(i)) === String(this._value));
      this.displayText = item ? this.getItemLabel(item) : this.displayText;
      return;
    }
    if (this.isEmpty) {
      this.displayText = '';
    }
  }

  private openLovDialog(): void {
    if (this.openDialogRef) return;

    this.openDialogRef = this.dialog.open(LovSelectDialogComponent, {
      width: '760px',
      maxWidth: '94vw',
      maxHeight: '88vh',
      panelClass: 'app-dialog-panel',
      autoFocus: true,
      data: {
        title: this.label,
        items: this.items,
        selectedValue: this._value,
        bindValue: this.bindValue,
        serverSide: this.serverSide,
        getItemLabel: (item: unknown) => this.getItemLabel(item),
        getItemValue: (item: unknown) => (item as Record<string, unknown>)?.[this.bindValue],
        onSearch: (query: string) => this.searchTextChange.emit(query)
      }
    });

    this.openDialogRef.afterClosed().subscribe((item) => {
      this.openDialogRef = null;
      if (item !== undefined) {
        this.onSelected(item);
      }
    });
  }

  private refreshOpenDialogItems(): void {
    const ref = this.openDialogRef;
    if (!ref) return;
    const component = ref.componentInstance as LovSelectDialogComponent | undefined;
    component?.updateItems(this.items);
  }
}
