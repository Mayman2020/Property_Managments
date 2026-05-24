import { Component, OnInit } from '@angular/core';
import { Location, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ApiService } from '../../../core/services/api.service';
import { Inspection, InspectionService, ItemCondition } from '../../../core/services/inspection.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-inspection-detail',
  standalone: true,
  imports: [
    NgIf, NgFor, FormsModule, TranslateModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSelectModule, PageHeaderComponent
  ],
  templateUrl: './inspection-detail.component.html',
  styleUrl: './inspection-detail.component.scss'
})
export class InspectionDetailComponent implements OnInit {
  loading = true;
  actionLoading = false;
  inspectionId = 0;
  inspection: Inspection | null = null;
  linkResult: { totalDeduction: number; depositAmount: number; remainingDeposit: number } | null = null;

  readonly conditions: ItemCondition[] = ['GOOD', 'FAIR', 'DAMAGED', 'MISSING'];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly service: InspectionService,
    private readonly api: ApiService,
    private readonly snack: SnackService,
    private readonly location: Location,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.inspectionId = Number(this.route.snapshot.paramMap.get('id'));
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.service.getById(this.inspectionId).subscribe({
      next: (res) => {
        this.inspection = res.data ?? null;
        this.loading = false;
      },
      error: () => {
        this.inspection = null;
        this.loading = false;
      }
    });
  }

  conditionLabel(c: ItemCondition): string {
    return `INSPECTION.CONDITION_${c}`;
  }

  updateItem(itemId: number, condition: ItemCondition): void {
    this.service.updateItem(this.inspectionId, itemId, { condition }).subscribe({
      next: (res) => {
        if (this.inspection?.items) {
          const idx = this.inspection.items.findIndex(i => i.id === itemId);
          if (idx >= 0 && res.data) {
            this.inspection.items[idx] = res.data;
          }
        }
      },
      error: () => this.snack.error('COMMON.ERROR')
    });
  }

  uploadPhoto(itemId: number, file: File): void {
    this.api.uploadFile(file).subscribe({
      next: (upload) => {
        if (!upload.url) return;
        this.service.updateItem(this.inspectionId, itemId, { photoUrl: upload.url }).subscribe({
          next: () => this.reload(),
          error: () => this.snack.error('COMMON.ERROR')
        });
      },
      error: () => this.snack.error('COMMON.ERROR')
    });
  }

  onPhotoSelected(itemId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.uploadPhoto(itemId, file);
    input.value = '';
  }

  complete(): void {
    this.actionLoading = true;
    this.service.complete(this.inspectionId).subscribe({
      next: (res) => {
        this.inspection = res.data ?? this.inspection;
        this.actionLoading = false;
        this.snack.success('INSPECTION.COMPLETE_SUCCESS');
      },
      error: () => {
        this.actionLoading = false;
        this.snack.error('COMMON.ERROR');
      }
    });
  }

  signInspector(): void {
    this.actionLoading = true;
    this.service.sign(this.inspectionId, 'INSPECTOR').subscribe({
      next: (res) => {
        this.inspection = res.data ?? this.inspection;
        this.actionLoading = false;
      },
      error: () => {
        this.actionLoading = false;
        this.snack.error('COMMON.ERROR');
      }
    });
  }

  linkDamages(): void {
    this.service.linkDamages(this.inspectionId).subscribe({
      next: (res) => {
        this.linkResult = res.data ?? null;
        this.reload();
      },
      error: () => this.snack.error('COMMON.ERROR')
    });
  }

  goBack(): void {
    this.location.back();
  }

  get damagedItems(): { area: string; estimatedDeduction?: number }[] {
    return (this.inspection?.items ?? []).filter(i => i.condition === 'DAMAGED' || i.condition === 'MISSING');
  }
}
