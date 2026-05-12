import {
  Component, Input, Output, EventEmitter,
  HostListener, ElementRef, OnChanges, SimpleChanges,
  ViewChild, AfterViewInit, OnDestroy
} from '@angular/core';
import { NgIf, NgFor, NgClass, NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

export interface SearchDropdownItem {
  label: string;
  subLabel?: string;
  badge?: string;
  badgeClass?: string;
  data: any;
}

@Component({
  selector: 'app-search-dropdown',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, NgStyle, FormsModule, TranslateModule],
  template: `
    <div class="sdd-host" [class.sdd-open]="panelOpen" #hostEl>
      <!-- Input row -->
      <div class="sdd-input-row" #inputRow (mousedown)="openFromRow($event)">
        <span class="material-icons sdd-icon">search</span>
        <input
          #searchInput
          class="sdd-input"
          [(ngModel)]="searchText"
          (ngModelChange)="onTextChange()"
          (focus)="openPanel()"
          [placeholder]="placeholder || ('ACTIONS.SEARCH' | translate)"
          autocomplete="off">
        <button *ngIf="selected" type="button" class="sdd-clear" (click)="clearSelection($event)">
          <span class="material-icons">close</span>
        </button>
        <span class="material-icons sdd-chevron" (click)="openPanel()">
          {{ panelOpen ? 'expand_less' : 'expand_more' }}
        </span>
      </div>
    </div>

    <!-- Panel rendered at document root level via fixed positioning -->
    <div
      class="sdd-panel"
      *ngIf="panelOpen"
      [ngStyle]="panelStyle">
      <div class="sdd-scroll">
        <button
          *ngFor="let item of filteredItems"
          type="button"
          class="sdd-option"
          [class.sdd-option-selected]="item === selected"
          (mousedown)="pickItem(item, $event)">
          <div class="sdd-option-main">
            <span class="sdd-option-label">{{ item.label }}</span>
            <span class="sdd-option-badge" *ngIf="item.badge" [ngClass]="item.badgeClass || ''">
              {{ item.badge }}
            </span>
          </div>
          <div class="sdd-option-sub" *ngIf="item.subLabel">{{ item.subLabel }}</div>
        </button>

        <div class="sdd-empty" *ngIf="filteredItems.length === 0">
          <span class="material-icons">search_off</span>
          {{ 'ACTIONS.NO_RESULTS' | translate }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; position: relative; }

    .sdd-host {
      position: relative;
      border-radius: 12px;
      background: var(--paper-2);
      border: 1px solid transparent;
      transition: border-color var(--t-fast), box-shadow var(--t-fast);
    }

    .sdd-host:focus-within,
    .sdd-host.sdd-open {
      border-color: var(--accent);
      background: var(--surface);
      box-shadow: 0 0 0 3px rgba(var(--accent-rgb, 100,120,180), 0.12);
    }

    .sdd-input-row {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 42px;
      padding: 0 10px 0 14px;
      cursor: pointer;
    }

    .sdd-icon {
      font-size: 18px;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .sdd-input {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      color: var(--text-main);
      font-size: 13.5px;
      font-family: inherit;
      min-width: 0;
      cursor: text;
    }

    .sdd-input::placeholder { color: var(--text-muted); }

    .sdd-clear {
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: transparent;
      cursor: pointer;
      color: var(--text-muted);
      padding: 2px;
      border-radius: 50%;
      flex-shrink: 0;
      transition: color var(--t-fast);
    }
    .sdd-clear:hover { color: var(--danger, #c62828); }
    .sdd-clear .material-icons { font-size: 16px; }

    .sdd-chevron {
      font-size: 20px;
      color: var(--text-muted);
      flex-shrink: 0;
      cursor: pointer;
      transition: transform 200ms ease;
    }
    .sdd-open .sdd-chevron { transform: rotate(180deg); }

    /* Panel is rendered via ngStyle with fixed position — these are base styles only */
    .sdd-panel {
      position: fixed;
      z-index: 9999;
      background: var(--surface);
      border: 1px solid var(--line-2);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08);
      overflow: hidden;
      animation: sddSlideIn 150ms ease;
    }

    @keyframes sddSlideIn {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .sdd-scroll {
      max-height: 280px;
      overflow-y: auto;
      padding: 6px;
    }

    .sdd-option {
      display: block;
      width: 100%;
      text-align: start;
      border: none;
      background: transparent;
      padding: 10px 14px;
      border-radius: 8px;
      cursor: pointer;
      transition: background var(--t-fast);
      font-family: inherit;
    }

    .sdd-option:hover { background: var(--surface-2); }
    .sdd-option-selected { background: rgba(100,120,180,0.1) !important; }

    .sdd-option-main {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sdd-option-label {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text-main);
      font-family: var(--font-mono, monospace);
    }

    .sdd-option-badge {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 20px;
      background: var(--surface-2);
      color: var(--text-muted);
    }

    .sdd-option-sub {
      margin-top: 3px;
      font-size: 11.5px;
      color: var(--text-muted);
      font-family: inherit;
    }

    .sdd-empty {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 20px 14px;
      color: var(--text-muted);
      font-size: 13px;
    }
    .sdd-empty .material-icons { font-size: 18px; }
  `]
})
export class SearchDropdownComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() items: SearchDropdownItem[] = [];
  @Input() placeholder = '';
  @Output() selectionChange = new EventEmitter<any | null>();

  @ViewChild('hostEl') hostElRef!: ElementRef<HTMLElement>;

  searchText = '';
  panelOpen = false;
  selected: SearchDropdownItem | null = null;
  panelStyle: Record<string, string> = {};

  constructor(private el: ElementRef) {}

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.panelOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent) {
    if (!this.el.nativeElement.contains(event.target)) {
      this.panelOpen = false;
    }
  }

  @HostListener('window:scroll', ['$event'])
  @HostListener('window:resize')
  onScrollOrResize() {
    if (this.panelOpen) this.updatePanelPosition();
  }

  get filteredItems(): SearchDropdownItem[] {
    const q = this.searchText.trim().toLowerCase();
    if (this.selected && this.searchText === this.selected.label) return this.items;
    if (!q) return this.items;
    return this.items.filter(item =>
      (item.label + ' ' + (item.subLabel || '') + ' ' + (item.badge || ''))
        .toLowerCase().includes(q)
    );
  }

  openPanel() {
    this.panelOpen = true;
    this.updatePanelPosition();
  }

  togglePanel() {
    this.panelOpen = !this.panelOpen;
    if (this.panelOpen) this.updatePanelPosition();
  }

  openFromRow(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.sdd-clear')) return;
    this.panelOpen = true;
    this.updatePanelPosition();
  }

  private updatePanelPosition() {
    if (!this.hostElRef) return;
    const rect = this.hostElRef.nativeElement.getBoundingClientRect();
    const gap = 6;
    const panelMaxH = 300;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openAbove = spaceBelow < panelMaxH && spaceAbove > spaceBelow;

    this.panelStyle = {
      'position': 'fixed',
      'left': rect.left + 'px',
      'width': rect.width + 'px',
      ...(openAbove
        ? { 'bottom': (window.innerHeight - rect.top + gap) + 'px', 'top': 'auto' }
        : { 'top': (rect.bottom + gap) + 'px', 'bottom': 'auto' })
    };
  }

  pickItem(item: SearchDropdownItem, event?: MouseEvent) {
    event?.preventDefault();
    event?.stopPropagation();
    this.selected = item;
    this.searchText = item.label;
    this.panelOpen = false;
    this.selectionChange.emit(item.data);
  }

  clearSelection(e: MouseEvent) {
    e.stopPropagation();
    this.selected = null;
    this.searchText = '';
    this.panelOpen = false;
    this.selectionChange.emit(null);
  }

  onTextChange() {
    this.panelOpen = true;
    this.updatePanelPosition();
    if (this.selected && this.searchText !== this.selected.label) {
      this.selected = null;
      this.selectionChange.emit(null);
    }
  }

  clear() {
    this.selected = null;
    this.searchText = '';
    this.panelOpen = false;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['items'] && !changes['items'].firstChange) {
      if (this.selected) {
        const still = this.items.find(i => i === this.selected || i.data === this.selected?.data);
        if (!still) { this.selected = null; this.searchText = ''; }
      }
    }
  }
}
