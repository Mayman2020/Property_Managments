import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { PropertyService } from '../../../core/services/property.service';
import { SnackService } from '../../../core/services/snack.service';

@Component({
  selector: 'app-property-form',
  standalone: true,
  imports: [
    NgIf, ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    PageHeaderComponent
  ],
  templateUrl: './property-form.component.html',
  styleUrl: './property-form.component.scss'
})
export class PropertyFormComponent {
  form: FormGroup;
  submitting = false;

  readonly types = [
    { value: 'RESIDENTIAL', label: 'سكني' },
    { value: 'COMMERCIAL', label: 'تجاري' },
    { value: 'MIXED', label: 'مختلط' }
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly propertySvc: PropertyService,
    private readonly snack: SnackService,
    private readonly router: Router
  ) {
    this.form = this.fb.group({
      propertyName: ['', Validators.required],
      propertyCode: ['', Validators.required],
      propertyType: ['RESIDENTIAL', Validators.required],
      address: ['', Validators.required],
      city: [''],
      country: ['السعودية'],
      totalFloors: [1],
      description: [''],
      ownerId: [null, Validators.required]
    });
  }

  submit(): void {
    if (this.form.invalid || this.submitting) return;
    this.submitting = true;
    this.propertySvc.create(this.form.value).subscribe({
      next: () => { this.submitting = false; this.snack.success('تم إضافة العقار'); void this.router.navigateByUrl('/admin/properties'); },
      error: (err: Error) => { this.submitting = false; this.snack.error(err.message || 'فشل إضافة العقار'); }
    });
  }
}
