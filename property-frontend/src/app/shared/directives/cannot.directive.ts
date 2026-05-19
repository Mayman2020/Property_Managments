import { Directive, Input, OnChanges, OnDestroy, OnInit, TemplateRef, ViewContainerRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { PermissionAction } from '../../core/models/user.model';
import { PermissionService } from '../../core/services/permission.service';
import { AuthService } from '../../core/services/auth.service';

/**
 * Inverse of {@link HasPermissionDirective}.
 * Shows the element only when the user LACKS the given permission.
 * Useful for displaying read-only banners or disabled-state wrappers.
 *
 * Usage:
 *   <span *appCannot="'properties'; action: 'edit'">(عرض فقط)</span>
 */
@Directive({
  selector: '[appCannot]',
  standalone: true
})
export class CannotDirective implements OnInit, OnChanges, OnDestroy {
  @Input('appCannot') module!: string;
  @Input('appCannotAction') action: PermissionAction = 'edit';

  private hasView = false;
  private roleChangeSub?: Subscription;

  constructor(
    private readonly templateRef: TemplateRef<unknown>,
    private readonly viewContainer: ViewContainerRef,
    private readonly permissions: PermissionService,
    private readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    this.updateView();
    this.roleChangeSub = this.auth.activeRoleChanged.subscribe(() => this.updateView());
  }

  ngOnChanges(): void {
    this.updateView();
  }

  ngOnDestroy(): void {
    this.roleChangeSub?.unsubscribe();
  }

  private updateView(): void {
    const denied = !this.permissions.can(this.module, this.action);
    if (denied && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!denied && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}
