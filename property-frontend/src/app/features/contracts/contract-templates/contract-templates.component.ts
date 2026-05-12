import { Component, OnInit } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, of } from 'rxjs';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { ContractService } from '../../../core/services/contract.service';
import { ContractTemplate, TemplateType } from '../../../core/models/contract.model';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-contract-templates',
  standalone: true,
  imports: [
    NgIf, NgFor, FormsModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatInputModule, MatSelectModule, MatCheckboxModule,
    MatProgressSpinnerModule, MatTableModule, MatTooltipModule,
    TranslateModule, PageHeaderComponent, TablePagerComponent
  ],
  templateUrl: './contract-templates.component.html',
  styleUrl: './contract-templates.component.scss'
})
export class ContractTemplatesComponent implements OnInit {
  loading = true;
  saving = false;
  showForm = false;
  editingId: number | null = null;
  templates: ContractTemplate[] = [];
  form!: FormGroup;
  errorMsg = '';
  readonly pageSize = 5;
  pageIndex = 0;

  types: TemplateType[] = ['RESIDENTIAL', 'COMMERCIAL', 'SHOP'];
  displayedColumns = ['name', 'type', 'active', 'actions'];

  constructor(
    private contractSvc: ContractService,
    private fb: FormBuilder,
    private i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadTemplates();
  }

  initForm(t?: ContractTemplate): void {
    this.form = this.fb.group({
      templateNameAr: [t?.templateNameAr ?? t?.templateName ?? '', Validators.required],
      templateNameEn: [t?.templateNameEn ?? t?.templateName ?? '', Validators.required],
      templateType: [t?.templateType ?? 'RESIDENTIAL'],
      content: [t?.content ?? '', Validators.required],
      variables: [t?.variables ?? '{}'],
      isActive: [t?.isActive ?? true]
    });
  }

  loadTemplates(): void {
    this.loading = true;
    this.contractSvc.getAllTemplates().pipe(catchError(() => of(null))).subscribe(res => {
      this.templates = res?.data?.content ?? res?.data ?? [];
      this.pageIndex = Math.min(this.pageIndex, Math.max(Math.ceil(this.templates.length / this.pageSize) - 1, 0));
      this.loading = false;
    });
  }

  get pagedTemplates(): ContractTemplate[] {
    const start = this.pageIndex * this.pageSize;
    return this.templates.slice(start, start + this.pageSize);
  }

  openNew(): void {
    this.editingId = null;
    this.initForm();
    this.showForm = true;
    this.errorMsg = '';
  }

  openEdit(t: ContractTemplate): void {
    this.editingId = t.id;
    this.initForm(t);
    this.showForm = true;
    this.errorMsg = '';
  }

  cancel(): void {
    this.showForm = false;
    this.editingId = null;
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const value = this.form.value;
    const templateNameAr = (value.templateNameAr ?? '').trim();
    const templateNameEn = (value.templateNameEn ?? '').trim();
    const body: Partial<ContractTemplate> = {
      ...value,
      templateNameAr,
      templateNameEn,
      templateName: this.i18n.currentLang === 'ar' ? templateNameAr : templateNameEn
    };
    const obs = this.editingId
      ? this.contractSvc.updateTemplate(this.editingId, body)
      : this.contractSvc.createTemplate(body);

    obs.subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.loadTemplates();
      },
      error: (err) => {
        this.errorMsg = err?.error?.message ?? 'Error saving template';
        this.saving = false;
      }
    });
  }

  templateDisplayName(t: ContractTemplate): string {
    return this.i18n.currentLang === 'ar'
      ? (t.templateNameAr || t.templateName || t.templateNameEn || '')
      : (t.templateNameEn || t.templateName || t.templateNameAr || '');
  }
}
