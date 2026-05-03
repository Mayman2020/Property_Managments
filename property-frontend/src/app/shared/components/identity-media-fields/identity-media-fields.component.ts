import { NgIf } from '@angular/common';
import { Component, DestroyRef, EventEmitter, inject, Input, Output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { combineLatest, firstValueFrom } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';

/**
 * صورة شخصية + هوية/بطاقة مدنية — نفس سلوك حوار المالك (رفع، معاينة، أدوات).
 */
@Component({
  selector: 'app-identity-media-fields',
  standalone: true,
  imports: [
    NgIf,
    TranslateModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  template: `
    <div
      class="identity-pair"
      [class.identity-pair--compact]="compact"
      [class.identity-pair--single]="!showCivilSection">
      <div class="full media-field">
      <p class="field-label">{{ labelProfileKey | translate }}</p>
      <ng-container *ngIf="profileImageUrl; else profileEmpty">
        <div class="media-card media-card--media-row">
          <div class="media-thumb media-thumb--round">
            <img [src]="profileImageUrl" alt="">
          </div>
          <div class="media-side">
            <div class="media-actions" role="toolbar">
              <a mat-icon-button class="action-btn action-btn--view" [href]="profileImageUrl" target="_blank" rel="noopener noreferrer"
                 [matTooltip]="mediaTooltipView" [attr.aria-label]="mediaTooltipView" matTooltipPosition="above">
                <mat-icon>open_in_new</mat-icon>
              </a>
              <a mat-icon-button class="action-btn action-btn--download" [href]="profileImageUrl" download target="_blank" rel="noopener noreferrer"
                 [matTooltip]="mediaTooltipDownload" [attr.aria-label]="mediaTooltipDownload" matTooltipPosition="above">
                <mat-icon>download</mat-icon>
              </a>
              <button type="button" mat-icon-button class="action-btn action-btn--remove" (click)="emitProfile('')"
                      [matTooltip]="mediaTooltipRemove" [attr.aria-label]="mediaTooltipRemove" matTooltipPosition="above">
                <mat-icon>delete_outline</mat-icon>
              </button>
              <button type="button" mat-icon-button class="action-btn action-btn--replace" (click)="profileFileInput.click()" [disabled]="uploadingProfile"
                      [matTooltip]="mediaTooltipReplace" [attr.aria-label]="mediaTooltipReplace" matTooltipPosition="above">
                <span class="action-btn__icon-slot">
                  <mat-spinner *ngIf="uploadingProfile" diameter="22"></mat-spinner>
                  <mat-icon *ngIf="!uploadingProfile">drive_folder_upload</mat-icon>
                </span>
              </button>
            </div>
          </div>
        </div>
      </ng-container>
      <ng-template #profileEmpty>
        <div class="media-card media-card--empty media-card--tap-row">
          <div class="media-thumb media-thumb--round media-thumb--placeholder" aria-hidden="true">
            <mat-icon>person</mat-icon>
          </div>
          <button type="button" mat-icon-button color="primary" class="upload-icon-only" (click)="profileFileInput.click()" [disabled]="uploadingProfile"
                  [matTooltip]="profileUploadTooltip" [attr.aria-label]="profileUploadTooltip">
            <mat-spinner *ngIf="uploadingProfile" diameter="22"></mat-spinner>
            <mat-icon *ngIf="!uploadingProfile">add_a_photo</mat-icon>
          </button>
        </div>
      </ng-template>
      <input #profileFileInput type="file" accept="image/*" hidden (change)="onProfileFileSelected($event)">
    </div>

    <div class="full media-field civil-media" *ngIf="showCivilSection">
      <p class="field-label">{{ labelCivilKey | translate }}</p>
      <ng-container *ngIf="civilIdImageUrl; else civilEmpty">
        <div class="media-card media-card--media-row">
          <div
            class="media-thumb media-thumb--civil"
            [class.media-thumb--pdf]="!isImageFile(civilIdImageUrl) && isPdfUrl(civilIdImageUrl)"
            [class.media-thumb--file]="!isImageFile(civilIdImageUrl) && !isPdfUrl(civilIdImageUrl)"
            [attr.aria-label]="civilThumbAria">
            <img *ngIf="isImageFile(civilIdImageUrl)" [src]="civilIdImageUrl" [attr.alt]="labelCivilKey | translate">
            <mat-icon *ngIf="!isImageFile(civilIdImageUrl) && isPdfUrl(civilIdImageUrl)">picture_as_pdf</mat-icon>
            <mat-icon *ngIf="!isImageFile(civilIdImageUrl) && !isPdfUrl(civilIdImageUrl)">description</mat-icon>
          </div>
          <div class="media-actions media-actions--civil" role="toolbar">
            <a mat-icon-button class="action-btn action-btn--view" [href]="civilIdImageUrl" target="_blank" rel="noopener noreferrer"
               [matTooltip]="mediaTooltipView" [attr.aria-label]="mediaTooltipView" matTooltipPosition="above">
              <mat-icon>open_in_new</mat-icon>
            </a>
            <a mat-icon-button class="action-btn action-btn--download" [href]="civilIdImageUrl" download target="_blank" rel="noopener noreferrer"
               [matTooltip]="mediaTooltipDownload" [attr.aria-label]="mediaTooltipDownload" matTooltipPosition="above">
              <mat-icon>download</mat-icon>
            </a>
            <button type="button" mat-icon-button class="action-btn action-btn--remove" (click)="emitCivil('')"
                    [matTooltip]="mediaTooltipRemove" [attr.aria-label]="mediaTooltipRemove" matTooltipPosition="above">
              <mat-icon>delete_outline</mat-icon>
            </button>
            <button type="button" mat-icon-button class="action-btn action-btn--replace" (click)="civilFileInput.click()" [disabled]="uploadingCivil"
                    [matTooltip]="mediaTooltipReplace" [attr.aria-label]="mediaTooltipReplace" matTooltipPosition="above">
              <span class="action-btn__icon-slot">
                <mat-spinner *ngIf="uploadingCivil" diameter="22"></mat-spinner>
                <mat-icon *ngIf="!uploadingCivil">drive_folder_upload</mat-icon>
              </span>
            </button>
          </div>
        </div>
      </ng-container>
      <ng-template #civilEmpty>
        <div class="media-card media-card--empty media-card--tap-row">
          <div class="media-thumb media-thumb--doc media-thumb--placeholder" aria-hidden="true">
            <mat-icon>badge</mat-icon>
          </div>
          <button type="button" mat-icon-button color="primary" class="upload-icon-only" (click)="civilFileInput.click()" [disabled]="uploadingCivil"
                  [matTooltip]="civilUploadTooltip" [attr.aria-label]="civilUploadTooltip">
            <mat-spinner *ngIf="uploadingCivil" diameter="22"></mat-spinner>
            <mat-icon *ngIf="!uploadingCivil">add_a_photo</mat-icon>
          </button>
        </div>
      </ng-template>
      <input #civilFileInput type="file" accept="image/*,.pdf" hidden (change)="onCivilFileSelected($event)">
    </div>
    </div>
  `,
  styles: [`
    .identity-pair {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      align-items: start;
      width: 100%;
    }
    .identity-pair--single {
      grid-template-columns: 1fr;
    }
    @media (max-width: 520px) {
      .identity-pair:not(.identity-pair--single) {
        grid-template-columns: 1fr;
      }
    }
    .identity-pair--compact .field-label {
      font-size: 0.75rem;
      margin: 0 0 4px;
    }
    .identity-pair--compact .media-field { margin-bottom: 0; }
    .identity-pair--compact .media-card {
      padding: 8px 10px;
      gap: 8px;
      border-radius: 8px;
    }
    .identity-pair--compact .media-thumb--round {
      width: 56px;
      height: 56px;
    }
    .identity-pair--compact .media-thumb--round.media-thumb--placeholder mat-icon {
      font-size: 26px;
      width: 26px;
      height: 26px;
    }
    .identity-pair--compact .media-thumb--civil {
      width: 40px;
      height: 40px;
      min-width: 40px;
    }
    .identity-pair--compact .media-thumb--civil mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
    }
    .identity-pair--compact .media-thumb--doc.media-thumb--placeholder mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
    }
    .identity-pair--compact .action-btn {
      flex: 0 0 40px;
      width: 40px;
      height: 40px;
    }
    .identity-pair--compact .action-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .identity-pair--compact .media-actions { min-height: 40px; }
    .media-card--tap-row {
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 10px 12px;
    }
    .identity-pair--compact .media-card--tap-row {
      padding: 8px 10px;
      gap: 8px;
    }
    .upload-icon-only mat-icon {
      font-size: 26px;
      width: 26px;
      height: 26px;
    }
    .identity-pair--compact .upload-icon-only {
      width: 44px;
      height: 44px;
      padding: 0;
    }
    .full { display: block; width: 100%; }
    .field-label {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-secondary);
      margin: 0 0 8px;
    }
    .media-field { margin-bottom: 4px; }
    .media-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 14px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--surface-2, rgba(0,0,0,.02));
    }
    .media-card--media-row {
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: center;
      gap: 10px;
    }
    .media-card--empty { align-items: center; }
    .media-thumb {
      width: 88px;
      height: 64px;
      border-radius: 8px;
      overflow: hidden;
      flex-shrink: 0;
      border: 1px solid var(--line);
      background: var(--surface-1, #fff);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .media-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .media-thumb--round {
      width: 72px;
      height: 72px;
      border-radius: 50%;
    }
    .media-thumb--round img { object-fit: cover; }
    .media-thumb--civil {
      width: 48px;
      height: 48px;
      min-width: 48px;
      border-radius: 8px;
    }
    .media-thumb--civil img { object-fit: cover; }
    .media-thumb--civil mat-icon {
      font-size: 30px;
      width: 30px;
      height: 30px;
    }
    .media-thumb--pdf {
      background: linear-gradient(160deg, #ffebee 0%, #ffcdd2 100%);
      border-color: #e57373;
    }
    .media-thumb--pdf mat-icon { color: #c62828; }
    .media-thumb--file {
      background: var(--surface-2);
      border-color: var(--line);
    }
    .media-thumb--file mat-icon { color: var(--navy-800); }
    .media-thumb--placeholder {
      background: var(--surface-2);
      color: var(--text-muted);
    }
    .media-thumb--placeholder mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }
    .media-side {
      flex: 0 1 auto;
      align-self: center;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .media-actions {
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: center;
      justify-content: flex-start;
      gap: 0;
      padding: 2px 4px;
      border-radius: 8px;
      background: var(--surface-1, #fff);
      border: 1px solid var(--line);
      width: fit-content;
      max-width: 100%;
      min-height: 48px;
    }
    .media-actions--civil { flex: 0 0 auto; align-self: center; }
    .action-btn {
      flex: 0 0 48px;
      width: 48px;
      height: 48px;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 0;
    }
    .action-btn__icon-slot {
      display: inline-flex;
      width: 24px;
      height: 24px;
      align-items: center;
      justify-content: center;
    }
    .action-btn mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
      margin: 0;
    }
    .action-btn--view mat-icon { color: #1565c0 !important; }
    .action-btn--download mat-icon { color: #2e7d32 !important; }
    .action-btn--remove mat-icon { color: #c62828 !important; }
    .action-btn--replace mat-icon { color: #ef6c00 !important; }
    .action-btn--view:hover { background: rgba(21, 101, 192, 0.08); }
    .action-btn--download:hover { background: rgba(46, 125, 50, 0.08); }
    .action-btn--remove:hover { background: rgba(198, 40, 40, 0.08); }
    .action-btn--replace:hover { background: rgba(239, 108, 0, 0.1); }
    .action-btn[disabled] mat-icon { color: var(--text-muted, #9e9e9e); }
    .inline-spinner { margin-inline-start: 8px; vertical-align: middle; }
  `]
})
export class IdentityMediaFieldsComponent {
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(ApiService);
  private readonly snack = inject(SnackService);
  private readonly i18n = inject(I18nService);

  @Input() labelProfileKey = 'OWNERS.PROFILE_IMAGE';
  @Input() labelUploadProfileKey = 'OWNERS.UPLOAD_PHOTO';
  @Input() labelCivilKey = 'OWNERS.CIVIL_ID_IMAGE';
  @Input() labelUploadCivilKey = 'OWNERS.UPLOAD_CIVIL_ID';

  /** Smaller thumbs and tighter spacing for dialogs. */
  @Input() compact = false;

  /** When false, only profile photo is shown (e.g. tenant has no civil ID file field). */
  @Input() showCivilSection = true;

  @Input() profileImageUrl = '';
  @Output() profileImageUrlChange = new EventEmitter<string>();

  @Input() civilIdImageUrl = '';
  @Output() civilIdImageUrlChange = new EventEmitter<string>();

  /** Tooltip / aria for icon-only upload (replaces visible label text). */
  get profileUploadTooltip(): string {
    return this.translate.instant(this.labelUploadProfileKey);
  }

  get civilUploadTooltip(): string {
    return this.translate.instant(this.labelUploadCivilKey);
  }

  uploadingProfile = false;
  uploadingCivil = false;

  mediaTooltipView = '';
  mediaTooltipDownload = '';
  mediaTooltipRemove = '';
  mediaTooltipReplace = '';

  constructor() {
    combineLatest([
      this.translate.stream('COMMON.VIEW_FILE'),
      this.translate.stream('ACTIONS.DOWNLOAD'),
      this.translate.stream('OWNERS.REMOVE_FILE'),
      this.translate.stream('OWNERS.REPLACE_FILE')
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([view, download, remove, replace]) => {
        this.mediaTooltipView = view;
        this.mediaTooltipDownload = download;
        this.mediaTooltipRemove = remove;
        this.mediaTooltipReplace = replace;
      });
  }

  emitProfile(url: string): void {
    this.profileImageUrlChange.emit(url);
  }

  emitCivil(url: string): void {
    this.civilIdImageUrlChange.emit(url);
  }

  async onProfileFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.uploadingProfile = true;
    try {
      const { url } = await firstValueFrom(this.api.uploadFile(file));
      if (url) this.emitProfile(url);
    } catch {
      this.snack.error(this.i18n.instant('COMMON.ERROR'));
    } finally {
      this.uploadingProfile = false;
    }
  }

  async onCivilFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.uploadingCivil = true;
    try {
      const { url } = await firstValueFrom(this.api.uploadFile(file));
      if (url) this.emitCivil(url);
    } catch {
      this.snack.error(this.i18n.instant('COMMON.ERROR'));
    } finally {
      this.uploadingCivil = false;
    }
  }

  get civilIdFileName(): string {
    if (!this.civilIdImageUrl) return '';
    const cleanUrl = this.civilIdImageUrl.split('?')[0].split('#')[0];
    const name = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);
    return name || '';
  }

  get civilThumbAria(): string {
    const title = this.i18n.instant(this.labelCivilKey);
    const fn = this.civilIdFileName;
    return fn ? `${title} (${fn})` : title;
  }

  isImageFile(url: string): boolean {
    const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();
    return cleanUrl.startsWith('data:image/')
      || cleanUrl.startsWith('blob:')
      || /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/.test(cleanUrl);
  }

  isPdfUrl(url: string): boolean {
    const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();
    return cleanUrl.endsWith('.pdf');
  }
}
