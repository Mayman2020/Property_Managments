import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Standard audit strip for dialogs and detail panels.
 * Layout: row 1 = created by | created at; row 2 = modified by | last updated at.
 */
@Component({
  selector: 'app-audit-trail',
  standalone: true,
  imports: [NgIf, TranslateModule],
  template: `
    <div class="audit-trail" *ngIf="hasAny">
      <div class="audit-trail-title">
        <span class="material-icons">history</span>
        {{ 'AUDIT.INFO_TITLE' | translate }}
      </div>
      <div class="audit-grid">
        <div class="audit-cell" *ngIf="showCreatedRow">
          <span class="audit-label">{{ 'AUDIT.CREATED_BY' | translate }}</span>
          <span class="audit-value">{{ createdByLabel }}</span>
        </div>
        <div class="audit-cell" *ngIf="showCreatedRow">
          <span class="audit-label">{{ 'AUDIT.CREATED_AT' | translate }}</span>
          <span class="audit-value">{{ createdAtLabel }}</span>
        </div>
        <div class="audit-cell" *ngIf="showModifiedRow">
          <span class="audit-label">{{ 'AUDIT.MODIFIED_BY' | translate }}</span>
          <span class="audit-value">{{ modifiedByLabel }}</span>
        </div>
        <div class="audit-cell" *ngIf="showModifiedRow">
          <span class="audit-label">{{ 'AUDIT.UPDATED_AT' | translate }}</span>
          <span class="audit-value">{{ updatedAtLabel }}</span>
        </div>
        <div class="audit-cell audit-cell--wide" *ngIf="approvedByName || approvedBy">
          <span class="audit-label">{{ 'AUDIT.APPROVED_BY' | translate }}</span>
          <span class="audit-value">{{ approvedByName || ('AUDIT.UNKNOWN' | translate) }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .audit-trail {
      margin-top: 12px;
      padding: 12px 14px;
      border-radius: 8px;
      background: var(--surface-2, #f5f6f8);
      border: 1px solid var(--line, #e0e0e0);
    }

    .audit-trail-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      margin-bottom: 10px;
      color: var(--text-primary, #1a1a1a);
      font-size: 14px;
    }

    .audit-trail-title .material-icons {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .audit-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      column-gap: 24px;
      row-gap: 10px;
      align-items: start;
    }

    .audit-cell {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }

    .audit-cell--wide {
      grid-column: 1 / -1;
    }

    .audit-label {
      font-size: 12px;
      line-height: 1.3;
      color: var(--text-secondary, #666);
    }

    .audit-value {
      font-size: 13px;
      line-height: 1.4;
      font-weight: 500;
      color: var(--text-primary, #1a1a1a);
      word-break: break-word;
    }

    @media (max-width: 520px) {
      .audit-grid {
        grid-template-columns: 1fr;
        column-gap: 0;
      }

      .audit-cell--wide {
        grid-column: auto;
      }
    }
  `]
})
export class AuditTrailComponent {
  @Input() createdAt?: string | null;
  @Input() updatedAt?: string | null;
  @Input() createdBy?: number | null;
  @Input() createdByName?: string | null;
  @Input() modifiedBy?: number | null;
  @Input() modifiedByName?: string | null;
  @Input() approvedBy?: number | null;
  @Input() approvedByName?: string | null;

  get showCreatedRow(): boolean {
    return !!(this.createdAt || this.createdByName || this.createdBy);
  }

  get showModifiedRow(): boolean {
    return !!(this.updatedAt || this.modifiedByName || this.modifiedBy);
  }

  get createdByLabel(): string {
    const name = (this.createdByName ?? '').trim();
    if (name) return name;
    if (this.createdBy != null) return `#${this.createdBy}`;
    return '—';
  }

  get modifiedByLabel(): string {
    const name = (this.modifiedByName ?? '').trim();
    if (name) return name;
    if (this.modifiedBy != null) return `#${this.modifiedBy}`;
    return '—';
  }

  get createdAtLabel(): string {
    return this.createdAt ? this.formatDate(this.createdAt) : '—';
  }

  get updatedAtLabel(): string {
    return this.updatedAt ? this.formatDate(this.updatedAt) : '—';
  }

  get hasAny(): boolean {
    return this.showCreatedRow || this.showModifiedRow || !!(this.approvedByName || this.approvedBy);
  }

  private formatDate(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    const hours = String(parsed.getHours()).padStart(2, '0');
    const minutes = String(parsed.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }
}
