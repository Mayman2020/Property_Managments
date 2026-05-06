import { Component, Input, forwardRef, OnInit, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { NgIf, NgFor, AsyncPipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, Subject, map, merge, startWith } from 'rxjs';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [
    NgIf, NgFor, AsyncPipe, ReactiveFormsModule,
    MatAutocompleteModule, MatInputModule, MatFormFieldModule, MatIconModule, TranslateModule
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true
    }
  ],
  template: `
    <mat-form-field [appearance]="appearance" class="full-width">
      <mat-label>{{ label | translate }}</mat-label>
      <input type="text"
             matInput
             #input
             [formControl]="searchControl"
             [matAutocomplete]="auto"
             [placeholder]="placeholder | translate"
             (focus)="onFocus()"
             (mousedown)="onFocus()"
             (blur)="onBlur()">
      <mat-icon matSuffix class="dropdown-icon" (click)="$event.stopPropagation(); onFocus()">arrow_drop_down</mat-icon>
      <mat-autocomplete #auto="matAutocomplete" [displayWith]="displayFn.bind(this)" (optionSelected)="onSelected($event.option.value)">
        <mat-option *ngFor="let item of filteredItems$ | async" [value]="item">
          {{ getItemLabel(item) }}
        </mat-option>
      </mat-autocomplete>
      <mat-error *ngIf="required && searchControl.invalid && searchControl.touched">
        {{ 'COMMON.REQUIRED' | translate }}
      </mat-error>
    </mat-form-field>
  `,
  styles: [`
    .full-width { width: 100%; cursor: pointer; }
    .dropdown-icon { color: rgba(0,0,0,.54); }
    ::ng-deep .mat-mdc-option {
      font-family: inherit;
    }
  `]
})
export class SearchableSelectComponent implements ControlValueAccessor, OnInit, OnChanges, OnDestroy {
  @ViewChild(MatAutocompleteTrigger) autoTrigger!: MatAutocompleteTrigger;
  @Input() items: any[] = [];
  @Input() label = '';
  @Input() placeholder = '';
  @Input() appearance: 'fill' | 'outline' = 'outline';
  @Input() bindLabel: string | null = null; // if null, uses smart lookup (nameAr/nameEn)
  @Input() bindValue = 'id';
  @Input() required = false;

  searchControl = new FormControl();
  focus$ = new Subject<string>();
  filteredItems$!: Observable<any[]>;

  private _value: any;
  onChange: any = () => {};
  onTouched: any = () => {};

  constructor(private readonly i18n: I18nService) {}

  ngOnInit() {
    this.filteredItems$ = merge(
      this.searchControl.valueChanges,
      this.focus$
    ).pipe(
      startWith(''),
      map((value) => {
        if (value === null || value === undefined) return '';
        // Only strings are user search text. Objects (selected mat-option value) must not
        // narrow the list — otherwise e.g. label "عقار 1" filters out "عقار 2" and "عقار 3".
        if (typeof value === 'string') return value.trim();
        return '';
      }),
      map((filterStr) => (filterStr ? this._filter(filterStr) : this.items.slice()))
    );
  }

  onFocus() {
    this.focus$.next(this.searchControl.value || '');
    if (this.autoTrigger) {
      this.autoTrigger.openPanel();
    }
  }

  ngOnDestroy() {
    this.focus$.complete();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['items'] && this.items) {
      // If items changed, update the visible value in case current value is now in items
      this.writeValue(this._value);
    }
  }

  getItemLabel(item: any): string {
    if (!item) return '';
    if (this.bindLabel) return item[this.bindLabel] || '';
    
    // Default smart lookup for our system (Arabic/English support)
    if (this.i18n.currentLang === 'ar') {
      return item.nameAr || item.propertyNameAr || item.label || item.fullName || item.name || item.propertyName || item.unitNumber || '';
    }
    return item.nameEn || item.propertyNameEn || item.fullName || item.name || item.label || item.propertyName || item.unitNumber || '';
  }

  displayFn(item: any): string {
    return this.getItemLabel(item);
  }

  private _filter(name: string): any[] {
    const filterValue = name.toLowerCase();
    return this.items.filter(item => 
      this.getItemLabel(item).toLowerCase().includes(filterValue)
    );
  }

  onSelected(item: any) {
    this._value = item ? item[this.bindValue] : null;
    this.onChange(this._value);
  }

  onBlur() {
    this.onTouched();
    const current = this.searchControl.value;
    if (typeof current === 'string' && current.trim()) {
      const found = this.items.find(i => this.getItemLabel(i).toLowerCase() === current.toLowerCase());
      if (found) {
        this.onSelected(found);
        this.searchControl.setValue(found, { emitEvent: false });
      } else {
        // If not found, we might want to clear or keep? 
        // For strict select, we clear.
        this.searchControl.setValue(null, { emitEvent: false });
        this.onSelected(null);
      }
    } else if (!current) {
      this.onSelected(null);
    }
  }

  // ControlValueAccessor
  writeValue(value: any): void {
    this._value = value;
    if (this.items && value !== null) {
      const item = this.items.find(i => i[this.bindValue] === value);
      this.searchControl.setValue(item, { emitEvent: false });
    } else {
      this.searchControl.setValue(null, { emitEvent: false });
    }
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void {
    isDisabled ? this.searchControl.disable() : this.searchControl.enable();
  }
}
