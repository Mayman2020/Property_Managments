import { Component, Input } from '@angular/core';
import { DatePipe, NgIf } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Standard audit strip: creation / last update timestamps and user display names when present.
 */
@Component({
  selector: 'app-audit-trail',
  standalone: true,
  imports: [NgIf, DatePipe, TranslateModule],
  template: `
    <div class="audit-trail" *ngIf="hasAny">
      <div class="audit-trail-title">
        <span class="material-icons">history</span>
        {{ 'AUDIT.INFO_TITLE' | translate }}
      </div>
      <div class="audit-trail-grid">
        <div class="audit-item" *ngIf="createdAt">
          <span class="audit-label">{{ 'AUDIT.CREATED_AT' | translate }}</span>
          <span class="audit-value">{{ createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
        </div>
        <div class="audit-item" *ngIf="updatedAt">
          <span class="audit-label">{{ 'AUDIT.UPDATED_AT' | translate }}</span>
          <span class="audit-value">{{ updatedAt | date:'dd/MM/yyyy HH:mm' }}</span>
        </div>
        <div class="audit-item" *ngIf="createdByName || createdBy">
          <span class="audit-label">{{ 'AUDIT.CREATED_BY' | translate }}</span>
          <span class="audit-value">{{ createdByName || ('AUDIT.UNKNOWN' | translate) }}</span>
        </div>
        <div class="audit-item" *ngIf="modifiedByName || modifiedBy">
          <span class="audit-label">{{ 'AUDIT.MODIFIED_BY' | translate }}</span>
          <span class="audit-value">{{ modifiedByName || ('AUDIT.UNKNOWN' | translate) }}</span>
        </div>
        <div class="audit-item" *ngIf="approvedByName || approvedBy">
          <span class="audit-label">{{ 'AUDIT.APPROVED_BY' | translate }}</span>
          <span class="audit-value">{{ approvedByName || ('AUDIT.UNKNOWN' | translate) }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .audit-trail { margin-top: 12px; padding: 12px 14px; border-radius: 8px; background: var(--surface-2, #f5f6f8); border: 1px solid var(--line, #e0e0e0); }
    .audit-trail-title { display: flex; align-items: center; gap: 8px; font-weight: 600; margin-bottom: 10px; color: var(--text-primary, #1a1a1a); font-size: 14px; }
    .audit-trail-title .material-icons { font-size: 18px; width: 18px; height: 18px; }
    .audit-trail-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px 16px; }
    .audit-item { display: flex; flex-direction: column; gap: 2px; }
    .audit-label { font-size: 12px; color: var(--text-secondary, #666); }
    .audit-value { font-size: 13px; font-weight: 500; }
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

  get hasAny(): boolean {
    return !!(
      this.createdAt ||
      this.updatedAt ||
      this.createdByName ||
      this.createdBy ||
      this.modifiedByName ||
      this.modifiedBy ||
      this.approvedByName ||
      this.approvedBy
    );
  }
}
