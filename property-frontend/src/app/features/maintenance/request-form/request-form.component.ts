import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { UploadZoneComponent, UploadedFile } from '../../../shared/components/upload-zone/upload-zone.component';
import { MaintenanceService } from '../../../core/services/maintenance.service';
import { SnackService } from '../../../core/services/snack.service';
import { AuthService } from '../../../core/services/auth.service';
import { forkJoin, of, switchMap } from 'rxjs';

@Component({
  selector: 'app-request-form',
  standalone: true,
  imports: [
    NgFor, NgIf, ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    PageHeaderComponent, UploadZoneComponent
  ],
  templateUrl: './request-form.component.html',
  styleUrl: './request-form.component.scss'
})
export class RequestFormComponent implements OnInit {
  form: FormGroup;
  loading = false;
  submitting = false;
  uploadedFiles: UploadedFile[] = [];
  uploadedUrls: string[] = [];
  categories: { id: number; nameAr: string; nameEn: string; icon: string }[] = [];

  readonly priorities = [
    { value: 'LOW', label: 'منخفضة' },
    { value: 'NORMAL', label: 'عادية' },
    { value: 'HIGH', label: 'عالية' },
    { value: 'URGENT', label: 'عاجلة 🔴' }
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly maintSvc: MaintenanceService,
    private readonly snack: SnackService,
    private readonly router: Router,
    readonly auth: AuthService
  ) {
    this.form = this.fb.group({
      categoryId: [null, Validators.required],
      title: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['', [Validators.required, Validators.maxLength(2000)]],
      priority: ['NORMAL', Validators.required]
    });
  }

  ngOnInit(): void {
    this.maintSvc.getCategories().subscribe({
      next: (res) => { this.categories = res.data ?? []; },
      error: () => {}
    });
  }

  onFilesChanged(files: UploadedFile[]): void { this.uploadedFiles = files; }
  onFilesUploaded(urls: string[]): void { this.uploadedUrls = urls; }

  submit(): void {
    if (this.form.invalid || this.submitting) return;
    this.submitting = true;

    this.maintSvc.create(this.form.value).pipe(
      switchMap((res) => {
        const requestId = res?.data?.id;
        if (!requestId || this.uploadedUrls.length === 0) return of(res);

        const currentUserId = this.auth.getCurrentUser()?.id;
        const attachmentCalls = this.uploadedUrls.map((url, i) => {
          const file = this.uploadedFiles[i];
          const fileType = file?.type ?? 'DOCUMENT';
          const fileName = file?.file?.name ?? `attachment-${i + 1}`;
          const fileSizeKb = file?.file?.size ? Math.ceil(file.file.size / 1024) : undefined;
          return this.maintSvc.addAttachment(requestId, {
            fileUrl: url,
            fileType,
            fileName,
            fileSizeKb,
            uploadedBy: currentUserId
          });
        });
        return forkJoin(attachmentCalls).pipe(switchMap(() => of(res)));
      })
    ).subscribe({
      next: (res) => {
        this.submitting = false;
        this.snack.success('تم إرسال طلب الصيانة بنجاح');
        const route = this.auth.isTenant() ? '/tenant/requests' : '/admin/maintenance';
        void this.router.navigateByUrl(route);
      },
      error: (err: Error) => {
        this.submitting = false;
        this.snack.error(err.message || 'فشل إرسال الطلب');
      }
    });
  }
}
