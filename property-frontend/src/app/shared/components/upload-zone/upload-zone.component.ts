import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

export interface UploadedFile {
  file: File;
  preview?: string;
  type: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
}

@Component({
  selector: 'app-upload-zone',
  standalone: true,
  imports: [NgFor, NgIf],
  template: `
    <div class="upload-zone" [class.drag-over]="isDragOver"
         (dragover)="onDragOver($event)" (dragleave)="isDragOver = false" (drop)="onDrop($event)"
         (click)="fileInput.click()">
      <span class="material-icons upload-icon">cloud_upload</span>
      <p class="upload-text">{{ label }}</p>
      <p class="upload-hint">Max: images 10MB, videos 50MB</p>
      <input #fileInput type="file" [multiple]="multiple" [accept]="accept" hidden (change)="onFileChange($event)">
    </div>

    <div class="file-previews" *ngIf="files.length">
      <div class="file-preview-item" *ngFor="let f of files; let i = index">
        <img *ngIf="f.type === 'IMAGE' && f.preview" [src]="f.preview" alt="preview">
        <span class="material-icons file-icon" *ngIf="f.type !== 'IMAGE'">
          {{ f.type === 'VIDEO' ? 'videocam' : 'insert_drive_file' }}
        </span>
        <span class="file-name">{{ f.file.name }}</span>
        <button class="remove-btn" (click)="remove(i)">
          <span class="material-icons">close</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .file-previews { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
    .file-preview-item {
      position: relative; display: flex; flex-direction: column; align-items: center;
      width: 90px; gap: 4px;
    }
    .file-preview-item img { width: 80px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid var(--line); }
    .file-icon { font-size: 36px; color: var(--text-muted); }
    .file-name { font-size: 0.7rem; color: var(--text-subtle); word-break: break-all; text-align: center; max-width: 90px; }
    .remove-btn {
      position: absolute; top: -6px; right: -6px;
      width: 20px; height: 20px; border-radius: 50%;
      border: none; background: var(--danger); color: #fff;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
    }
    .remove-btn .material-icons { font-size: 12px; }
  `]
})
export class UploadZoneComponent {
  private readonly api = inject(ApiService);

  @Input() multiple = true;
  @Input() accept = 'image/*,video/*,.pdf,.doc,.docx';
  @Input() label = 'Click or drag files here to upload';
  @Output() filesChanged = new EventEmitter<UploadedFile[]>();
  @Output() filesUploaded = new EventEmitter<string[]>();

  files: UploadedFile[] = [];
  uploadedUrls: string[] = [];
  uploading = false;
  isDragOver = false;

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDragOver = true;
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragOver = false;
    if (e.dataTransfer?.files) this.processFiles(Array.from(e.dataTransfer.files));
  }

  onFileChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files) this.processFiles(Array.from(input.files));
    input.value = '';
  }

  remove(index: number): void {
    this.files.splice(index, 1);
    if (this.uploadedUrls[index]) this.uploadedUrls.splice(index, 1);
    this.filesChanged.emit([...this.files]);
    this.filesUploaded.emit([...this.uploadedUrls]);
  }

  private async processFiles(rawFiles: File[]): Promise<void> {
    this.uploading = true;
    const urls: string[] = [];

    try {
      rawFiles.forEach((file) => {
        const type = this.detectType(file);
        const uploaded: UploadedFile = { file, type };
        if (type === 'IMAGE') {
          const reader = new FileReader();
          reader.onload = (e) => { uploaded.preview = e.target?.result as string; };
          reader.readAsDataURL(file);
        }
        if (!this.multiple) this.files = [];
        this.files.push(uploaded);
      });

      for (const file of rawFiles) {
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
}
