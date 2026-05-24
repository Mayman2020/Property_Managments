import { Component, Inject, OnInit } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ContractorCompany, ContractorCompanyService } from '../../core/services/contractor-company.service';
import { CompanyOfficer } from '../../core/services/company-staff.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslateModule } from '@ngx-translate/core';

export interface ContractorCompanyStaffDialogData {
  company: ContractorCompany;
}

@Component({
  selector: 'app-contractor-company-staff-dialog',
  standalone: true,
  imports: [TranslateModule, NgIf, NgFor, NgClass, MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon class="dialog-title-icon">groups</mat-icon>
      {{ ('INLINE_TEXT.MAINTENANCE_COMPANY_STAFF' | translate) }}
    </h2>

    <mat-dialog-content class="staff-dialog-body">
      <div class="company-strip">
        <img *ngIf="data.company.profileImageUrl" [src]="data.company.profileImageUrl" alt="" />
        <span *ngIf="!data.company.profileImageUrl">{{ companyName().charAt(0).toUpperCase() }}</span>
        <div>
          <strong>{{ companyName() }}</strong>
          <small>{{ data.company.email || '-' }}</small>
        </div>
      </div>

      <div class="loading-box" *ngIf="loading"><mat-spinner diameter="34"></mat-spinner></div>

      <div class="staff-layout" *ngIf="!loading && officers.length > 0">
        <div class="staff-list">
          <button
            type="button"
            class="staff-option"
            *ngFor="let officer of officers"
            [ngClass]="{ selected: selected?.id === officer.id }"
            (click)="selected = officer">
            <img *ngIf="officer.profileImageUrl" [src]="officer.profileImageUrl" alt="" />
            <span class="avatar-fallback" *ngIf="!officer.profileImageUrl">
              {{ officerName(officer).charAt(0).toUpperCase() }}
            </span>
            <div>
              <strong>{{ officerName(officer) }}</strong>
              <small>{{ propertyLabel(officer) }}</small>
            </div>
            <mat-icon>chevron_left</mat-icon>
          </button>
        </div>

        <section class="staff-detail" *ngIf="selected">
          <div class="detail-head">
            <img *ngIf="selected.profileImageUrl" [src]="selected.profileImageUrl" alt="" />
            <span *ngIf="!selected.profileImageUrl">{{ officerName(selected).charAt(0).toUpperCase() }}</span>
            <div>
              <strong>{{ officerName(selected) }}</strong>
              <small>{{ selected.email }}</small>
            </div>
          </div>

          <div class="detail-grid">
            <div>
              <label>{{ ('INLINE_TEXT.PHONE' | translate) }}</label>
              <strong>{{ selected.phone || '-' }}</strong>
            </div>
            <div>
              <label>{{ ('INLINE_TEXT.STATUS' | translate) }}</label>
              <strong class="status-chip" [ngClass]="selected.active ? 'active' : 'inactive'">
                {{ selected.active ? (('INLINE_TEXT.ACTIVE' | translate)) : (('INLINE_TEXT.INACTIVE' | translate)) }}
              </strong>
            </div>
            <div class="wide">
              <label>{{ ('INLINE_TEXT.LINKED_PROPERTY' | translate) }}</label>
              <strong>{{ propertyLabel(selected) }}</strong>
            </div>
            <div class="wide">
              <label>{{ ('INLINE_TEXT.JOB_TITLE_2' | translate) }}</label>
              <strong>{{ ('INLINE_TEXT.MAINTENANCE_COMPANY_OFFICER' | translate) }}</strong>
            </div>
          </div>
        </section>
      </div>

      <div class="empty-staff" *ngIf="!loading && officers.length === 0">
        <mat-icon>person_off</mat-icon>
        <strong>{{ ('INLINE_TEXT.NO_STAFF_YET' | translate) }}</strong>
      </div>
    </mat-dialog-content>

    <div mat-dialog-actions align="end" class="dialog-actions-row">
      <button mat-stroked-button type="button" (click)="dialogRef.close()">{{ ('INLINE_TEXT.CLOSE' | translate) }}</button>
    </div>
  `,
  styles: [`
    .staff-dialog-body { padding-top: 4px; min-width: min(760px, 82vw); }
    .company-strip {
      display: flex; align-items: center; gap: 12px; padding: 12px;
      border: 1px solid var(--line); border-radius: 8px; background: var(--surface-2); margin-bottom: 14px;
    }
    .company-strip img, .company-strip span, .detail-head img, .detail-head > span {
      width: 44px; height: 44px; border-radius: 50%; object-fit: cover;
      display: grid; place-items: center; background: var(--navy-800); color: white; font-weight: 800;
    }
    .company-strip div, .detail-head div { display: grid; gap: 2px; }
    .company-strip small, .detail-head small, .staff-option small { color: var(--text-muted); }
    .staff-layout { display: grid; grid-template-columns: minmax(260px, 320px) minmax(0, 1fr); gap: 14px; }
    .staff-list { display: grid; gap: 8px; align-content: start; }
    .staff-option {
      display: grid; grid-template-columns: 42px minmax(0, 1fr) 24px; align-items: center; gap: 10px;
      border: 1px solid var(--line); border-radius: 8px; background: var(--surface); padding: 10px; text-align: start; cursor: pointer;
    }
    .staff-option.selected { border-color: #b8862c; background: #fff8e8; }
    .staff-option img, .avatar-fallback { width: 42px; height: 42px; border-radius: 50%; object-fit: cover; display: grid; place-items: center; background: #f2e8d6; color: #0f2237; font-weight: 800; }
    .staff-option div { min-width: 0; display: grid; gap: 2px; }
    .staff-option strong, .staff-option small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .staff-detail { border: 1px solid var(--line); border-radius: 8px; background: var(--surface); padding: 16px; }
    .detail-head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .detail-grid div { border: 1px solid var(--line); border-radius: 8px; padding: 10px; display: grid; gap: 5px; background: var(--surface-2); }
    .detail-grid .wide { grid-column: 1 / -1; }
    label { color: var(--text-muted); font-size: .78rem; }
    .status-chip { width: fit-content; border-radius: 999px; padding: 4px 10px; }
    .status-chip.active { background: #e8f7ed; color: #16803a; }
    .status-chip.inactive { background: #fdecec; color: #c62828; }
    .loading-box { min-height: 160px; display: grid; place-items: center; }
    .empty-staff {
      min-height: 220px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      text-align: center;
      color: var(--text-muted);
    }
    .empty-staff mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      opacity: 0.45;
    }
    .dialog-actions-row { padding: 14px 24px; border-top: 1px solid var(--line); }
    @media (max-width: 760px) {
      .staff-dialog-body { min-width: 0; }
      .staff-layout { grid-template-columns: 1fr; }
    }
  `]
})
export class ContractorCompanyStaffDialogComponent implements OnInit {
  officers: CompanyOfficer[] = [];
  selected: CompanyOfficer | null = null;
  loading = true;

  constructor(
    readonly dialogRef: MatDialogRef<ContractorCompanyStaffDialogComponent>,
    @Inject(MAT_DIALOG_DATA) readonly data: ContractorCompanyStaffDialogData,
    private readonly service: ContractorCompanyService,
    readonly i18n: I18nService
  ) {}

  get isAr(): boolean { return this.i18n.currentLang === 'ar'; }

  ngOnInit(): void {
    this.service.getOfficers(this.data.company.id).subscribe({
      next: (res) => {
        this.officers = res.data ?? [];
        this.selected = this.officers[0] ?? null;
        this.loading = false;
      },
      error: () => {
        this.officers = [];
        this.selected = null;
        this.loading = false;
      }
    });
  }

  companyName(): string {
    const ar = this.data.company.nameAr?.trim();
    const en = this.data.company.nameEn?.trim();
    const fallback = this.data.company.name?.trim();
    return this.isAr ? (ar || en || fallback || '-') : (en || ar || fallback || '-');
  }

  officerName(officer: CompanyOfficer): string {
    const ar = this.cleanText(officer.fullNameAr);
    const en = this.cleanText(officer.fullNameEn);
    const fallback = this.cleanText(officer.fullName);
    return this.isAr ? (ar || en || fallback || '-') : (en || ar || fallback || '-');
  }

  propertyLabel(officer: CompanyOfficer): string {
    const ar = this.cleanText(officer.propertyNameAr);
    const en = this.cleanText(officer.propertyNameEn);
    const fallback = this.cleanText(officer.propertyName);
    return this.isAr ? (ar || en || fallback || '-') : (en || ar || fallback || '-');
  }

  private cleanText(value?: string | null): string {
    const text = value?.trim() ?? '';
    return text && !/^[?\s\uFFFD]+$/.test(text) ? text : '';
  }
}
