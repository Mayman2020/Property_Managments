import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { UploadZoneComponent } from '../../../shared/components/upload-zone/upload-zone.component';
import { MaintenanceService } from '../../../core/services/maintenance.service';
import { InventoryService, InventoryItem } from '../../../core/services/inventory.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';

interface UsedInventoryLine {
  item: InventoryItem;
  quantity: number;
}

@Component({
  selector: 'app-visit-report-form',
  standalone: true,
  imports: [
    NgFor, NgIf, DecimalPipe, ReactiveFormsModule, FormsModule, RouterLink, TranslateModule,
    MatDatepickerModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatCheckboxModule, MatProgressSpinnerModule,
    PageHeaderComponent, UploadZoneComponent
  ],
  templateUrl: './visit-report-form.component.html',
  styleUrl: './visit-report-form.component.scss'
})
export class VisitReportFormComponent implements OnInit {
  form: FormGroup;
  submitting = false;
  requestId = 0;
  receiptUrl = '';
  inventoryItems: InventoryItem[] = [];
  usedLines: UsedInventoryLine[] = [];
  selectedItemId: number | null = null;
  selectedQty = 1;

  readonly outcomes = [
    { value: 'COMPLETED', labelKey: 'VISIT.OUTCOME_COMPLETED', icon: 'task_alt' },
    { value: 'TENANT_ABSENT', labelKey: 'VISIT.OUTCOME_ABSENT', icon: 'person_off' },
    { value: 'NEEDS_PARTS', labelKey: 'VISIT.OUTCOME_NEEDS_PARTS', icon: 'hardware' },
    { value: 'NEEDS_REVISIT', labelKey: 'VISIT.OUTCOME_REVISIT', icon: 'replay' },
    { value: 'CANCELLED_BY_TENANT', labelKey: 'VISIT.OUTCOME_CANCELLED_BY_TENANT', icon: 'cancel' },
    { value: 'OTHER', labelKey: 'VISIT.OUTCOME_OTHER', icon: 'more_horiz' }
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly maintSvc: MaintenanceService,
    private readonly inventorySvc: InventoryService,
    private readonly snack: SnackService,
    readonly i18n: I18nService,
    private readonly router: Router
  ) {
    this.form = this.fb.group({
      visitDate: [null, Validators.required],
      visitOutcome: ['', Validators.required],
      workDone: [''],
      officerNotes: [''],
      hasPurchase: [false],
      purchaseAmount: [null],
      purchaseNotes: ['']
    });
  }

  ngOnInit(): void {
    this.requestId = Number(this.route.snapshot.paramMap.get('id'));
    this.maintSvc.getById(this.requestId).subscribe({
      next: (res) => {
        const propertyId = res.data?.propertyId;
        if (propertyId) {
          this.inventorySvc.getItems(propertyId, 0, 200).subscribe({
            next: (r) => { this.inventoryItems = r.data?.content ?? []; },
            error: () => {}
          });
        }
      },
      error: () => {}
    });
  }

  get hasPurchase(): boolean {
    return !!this.form.get('hasPurchase')?.value;
  }

  itemName(item: InventoryItem): string {
    return this.i18n.currentLang === 'ar' ? (item.itemNameAr || item.itemNameEn || '') : (item.itemNameEn || item.itemNameAr || '');
  }

  get availableItems(): InventoryItem[] {
    const usedIds = new Set(this.usedLines.map(l => l.item.id));
    return this.inventoryItems.filter(i => !usedIds.has(i.id));
  }

  addInventoryLine(): void {
    if (!this.selectedItemId) return;
    const item = this.inventoryItems.find(i => i.id === this.selectedItemId);
    if (!item) return;
    const qty = Number(this.selectedQty) || 1;
    if (qty <= 0 || qty > item.quantity) {
      this.snack.error(this.i18n.instant('VISIT.INVALID_QUANTITY'));
      return;
    }
    this.usedLines.push({ item, quantity: qty });
    this.selectedItemId = null;
    this.selectedQty = 1;
  }

  removeInventoryLine(index: number): void {
    this.usedLines.splice(index, 1);
  }

  private toDateString(d: Date | string | null): string | undefined {
    if (!d) return undefined;
    if (typeof d === 'string') return d;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  onReceiptUploaded(urls: string[]): void {
    this.receiptUrl = urls[0] ?? '';
  }

  submit(): void {
    if (this.form.invalid || this.submitting) return;
    if (this.hasPurchase) {
      const amount = Number(this.form.get('purchaseAmount')?.value);
      if (!amount || amount <= 0) {
        this.snack.error(this.i18n.instant('VISIT.PURCHASE_AMOUNT') + ' ' + this.i18n.instant('COMMON.REQUIRED'));
        return;
      }
      if (!this.receiptUrl) {
        this.snack.error(this.i18n.instant('VISIT.RECEIPT_URL') + ' ' + this.i18n.instant('COMMON.REQUIRED'));
        return;
      }
    }
    this.submitting = true;
    const raw = this.form.value;
    const payload = {
      ...raw,
      visitDate: this.toDateString(raw.visitDate),
      receiptUrl: this.receiptUrl || undefined,
      items: this.usedLines.map(l => ({ itemId: l.item.id, quantityUsed: l.quantity }))
    };
    this.maintSvc.submitVisitReport(this.requestId, payload).subscribe({
      next: () => {
        this.submitting = false;
        this.snack.success(this.i18n.instant('VISIT.SAVE_SUCCESS'));
        void this.router.navigateByUrl('/officer/requests');
      },
      error: (err: Error) => {
        this.submitting = false;
        this.snack.error(err.message || this.i18n.instant('VISIT.SAVE_ERROR'));
      }
    });
  }
}
