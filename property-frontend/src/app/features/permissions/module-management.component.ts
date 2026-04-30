import { Component, Inject, OnInit } from '@angular/core';
import { CurrencyPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { TablePagerComponent } from '../../shared/components/table-pager/table-pager.component';
import { ExportColumn, TableExportToolbarComponent } from '../../shared/components/table-export-toolbar/table-export-toolbar.component';
import {
  ModuleDefinitionDto,
  ModulePresetDto,
  PermissionService,
  PropertyModuleSettingDto
} from '../../core/services/permission.service';
import { Property, PropertyService } from '../../core/services/property.service';
import { AuthService } from '../../core/services/auth.service';
import { SnackService } from '../../core/services/snack.service';

interface ModuleDetailsDialogData {
  module: ModuleDefinitionDto;
  enabled: boolean;
  isArabic: boolean;
  requiredLabels: string[];
  recommendedLabels: string[];
  note: string;
}

@Component({
  selector: 'app-module-details-dialog',
  standalone: true,
  imports: [CurrencyPipe, NgFor, NgIf, MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>
      <span class="material-icons">{{ data.module.icon || 'widgets' }}</span>
      {{ title }}
    </h2>

    <mat-dialog-content class="module-dialog-body">
      <div class="dialog-summary">
        <div>
          <span>{{ data.isArabic ? 'الحالة' : 'Status' }}</span>
          <strong [class.off]="!data.enabled">{{ data.enabled ? (data.isArabic ? 'مفعل' : 'Enabled') : (data.isArabic ? 'غير مفعل' : 'Disabled') }}</strong>
        </div>
        <div>
          <span>{{ data.isArabic ? 'السعر الشهري' : 'Monthly Price' }}</span>
          <strong>{{ data.module.monthlyPrice || 0 | currency:'OMR':'symbol':'1.0-0' }}</strong>
        </div>
      </div>

      <section>
        <h3>{{ data.isArabic ? 'الوصف' : 'Description' }}</h3>
        <p>{{ description || '-' }}</p>
      </section>

      <section *ngIf="data.requiredLabels.length">
        <h3>{{ data.isArabic ? 'يعتمد على' : 'Requires' }}</h3>
        <div class="chip-row"><span *ngFor="let label of data.requiredLabels">{{ label }}</span></div>
      </section>

      <section *ngIf="data.recommendedLabels.length">
        <h3>{{ data.isArabic ? 'موصى به مع' : 'Recommended With' }}</h3>
        <div class="chip-row"><span *ngFor="let label of data.recommendedLabels">{{ label }}</span></div>
      </section>

      <div class="module-note" *ngIf="data.note">{{ data.note }}</div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-flat-button type="button" (click)="ref.close()">{{ data.isArabic ? 'إغلاق' : 'Close' }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 0;
    }

    h2 .material-icons {
      color: var(--primary);
    }

    .module-dialog-body {
      min-width: min(600px, 92vw);
      display: grid;
      gap: 14px;
      padding-top: 12px;
    }

    .dialog-summary {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .dialog-summary div,
    section,
    .module-note {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px;
      background: var(--surface-2);
    }

    .dialog-summary span {
      color: var(--text-muted);
      font-size: 0.82rem;
      display: block;
      margin-bottom: 4px;
    }

    .dialog-summary strong.off {
      color: var(--danger);
    }

    section h3 {
      margin: 0 0 8px;
      font-size: 1rem;
    }

    section p {
      margin: 0;
      color: var(--text-muted);
      line-height: 1.7;
    }

    .chip-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .chip-row span {
      border-radius: 999px;
      padding: 6px 10px;
      background: rgba(19, 78, 74, 0.1);
      color: var(--brand-deep);
      font-weight: 700;
      font-size: 0.82rem;
    }

    .module-note {
      color: var(--text-muted);
      line-height: 1.7;
    }
  `]
})
export class ModuleDetailsDialogComponent {
  constructor(
    readonly ref: MatDialogRef<ModuleDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) readonly data: ModuleDetailsDialogData
  ) {}

  get title(): string {
    return this.data.isArabic
      ? this.data.module.titleAr
      : (this.data.module.titleEn || this.data.module.titleAr);
  }

  get description(): string {
    return this.data.isArabic
      ? (this.data.module.descriptionAr || '')
      : (this.data.module.descriptionEn || this.data.module.descriptionAr || '');
  }
}

@Component({
  selector: 'app-module-management',
  standalone: true,
  imports: [
    NgClass,
    NgIf,
    NgFor,
    CurrencyPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
    TablePagerComponent,
    TableExportToolbarComponent
  ],
  template: `
    <div class="app-page module-page">
      <app-page-header
        [eyebrow]="isArabic ? 'مرونة النظام' : 'System Flexibility'"
        [title]="isArabic ? 'إدارة موديولات العميل' : 'Client Module Settings'"
        [subtitle]="isArabic ? 'تحكم في الباقة والموديولات والاعتمادات لكل عميل.' : 'Control package presets, module availability, and dependencies per client.'">
      </app-page-header>

      <section class="app-card">
        <div class="app-card-body toolbar-grid">
          <mat-form-field appearance="outline" *ngIf="auth.isSuperAdmin()">
            <mat-label>{{ isArabic ? 'العقار' : 'Property' }}</mat-label>
            <mat-select [formControl]="propertyIdControl">
              <mat-option *ngFor="let property of properties" [value]="property.id">{{ propertyLabel(property) }}</mat-option>
            </mat-select>
          </mat-form-field>

          <div class="property-pill" *ngIf="!auth.isSuperAdmin() && selectedPropertyName">
            {{ selectedPropertyName }}
          </div>

          <mat-form-field appearance="outline" *ngIf="presets.length">
            <mat-label>{{ isArabic ? 'الباقة الجاهزة' : 'Preset Package' }}</mat-label>
            <mat-select [formControl]="presetControl">
              <mat-option [value]="null">{{ isArabic ? 'اختيار يدوي' : 'Manual Selection' }}</mat-option>
              <mat-option *ngFor="let preset of presets" [value]="preset.presetCode">
                {{ isArabic ? preset.presetNameAr : (preset.presetNameEn || preset.presetNameAr) }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <div class="toolbar-actions">
            <button mat-stroked-button type="button" (click)="applyPreset()" [disabled]="!presetControl.value || loading">
              <mat-icon>auto_awesome</mat-icon>
              {{ isArabic ? 'تطبيق الباقة' : 'Apply Preset' }}
            </button>
            <button mat-flat-button type="button" (click)="save()" [disabled]="!selectedPropertyId || saving || loading">
              <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
              <ng-container *ngIf="!saving">
                <mat-icon>save</mat-icon>
                {{ isArabic ? 'حفظ الإعدادات' : 'Save Settings' }}
              </ng-container>
            </button>
          </div>
        </div>
      </section>

      <section class="summary-strip" *ngIf="!loading && modules.length">
        <article class="summary-card">
          <span>{{ isArabic ? 'الموديولات المفعلة' : 'Enabled Modules' }}</span>
          <strong>{{ enabledCount }} / {{ modules.length }}</strong>
        </article>
        <article class="summary-card">
          <span>{{ isArabic ? 'القيمة الشهرية التقديرية' : 'Estimated Monthly Value' }}</span>
          <strong>{{ estimatedTotal | currency:'OMR':'symbol':'1.0-0' }}</strong>
        </article>
      </section>

      <div class="loading-center" *ngIf="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <section class="app-card" *ngIf="!loading">
        <app-table-export-toolbar
          permissionKey="permissions"
          [title]="isArabic ? 'إدارة موديولات العميل' : 'Client Module Settings'"
          fileName="module-settings"
          [columns]="exportColumns"
          [rows]="modules">
        </app-table-export-toolbar>
        <div class="app-table-wrap">
          <table class="app-data-table module-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{{ isArabic ? 'الموديول' : 'Module' }}</th>
                <th>{{ isArabic ? 'الحالة' : 'Status' }}</th>
                <th>{{ isArabic ? 'السعر الشهري' : 'Monthly Price' }}</th>
                <th>{{ isArabic ? 'الاعتمادات' : 'Dependencies' }}</th>
                <th>{{ isArabic ? 'إجراءات' : 'Actions' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let module of pagedModules; let i = index" class="module-row" (click)="openDetails(module)">
                <td>{{ modulePageIndex * modulePageSize + i + 1 }}</td>
                <td>
                  <div class="module-title-cell">
                    <span class="material-icons">{{ module.icon || 'widgets' }}</span>
                    <div>
                      <strong>{{ moduleTitle(module) }}</strong>
                      <small>{{ module.moduleKey }}</small>
                    </div>
                  </div>
                </td>
                <td (click)="$event.stopPropagation()">
                  <mat-slide-toggle
                    color="primary"
                    [checked]="moduleState[module.moduleKey] !== false"
                    (change)="toggle(module.moduleKey, $event.checked)">
                  </mat-slide-toggle>
                </td>
                <td>{{ module.monthlyPrice || 0 | currency:'OMR':'symbol':'1.0-0' }}</td>
                <td>
                  <span class="count-pill">{{ dependencyCount(module) }}</span>
                </td>
                <td>
                  <button mat-stroked-button type="button" (click)="openDetails(module); $event.stopPropagation()">
                    <mat-icon>visibility</mat-icon>
                    {{ isArabic ? 'التفاصيل' : 'Details' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <app-table-pager
          [length]="modules.length"
          [pageIndex]="modulePageIndex"
          [pageSize]="modulePageSize"
          (pageIndexChange)="modulePageIndex = $event">
        </app-table-pager>
      </section>
    </div>
  `,
  styles: [`
    .module-page {
      display: grid;
      gap: 1.25rem;
    }

    .toolbar-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      align-items: center;
    }

    .toolbar-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .toolbar-actions button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .property-pill {
      padding: 10px 14px;
      border-radius: 999px;
      background: rgba(19, 78, 74, .08);
      color: var(--brand-deep);
      font-weight: 700;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
    }

    .loading-center {
      display: flex;
      justify-content: center;
      padding: 2rem 0;
    }

    .summary-strip {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }

    .summary-card {
      padding: 18px;
      border-radius: 8px;
      background: var(--card-bg, #fff);
      border: 1px solid var(--line);
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
    }

    .summary-card span {
      color: var(--text-muted);
    }

    .summary-card strong {
      font-size: 1.2rem;
    }

    .module-row {
      cursor: pointer;
    }

    .module-title-cell {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 240px;
    }

    .module-title-cell .material-icons {
      width: 38px;
      height: 38px;
      display: grid;
      place-items: center;
      border-radius: 8px;
      background: rgba(19, 78, 74, 0.08);
      color: var(--brand-deep);
    }

    .module-title-cell div {
      display: grid;
      gap: 2px;
    }

    .module-title-cell small {
      color: var(--text-muted);
      font-size: 0.78rem;
    }

    .count-pill {
      display: inline-flex;
      min-width: 34px;
      height: 28px;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.08);
      font-weight: 800;
      font-size: 0.84rem;
    }

    @media (max-width: 900px) {
      .summary-strip {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ModuleManagementComponent implements OnInit {
  readonly propertyIdControl = new FormControl<number | null>(null);
  readonly presetControl = new FormControl<string | null>(null);
  readonly modulePageSize = 6;
  modulePageIndex = 0;

  properties: Property[] = [];
  modules: ModuleDefinitionDto[] = [];
  presets: ModulePresetDto[] = [];
  moduleState: Record<string, boolean> = {};
  selectedPropertyName = '';
  loading = true;
  saving = false;

  constructor(
    readonly auth: AuthService,
    private readonly permissionService: PermissionService,
    private readonly propertyService: PropertyService,
    private readonly snack: SnackService,
    private readonly dialog: MatDialog
  ) {}

  get isArabic(): boolean {
    return document.documentElement.dir === 'rtl';
  }

  get selectedPropertyId(): number | null {
    return this.propertyIdControl.value;
  }

  get pagedModules(): ModuleDefinitionDto[] {
    const start = this.modulePageIndex * this.modulePageSize;
    return this.modules.slice(start, start + this.modulePageSize);
  }

  get enabledCount(): number {
    return this.modules.filter((item) => this.moduleState[item.moduleKey] !== false).length;
  }

  get estimatedTotal(): number {
    return this.modules
      .filter((item) => this.moduleState[item.moduleKey] !== false)
      .reduce((sum, item) => sum + Number(item.monthlyPrice || 0), 0);
  }

  get exportColumns(): ExportColumn<ModuleDefinitionDto>[] {
    return [
      { header: this.isArabic ? 'الموديول' : 'Module', value: (row) => this.moduleTitle(row) },
      { header: this.isArabic ? 'الكود' : 'Code', value: 'moduleKey' },
      { header: this.isArabic ? 'الحالة' : 'Status', value: (row) => this.moduleState[row.moduleKey] !== false ? (this.isArabic ? 'مفعل' : 'Enabled') : (this.isArabic ? 'غير مفعل' : 'Disabled') },
      { header: this.isArabic ? 'السعر الشهري' : 'Monthly Price', value: (row) => row.monthlyPrice || 0 },
      { header: this.isArabic ? 'الاعتمادات' : 'Dependencies', value: (row) => this.dependencyCount(row) }
    ];
  }

  ngOnInit(): void {
    forkJoin({
      definitions: this.permissionService.getModuleDefinitions(),
      presets: this.permissionService.getModulePresets()
    }).subscribe({
      next: ({ definitions, presets }) => {
        this.modules = definitions.data ?? [];
        this.presets = presets.data ?? [];
        this.initPropertyLoading();
      },
      error: () => {
        this.loading = false;
        this.snack.error(this.isArabic ? 'تعذر تحميل كتالوج الموديولات' : 'Unable to load module catalog');
      }
    });
  }

  propertyLabel(property: Property): string {
    return this.isArabic
      ? (property.propertyNameAr || property.propertyName)
      : (property.propertyNameEn || property.propertyName);
  }

  moduleTitle(module: ModuleDefinitionDto): string {
    return this.isArabic ? module.titleAr : (module.titleEn || module.titleAr);
  }

  dependencyCount(module: ModuleDefinitionDto): number {
    return (module.requiredModules?.length || 0) + (module.recommendedModules?.length || 0);
  }

  toggle(moduleKey: string, enabled: boolean): void {
    this.moduleState[moduleKey] = enabled;
    this.normalizeDependencies(moduleKey, enabled);
  }

  openDetails(module: ModuleDefinitionDto): void {
    this.dialog.open(ModuleDetailsDialogComponent, {
      width: '680px',
      panelClass: 'app-dialog-panel',
      data: {
        module,
        enabled: this.moduleState[module.moduleKey] !== false,
        isArabic: this.isArabic,
        requiredLabels: this.labelsFor(module.requiredModules || []),
        recommendedLabels: this.labelsFor(module.recommendedModules || []),
        note: this.dependencyNote(module.moduleKey)
      } satisfies ModuleDetailsDialogData
    });
  }

  applyPreset(): void {
    const preset = this.presets.find((item) => item.presetCode === this.presetControl.value);
    if (!preset) return;
    const nextState: Record<string, boolean> = {};
    for (const module of this.modules) {
      nextState[module.moduleKey] = preset.modules[module.moduleKey] === true;
    }
    this.moduleState = nextState;
    for (const module of this.modules) {
      if (this.moduleState[module.moduleKey]) {
        this.normalizeDependencies(module.moduleKey, true);
      }
    }
  }

  save(): void {
    const propertyId = this.selectedPropertyId;
    if (!propertyId || this.saving) return;
    this.saving = true;
    this.permissionService.updatePropertyModules(propertyId, this.moduleState).subscribe({
      next: (res) => {
        this.saving = false;
        this.applyModules(res.data ?? []);
        this.snack.success(this.isArabic ? 'تم حفظ إعدادات الموديولات' : 'Module settings saved successfully');
      },
      error: () => {
        this.saving = false;
        this.snack.error(this.isArabic ? 'تعذر حفظ الإعدادات' : 'Unable to save module settings');
      }
    });
  }

  labelsFor(moduleKeys: string[]): string[] {
    return moduleKeys.map((key) => {
      const item = this.modules.find((module) => module.moduleKey === key);
      return item ? this.moduleTitle(item) : key;
    });
  }

  dependencyNote(moduleKey: string): string {
    const module = this.modules.find((item) => item.moduleKey === moduleKey);
    if (!module) return '';
    if (this.moduleState[moduleKey] !== false) {
      const missingRecommended = (module.recommendedModules || []).filter((key) => this.moduleState[key] === false);
      if (missingRecommended.length) {
        return this.isArabic
          ? `هذا الموديول سيعمل، لكن يفضل تشغيل: ${this.labelsFor(missingRecommended).join('، ')}`
          : `This module will work, but it is better with: ${this.labelsFor(missingRecommended).join(', ')}`;
      }
      return '';
    }

    const blockedDependents = this.modules
      .filter((item) => (item.requiredModules || []).includes(moduleKey) && this.moduleState[item.moduleKey] !== false)
      .map((item) => this.moduleTitle(item));

    if (blockedDependents.length) {
      return this.isArabic
        ? `إيقاف هذا الموديول سيوقف أيضا: ${blockedDependents.join('، ')}`
        : `Disabling this module will also disable: ${blockedDependents.join(', ')}`;
    }
    return '';
  }

  private initPropertyLoading(): void {
    if (this.auth.isSuperAdmin()) {
      this.propertyService.getAll(0, 200).subscribe({
        next: (res) => {
          this.properties = res.data?.content ?? [];
          const first = this.properties[0]?.id ?? null;
          this.propertyIdControl.setValue(first, { emitEvent: false });
          if (first) {
            this.loadPropertyModules(first);
          } else {
            this.loading = false;
          }
        },
        error: () => { this.loading = false; this.properties = []; }
      });
      this.propertyIdControl.valueChanges.subscribe((propertyId) => {
        if (propertyId) this.loadPropertyModules(propertyId);
      });
      return;
    }

    const propertyId = this.auth.getCurrentUser()?.propertyId ?? null;
    this.propertyIdControl.setValue(propertyId, { emitEvent: false });
    if (propertyId) {
      this.propertyService.getById(propertyId).subscribe({
        next: (res) => {
          if (res.data) this.properties = [res.data];
          this.loadPropertyModules(propertyId);
        },
        error: () => this.loadPropertyModules(propertyId)
      });
    } else {
      this.loading = false;
    }
  }

  private loadPropertyModules(propertyId: number): void {
    this.loading = true;
    this.permissionService.getPropertyModules(propertyId).subscribe({
      next: (res) => {
        this.loading = false;
        const selected = this.properties.find((item) => item.id === propertyId);
        this.selectedPropertyName = selected ? this.propertyLabel(selected) : `#${propertyId}`;
        this.applyModules(res.data ?? []);
      },
      error: () => {
        this.loading = false;
        this.moduleState = {};
      }
    });
  }

  private applyModules(items: PropertyModuleSettingDto[]): void {
    const state: Record<string, boolean> = {};
    for (const item of items) {
      state[item.moduleKey] = !!item.enabled;
    }
    for (const module of this.modules) {
      if (!(module.moduleKey in state)) {
        state[module.moduleKey] = true;
      }
    }
    this.moduleState = state;
    this.permissionService.setPropertyModules(items);
  }

  private normalizeDependencies(moduleKey: string, enabled: boolean): void {
    const current = this.modules.find((item) => item.moduleKey === moduleKey);
    if (!current) return;

    if (enabled) {
      for (const requiredKey of current.requiredModules || []) {
        this.moduleState[requiredKey] = true;
        this.normalizeDependencies(requiredKey, true);
      }
      return;
    }

    for (const module of this.modules) {
      if ((module.requiredModules || []).includes(moduleKey) && this.moduleState[module.moduleKey] !== false) {
        this.moduleState[module.moduleKey] = false;
        this.normalizeDependencies(module.moduleKey, false);
      }
    }
  }
}
