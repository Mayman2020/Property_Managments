import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="app-empty-state">
      <span class="material-icons empty-icon">{{ icon }}</span>
      <h4>{{ title }}</h4>
      <p>{{ message }}</p>
      <ng-content></ng-content>
    </div>
  `
})
export class EmptyStateComponent {
  @Input() icon = 'inbox';
  @Input() title = 'No data found';
  @Input() message = 'There are no items to display.';
}
