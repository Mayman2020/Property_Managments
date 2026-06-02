import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';

@Component({
  selector: 'app-table-pager',
  standalone: true,
  imports: [NgFor, NgIf],
  template: `
    <nav class="srs-pager-shell table-pager-shell" *ngIf="length > 0" aria-label="Table pagination">
      <div class="srs-pager__controls">
        <button type="button" class="srs-pager__nav" (click)="previousPage()" [disabled]="pageIndex === 0">
          <span class="material-icons">chevron_left</span>
        </button>

        <ng-container *ngFor="let item of pageItems()">
          <span *ngIf="item === 'ellipsis'" class="srs-pager__gap">...</span>
          <button
            *ngIf="item !== 'ellipsis'"
            type="button"
            class="srs-pager__page"
            [class.srs-pager__page--active]="item === pageIndex + 1"
            (click)="goToPage(item)">
            {{ item }}
          </button>
        </ng-container>

        <button type="button" class="srs-pager__nav" (click)="nextPage()" [disabled]="pageIndex + 1 >= totalPages">
          <span class="material-icons">chevron_right</span>
        </button>
      </div>
    </nav>
  `,
  styles: [`
    :host {
      display: block;
      border-top: 1px solid var(--line-2);
    }

    .table-pager-shell {
      justify-content: center;
      padding: 18px 16px 16px;
      border-top: 0;
    }
  `]
})
export class TablePagerComponent {
  @Input() length = 0;
  @Input() pageSize = 5;
  @Input() pageIndex = 0;
  @Output() pageIndexChange = new EventEmitter<number>();

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.length / this.pageSize));
  }

  previousPage(): void {
    this.goToIndex(this.pageIndex - 1);
  }

  nextPage(): void {
    this.goToIndex(this.pageIndex + 1);
  }

  goToPage(pageNumber: number): void {
    this.goToIndex(pageNumber - 1);
  }

  pageItems(): Array<number | 'ellipsis'> {
    const total = this.totalPages;
    const current = this.pageIndex + 1;

    if (total <= 7) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }

    if (current <= 4) {
      return [1, 2, 3, 4, 5, 'ellipsis', total];
    }

    if (current >= total - 3) {
      return [1, 'ellipsis', total - 4, total - 3, total - 2, total - 1, total];
    }

    return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total];
  }

  private goToIndex(nextIndex: number): void {
    const clamped = Math.max(0, Math.min(nextIndex, this.totalPages - 1));
    if (clamped === this.pageIndex) return;
    this.pageIndexChange.emit(clamped);
  }
}
