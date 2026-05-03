import { Component, ElementRef, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../../core/services/api.service';

export interface UploadedFile {
  file: File;
  preview?: string;
  type: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
}

/**
 * File drop zone + previews.
 * **Legacy (default):** omit `urlList`; local state, emits `filesChanged` / `filesUploaded`.
 * **Controlled:** pass `[urlList]="urls"`; child mirrors list, emits `urlListChange` with the full array on add/remove.
 * **layout="identity":** compact cards (مالك-style) for controlled lists; supports multi via trailing add tile.
 */
@Component({
  selector: 'app-upload-zone',
  standalone: true,
  imports: [NgClass, NgFor, NgIf, TranslateModule, MatProgressSpinnerModule],
  template: `
    <div class="upload-zone-host" [ngClass]="{ 'host--identity': useIdentityLayout }">
      <ng-container *ngIf="useIdentityLayout; else cloudLayoutTmpl">
        <div
          class="identity-strip"
          [class.identity-strip--drag]="isDragOver"
          (dragover)="onDragOver($event)"
          (dragleave)="isDragOver = false"
          (drop)="onDrop($event)"
        >
          <div
            class="identity-tile"
            *ngFor="let url of workingUrls; let i = index; trackBy: trackByUrl"
            [class.identity-tile--round]="tileRound"
          >
            <a class="identity-thumb" [href]="url" target="_blank" rel="noopener" (click)="$event.stopPropagation()">
              <img *ngIf="urlKind(url) === 'IMAGE'" [src]="url" alt="" />
              <span class="material-icons identity-doc-ico" *ngIf="urlKind(url) === 'VIDEO'">videocam</span>
              <span class="material-icons identity-doc-ico" *ngIf="urlKind(url) === 'DOCUMENT'">description</span>
            </a>
            <span class="identity-fname">{{ fileNameFromUrl(url) }}</span>
            <div class="identity-toolbar" *ngIf="!readOnly">
              <a class="tb-btn" [href]="url" target="_blank" rel="noopener" [attr.title]="'COMMON.VIEW_FILE' | translate">
                <span class="material-icons">open_in_new</span>
              </a>
              <a class="tb-btn" [href]="url" download target="_blank" rel="noopener" [attr.title]="'ACTIONS.DOWNLOAD' | translate">
                <span class="material-icons">download</span>
              </a>
              <button type="button" class="tb-btn tb-btn--danger" (click)="removeBound($event, i)" [attr.aria-label]="'ACTIONS.DELETE' | translate">
                <span class="material-icons">delete_outline</span>
              </button>
              <button type="button" class="tb-btn tb-btn--accent" (click)="triggerPick()" [disabled]="uploading" [attr.aria-label]="'OWNERS.REPLACE_FILE' | translate">
                <span class="material-icons">drive_folder_upload</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            class="identity-add"
            *ngIf="!readOnly && (multiple || workingUrls.length === 0)"
            (click)="triggerPick()"
            [disabled]="uploading"
          >
            <mat-spinner *ngIf="uploading" diameter="22" class="identity-add-spinner"></mat-spinner>
            <ng-container *ngIf="!uploading">
              <span class="material-icons identity-add-ico">{{ multiple ? 'drive_folder_upload' : 'add_a_photo' }}</span>
              <span class="identity-add-text">{{ label }}</span>
            </ng-container>
          </button>
        </div>
        <p class="identity-hint" *ngIf="!readOnly">{{ uploadHintKey | translate }}</p>

        <div class="upload-hero" *ngIf="showHeroPreview && heroImageUrl">
          <img [src]="heroImageUrl" alt="" />
        </div>
      </ng-container>

      <ng-template #cloudLayoutTmpl>
        <div
          *ngIf="!readOnly"
          class="upload-zone"
          [class.drag-over]="isDragOver"
          [class.upload-zone--busy]="uploading"
          (dragover)="onDragOver($event)"
          (dragleave)="isDragOver = false"
          (drop)="onDrop($event)"
          (click)="triggerPick()"
        >
          <mat-spinner *ngIf="uploading" class="zone-spinner" diameter="36"></mat-spinner>
          <ng-container *ngIf="!uploading">
            <span class="material-icons upload-icon">cloud_upload</span>
            <p class="upload-text">{{ label }}</p>
            <p class="upload-hint">{{ uploadHintKey | translate }}</p>
          </ng-container>
        </div>

        <div class="file-previews" *ngIf="isControlled && workingUrls.length">
          <div class="file-preview-item" *ngFor="let url of workingUrls; let i = index; trackBy: trackByUrl">
            <a class="thumb-link" [href]="url" target="_blank" rel="noopener" (click)="$event.stopPropagation()">
              <img *ngIf="urlKind(url) === 'IMAGE'" [src]="url" alt="" />
              <span class="material-icons file-icon" *ngIf="urlKind(url) === 'VIDEO'">videocam</span>
              <span class="material-icons file-icon" *ngIf="urlKind(url) === 'DOCUMENT'">insert_drive_file</span>
            </a>
            <a class="file-name" [href]="url" target="_blank" rel="noopener" (click)="$event.stopPropagation()">{{ fileNameFromUrl(url) }}</a>
            <button *ngIf="!readOnly" type="button" class="remove-btn" (click)="removeBound($event, i)" [attr.aria-label]="'ACTIONS.DELETE' | translate">
              <span class="material-icons">close</span>
            </button>
          </div>
        </div>

        <div class="upload-hero" *ngIf="isControlled && showHeroPreview && heroImageUrl">
          <img [src]="heroImageUrl" alt="" />
        </div>

        <div class="file-previews" *ngIf="!isControlled && files.length">
          <div class="file-preview-item" *ngFor="let f of files; let i = index; trackBy: trackByFile">
            <span class="thumb-link">
              <img *ngIf="f.type === 'IMAGE' && f.preview" [src]="f.preview" alt="" />
              <span class="material-icons file-icon" *ngIf="f.type === 'VIDEO'">videocam</span>
              <span class="material-icons file-icon" *ngIf="f.type === 'DOCUMENT'">insert_drive_file</span>
            </span>
            <span class="file-name">{{ f.file.name }}</span>
            <button type="button" class="remove-btn" (click)="removeLegacy($event, i)" [attr.aria-label]="'ACTIONS.DELETE' | translate">
              <span class="material-icons">close</span>
            </button>
          </div>
        </div>

        <div class="upload-hero" *ngIf="!isControlled && showHeroPreview && legacyHeroImageUrl">
          <img [src]="legacyHeroImageUrl" alt="" />
        </div>
      </ng-template>

      <input #fileInput type="file" [multiple]="multiple" [accept]="accept" hidden (change)="onFileChange($event)" />
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .upload-zone-host { display: grid; gap: 12px; }
    .upload-zone { position: relative; }
    .upload-zone--busy { pointer-events: none; opacity: 0.72; }
    .zone-spinner {
      position: absolute;
      inset: 0;
      margin: auto;
    }
    .file-previews {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 4px;
    }
    .file-preview-item {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 96px;
      gap: 4px;
    }
    .thumb-link {
      display: flex;
      width: 80px;
      height: 60px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--line, rgba(0,0,0,.12));
      background: var(--paper-2, #f5f5f5);
      text-decoration: none;
      color: inherit;
      align-items: center;
      justify-content: center;
    }
    .thumb-link img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .file-icon { font-size: 36px; color: var(--text-muted, #666); }
    .file-name {
      font-size: 0.7rem;
      color: var(--text-subtle, #888);
      word-break: break-word;
      text-align: center;
      max-width: 96px;
      text-decoration: none;
      line-height: 1.25;
    }
    .file-name:hover { text-decoration: underline; color: var(--text-main, #222); }
    .remove-btn {
      position: absolute;
      inset-block-start: -6px;
      inset-inline-end: -6px;
      width: 22px;
      height: 22px;
      min-width: 22px;
      min-height: 22px;
      padding: 0;
      border-radius: 50%;
      border: none;
      background: var(--danger, #c62828);
      color: #fff;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 0;
    }
    .remove-btn .material-icons {
      font-size: 14px;
      width: 14px;
      height: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .upload-hero {
      overflow: hidden;
      border-radius: 18px;
      border: 1px solid var(--line, rgba(0,0,0,.12));
      background: var(--paper-2, #f5f5f5);
      min-height: 200px;
      max-height: 320px;
    }
    .upload-hero img {
      display: block;
      width: 100%;
      height: 100%;
      max-height: 320px;
      object-fit: cover;
    }

    /* —— Identity layout (مالك-style, multi-friendly) —— */
    .host--identity { gap: 10px; }
    .identity-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: stretch;
      padding: 4px 0;
    }
    .identity-strip--drag {
      outline: 2px dashed var(--accent, #b08a2e);
      outline-offset: 4px;
      border-radius: 12px;
    }
    .identity-tile {
      width: 148px;
      border: 1px solid var(--line, rgba(0,0,0,.1));
      border-radius: 12px;
      background: var(--surface-2, rgba(0,0,0,.03));
      padding: 10px 10px 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      box-sizing: border-box;
    }
    .identity-tile--round .identity-thumb {
      width: 72px;
      height: 72px;
      border-radius: 50%;
    }
    .identity-thumb {
      display: flex;
      width: 100%;
      max-width: 120px;
      height: 72px;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid var(--line, rgba(0,0,0,.1));
      background: var(--surface-1, #fff);
      align-items: center;
      justify-content: center;
      text-decoration: none;
      color: inherit;
    }
    .identity-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .identity-doc-ico {
      font-size: 36px;
      color: var(--navy-800, #1a2a4a);
      opacity: 0.85;
    }
    .identity-fname {
      font-size: 0.68rem;
      color: var(--text-subtle, #888);
      text-align: center;
      line-height: 1.25;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .identity-toolbar {
      display: flex;
      flex-wrap: nowrap;
      align-items: center;
      justify-content: center;
      gap: 2px;
      padding: 2px 4px;
      border-radius: 8px;
      border: 1px solid var(--line, rgba(0,0,0,.1));
      background: var(--surface-1, #fff);
      width: 100%;
      max-width: 132px;
    }
    .tb-btn {
      flex: 0 0 32px;
      width: 32px;
      height: 32px;
      padding: 0;
      border: none;
      background: transparent;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      text-decoration: none;
    }
    .tb-btn:hover { background: rgba(0,0,0,.05); }
    .tb-btn .material-icons { font-size: 18px; width: 18px; height: 18px; }
    .tb-btn--danger .material-icons { color: var(--danger, #c62828); }
    .tb-btn--accent .material-icons { color: var(--accent, #b8860b); }
    .tb-btn[disabled] { opacity: 0.45; cursor: not-allowed; }

    .identity-add {
      width: 148px;
      min-height: 118px;
      border: 1px dashed var(--line, rgba(0,0,0,.18));
      border-radius: 12px;
      background: var(--surface-2, rgba(0,0,0,.02));
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      cursor: pointer;
      color: var(--text-muted);
      transition: border-color 0.15s, background 0.15s;
    }
    .identity-add:hover:not(:disabled) {
      border-color: var(--accent, #b8860b);
      background: color-mix(in srgb, var(--accent) 6%, transparent);
    }
    .identity-add:disabled { cursor: wait; opacity: 0.75; }
    .identity-add-ico {
      font-size: 30px;
      width: 30px;
      height: 30px;
      color: var(--accent, #b8860b);
    }
    .identity-add-text {
      font-size: 0.72rem;
      font-weight: 600;
      text-align: center;
      line-height: 1.35;
      padding: 0 6px;
      color: var(--text-secondary, #555);
    }
    .identity-add-spinner { margin: 4px auto; }
    .identity-hint {
      margin: 0;
      font-size: 0.72rem;
      color: var(--text-subtle, #888);
    }
  `]
})
export class UploadZoneComponent implements OnChanges {
  private readonly api = inject(ApiService);

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  @Input() multiple = true;
  @Input() accept = 'image/*,video/*,.pdf,.doc,.docx';
  @Input() label = 'Click or drag files here to upload';
  /** When set (including `[]`), list is controlled by the parent via `urlListChange`. */
  @Input() urlList?: string[];
  @Input() readOnly = false;
  /** Large preview of the first image URL (controlled or legacy). */
  @Input() showHeroPreview = false;
  @Input() uploadHintKey = 'COMMON.UPLOAD_MAX_HINT';
  /** `identity`: compact مربعات كحوار المالك (يتطلب `urlList`). */
  @Input() layout: 'cloud' | 'identity' = 'cloud';
  /** داخل وضع identity: مصغرات دائرية (غلاف العقار) أو مستطيلة (مستندات). */
  @Input() tileRound = false;

