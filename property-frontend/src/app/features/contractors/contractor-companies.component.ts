import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ContractorCompany, ContractorCompanyService } from '../../core/services/contractor-company.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-contractor-companies',
  standalone: true,
  imports: [
    NgFor, NgIf, ReactiveFormsModule, TranslateModule,
    MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule,
    MatSlideToggleModule, MatIconModule,
    PageHeaderComponent, EmptyStateComponent
  ],
  templateUrl: './contractor-companies.component.html',
  styleUrl: './contractor-companies.component.scss'
})
export class ContractorCompaniesComponent implements OnInit {
  companies: ContractorCompany[] = [];
  loading = true;
  saving = false;
  formVisible = false;
  editing: ContractorCompany | null = null;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    phone: ['', [Validators.maxLength(40)]],
    email: ['', [Validators.maxLength(150)]],
    notes: [''],
    active: [true]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly svc: ContractorCompanyService,
    readonly auth: AuthService
  ) {}

  get canHardDelete(): boolean {
    return this.auth.isSuperAdmin();
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.svc.list(true).subscribe({
      next: (res) => {
        this.companies = res.data ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  startCreate(): void {
    this.editing = null;
    this.formVisible = true;
    this.form.reset({ name: '', phone: '', email: '', notes: '', active: true });
  }

  startEdit(c: ContractorCompany): void {
    this.editing = c;
    this.formVisible = true;
    this.form.patchValue({
      name: c.name,
      phone: c.phone ?? '',
      email: c.email ?? '',
      notes: c.notes ?? '',
      active: c.active
    });
  }

  cancelForm(): void {
    this.editing = null;
    this.formVisible = false;
    this.form.reset({ name: '', phone: '', email: '', notes: '', active: true });
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const v = this.form.getRawValue();
    const body = {
      name: v.name.trim(),
      phone: v.phone?.trim() || undefined,
      email: v.email?.trim() || undefined,
      notes: v.notes?.trim() || undefined,
      active: v.active
    };
    const req = this.editing
      ? this.svc.update(this.editing.id, body)
      : this.svc.create(body);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.cancelForm();
        this.load();
      },
      error: () => {
        this.saving = false;
      }
    });
  }

  remove(c: ContractorCompany): void {
    if (!this.canHardDelete || !confirm(`Delete ${c.name}?`)) return;
    this.svc.delete(c.id).subscribe({
      next: () => this.load(),
      error: () => {}
    });
  }
}
