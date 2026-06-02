import { Component, EventEmitter, Input, Output, forwardRef, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { SearchableSelectComponent } from '../searchable-select/searchable-select.component';
import { I18nService } from '../../../core/i18n/i18n.service';

export interface EstateLovOption {
  value: unknown;
  label: string;
}

/**
 * Unified workspace/toolbar LOV — replaces native `estate-property-select` lists system-wide.
 * Always opens the LOV dialog via {@link SearchableSelectComponent}.
 */
@Component({
  selector: 'app-estate-lov-select',
  standalone: true,
  imports: [FormsModule, TranslateModule, SearchableSelectComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EstateLovSelectComponent),
      multi: true
    }
  ],
  template: `
    <app-searchable-select
      [class]="cssClass"
      [label]="label"
      [items]="lovItems"
      bindLabel="label"
      bindValue="value"
      variant="toolbar"
      [serverSide]="serverSide"
      [clearable]="clearable"
      [placeholder]="placeholderKey | translate"
      [(ngModel)]="innerValue"
      (ngModelChange)="onInnerChange($event)"
      (searchTextChange)="searchTextChange.emit($event)">
    </app-searchable-select>
  `,
  styles: [`
    :host {
      display: block;
      flex: 0 1 auto;
      min-width: 160px;
      height: 40px;
    }
  `]
})
export class EstateLovSelectComponent implements ControlValueAccessor, OnInit, OnChanges {
  @Input() label = '';
  @Input() options: EstateLovOption[] = [];
  @Input() showAll = false;
  @Input() allLabelKey = 'ACTIONS.VIEW_ALL';
  @Input() placeholderKey = 'LOV.SELECT_PLACEHOLDER';
  @Input() serverSide = false;
  @Input() clearable = true;
  @Input() cssClass = 'estate-lov-select';

  @Output() searchTextChange = new EventEmitter<string>();
  @Output() valueChange = new EventEmitter<unknown>();

  lovItems: EstateLovOption[] = [];
  innerValue: unknown = null;
  disabled = false;

  private onChange: (value: unknown) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private readonly i18n: I18nService) {}

  ngOnInit(): void {
    this.rebuildItems();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options'] || changes['showAll'] || changes['allLabelKey']) {
      this.rebuildItems();
    }
  }

  writeValue(value: unknown): void {
    this.innerValue = value ?? null;
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

  onInnerChange(value: unknown): void {
    this.innerValue = value ?? null;
    this.onChange(this.innerValue);
    this.onTouched();
    this.valueChange.emit(this.innerValue);
  }

  private rebuildItems(): void {
    const base = this.options ?? [];
    if (!this.showAll) {
      this.lovItems = base;
      return;
    }
    this.lovItems = [
      { value: null, label: this.i18n.instant(this.allLabelKey) },
      ...base
    ];
  }
}
