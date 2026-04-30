import { Component, Inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { TranslateModule } from '@ngx-translate/core';

export interface ReviewDialogData {
  title: string;
  currentStatus?: string;
}

@Component({
  selector: 'app-review-dialog',
  standalone: true,
  imports: [
    NgIf, ReactiveFormsModule, TranslateModule,
    MatDialogModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatRadioModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content [formGroup]="form">
      <mat-radio-group formControlName="status" class="radio-group">
        <mat-radio-button value="APPROVED">{{ 'RECEIPT_STATUS.APPROVED' | translate }}</mat-radio-button>
        <mat-radio-button value="REJECTED">{{ 'RECEIPT_STATUS.REJECTED' | translate }}</mat-radio-button>
      </mat-radio-group>

      <mat-form-field appearance="outline" class="full-width" style="margin-top:16px">
        <mat-label>{{ 'COMMON.NOTES' | translate }}</mat-label>
        <textarea matInput formControlName="notes" rows="3"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'COMMON.CANCEL' | translate }}</button>
      <button mat-flat-button color="primary" (click)="confirm()" [disabled]="form.invalid">
        {{ 'COMMON.CONFIRM' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { min-width: 340px; }
    .radio-group { display: flex; gap: 24px; }
    .full-width { width: 100%; }
  `]
})
export class ReviewDialogComponent {
  form: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly ref: MatDialogRef<ReviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) readonly data: ReviewDialogData
  ) {
    this.form = this.fb.group({
      status: ['APPROVED', Validators.required],
      notes: ['']
    });
  }

  confirm(): void {
    if (this.form.valid) {
      this.ref.close(this.form.value);
    }
  }
}