  @Output() filesChanged = new EventEmitter<UploadedFile[]>();
  @Output() filesUploaded = new EventEmitter<string[]>();
  @Output() urlListChange = new EventEmitter<string[]>();

  files: UploadedFile[] = [];
  uploadedUrls: string[] = [];
  workingUrls: string[] = [];
  uploading = false;
  isDragOver = false;

  get isControlled(): boolean {
    return this.urlList !== undefined;
  }

  get useIdentityLayout(): boolean {
    return this.layout === 'identity' && this.isControlled;
  }

  get heroImageUrl(): string | null {
    if (!this.showHeroPreview || !this.workingUrls.length) return null;
    const first = this.workingUrls[0];
    return this.urlKind(first) === 'IMAGE' ? first : null;
  }

  get legacyHeroImageUrl(): string | null {
    if (!this.showHeroPreview || !this.uploadedUrls.length) return null;
    const u = this.uploadedUrls[0];
    return this.urlKind(u) === 'IMAGE' ? u : null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['urlList'] || !this.isControlled) return;
    const next = this.urlList ?? [];
    if (!this.urlsEqual(this.workingUrls, next)) {
      this.workingUrls = [...next];
    }
  }

  trackByUrl(_index: number, url: string): string {
    return url;
  }

  trackByFile(_index: number, f: UploadedFile): string {
    return f.file.name + f.file.size;
  }

  onDragOver(e: DragEvent): void {
    if (this.readOnly) return;
    e.preventDefault();
    this.isDragOver = true;
  }

  onDrop(e: DragEvent): void {
    if (this.readOnly) return;
    e.preventDefault();
    this.isDragOver = false;
    if (e.dataTransfer?.files) void this.processFiles(Array.from(e.dataTransfer.files));
  }

  onFileChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files) void this.processFiles(Array.from(input.files));
    input.value = '';
  }

  triggerPick(): void {
    if (this.readOnly || this.uploading) return;
    this.fileInput?.nativeElement.click();
  }

  removeBound(ev: Event, index: number): void {
    ev.preventDefault();
    ev.stopPropagation();
    if (this.readOnly) return;
    this.workingUrls = this.workingUrls.filter((_, i) => i !== index);
    this.urlListChange.emit([...this.workingUrls]);
  }

  removeLegacy(ev: Event, index: number): void {
    ev.preventDefault();
    ev.stopPropagation();
    this.files.splice(index, 1);
    if (this.uploadedUrls[index] !== undefined) this.uploadedUrls.splice(index, 1);
    this.filesChanged.emit([...this.files]);
    this.filesUploaded.emit([...this.uploadedUrls]);
  }

  fileNameFromUrl(url: string): string {
    const clean = url.split('?')[0];
    return clean.split('/').pop() || url;
  }

  urlKind(url: string): 'IMAGE' | 'VIDEO' | 'DOCUMENT' {
    const u = url.split('?')[0].toLowerCase();
    if (url.startsWith('data:image')) return 'IMAGE';
    if (/\.(jpe?g|png|gif|webp|bmp|svg)$/.test(u)) return 'IMAGE';
    if (/\.(mp4|webm|ogg|mov|m4v)$/.test(u)) return 'VIDEO';
    return 'DOCUMENT';
  }

  private async processFiles(rawFiles: File[]): Promise<void> {
    if (this.readOnly) return;
    const batch = this.multiple ? rawFiles : rawFiles.slice(0, 1);
    if (!batch.length) return;

    if (this.isControlled) {
      this.uploading = true;
      try {
        for (const file of batch) {
          const result = await firstValueFrom(this.api.uploadFile(file));
          if (result.url) {
            if (!this.multiple) this.workingUrls = [];
            this.workingUrls = [...this.workingUrls, result.url];
            this.urlListChange.emit([...this.workingUrls]);
          }
        }
      } finally {
        this.uploading = false;
      }
      return;
    }

    this.uploading = true;
    const urls: string[] = [];
    try {
      batch.forEach((file) => {
        const type = this.detectType(file);
        const uploaded: UploadedFile = { file, type };
        if (type === 'IMAGE') {
          const reader = new FileReader();
          reader.onload = (e) => {
            uploaded.preview = e.target?.result as string;
          };
          reader.readAsDataURL(file);
        }
        if (!this.multiple) this.files = [];
        this.files.push(uploaded);
      });

      for (const file of batch) {
        const result = await firstValueFrom(this.api.uploadFile(file));
        if (result.url) urls.push(result.url);
      }

      if (!this.multiple) this.uploadedUrls = [];
      this.uploadedUrls.push(...urls);
      this.filesChanged.emit([...this.files]);
      this.filesUploaded.emit([...this.uploadedUrls]);
    } finally {
      this.uploading = false;
    }
  }

  private detectType(file: File): 'IMAGE' | 'VIDEO' | 'DOCUMENT' {
    if (file.type.startsWith('image/')) return 'IMAGE';
    if (file.type.startsWith('video/')) return 'VIDEO';
    return 'DOCUMENT';
  }

  private urlsEqual(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
}
