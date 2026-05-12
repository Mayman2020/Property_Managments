import { Component, Inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

export interface OwnerDraftRejectDialogData {
  contractId: number;
  contractNumber: string;
}

@Component({
  selector: 'app-owner-draft-reject-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, TranslateModule,
    MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule
  ],
  template: `
    <h2 mat-dialog-title>{{ 'OWNER_PORTAL.REJECT_DRAFT_TITLE' | translate }}</h2>
    <mat-dialog-content>
      <p class="muted">{{ data.contractNumber }}</p>
      <mat-form-field appearance="outline" class="full">
        <mat-label>{{ 'OWNER_PORTAL.REJECT_REASON' | translate }}</mat-label>
        <textarea matInput rows="4" [formControl]="form.controls.reason"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">{{ 'COMMON.CANCEL' | translate }}</button>
      <button mat-flat-button color="warn" type="button" (click)="submit()" [disabled]="form.invalid">
        {{ 'OWNER_PORTAL.REJECT' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full { width: 100%; }
    .muted { color: #666; font-size: 13px; margin: 0 0 12px; }
  `]
})
export class OwnerDraftRejectDialogComponent {
  form = this.fb.group({ reason: ['', [Validators.required, Validators.minLength(5)]] });

  constructor(
    private readonly fb: FormBuilder,
    private readonly ref: MatDialogRef<OwnerDraftRejectDialogComponent, string | null>,
    @Inject(MAT_DIALOG_DATA) readonly data: OwnerDraftRejectDialogData
  ) {}

  submit(): void {
    if (this.form.invalid) return;
    this.ref.close(this.form.value.reason!.trim());
  }
}
