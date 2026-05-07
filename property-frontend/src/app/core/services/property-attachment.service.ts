import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import { ApiResponse } from '../models/api-response.model';

export interface PropertyAttachment {
  id: number;
  propertyId: number;
  originalName: string;
  storedName: string;
  fileSize: number | null;
  mimeType: string | null;
  uploadedBy: number | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class PropertyAttachmentService {
  constructor(private readonly api: ApiService) {}

  list(propertyId: number): Observable<ApiResponse<PropertyAttachment[]>> {
    return this.api.get<ApiResponse<PropertyAttachment[]>>(
      AppConstants.API.PROPERTY_ATTACHMENTS(propertyId)
    );
  }

  upload(propertyId: number, file: File): Observable<ApiResponse<PropertyAttachment>> {
    const fd = new FormData();
    fd.append('file', file);
    return this.api.postFormData<ApiResponse<PropertyAttachment>>(
      AppConstants.API.PROPERTY_ATTACHMENTS(propertyId),
      fd
    );
  }

  delete(propertyId: number, attachmentId: number): Observable<ApiResponse<void>> {
    return this.api.delete<ApiResponse<void>>(
      AppConstants.API.PROPERTY_ATTACHMENT_BY_ID(propertyId, attachmentId)
    );
  }

  viewUrl(propertyId: number, attachmentId: number): string {
    return this.api.buildUrl(AppConstants.API.PROPERTY_ATTACHMENT_VIEW(propertyId, attachmentId));
  }

  downloadUrl(propertyId: number, attachmentId: number): string {
    return this.api.buildUrl(AppConstants.API.PROPERTY_ATTACHMENT_DOWNLOAD(propertyId, attachmentId));
  }

  isImage(mimeType: string | null): boolean {
    return !!mimeType && mimeType.startsWith('image/');
  }

  isPdf(mimeType: string | null): boolean {
    return mimeType === 'application/pdf';
  }

  iconFor(mimeType: string | null): string {
    if (!mimeType) return 'insert_drive_file';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'picture_as_pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'description';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'table_chart';
    if (mimeType.startsWith('video/')) return 'videocam';
    return 'attach_file';
  }

  formatSize(bytes: number | null): string {
    if (bytes == null) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
