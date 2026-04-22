import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [NgClass],
  template: `<span class="status-badge" [attr.data-status]="status">{{ label }}</span>`,
  styles: [``]
})
export class StatusBadgeComponent {
  @Input() status = '';
  @Input() label = '';
}
