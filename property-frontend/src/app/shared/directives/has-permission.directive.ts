import { Directive, Input, OnChanges, OnDestroy, OnInit, TemplateRef, ViewContainerRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { PermissionAction } from '../../core/models/user.model';
import { PermissionService } from '../../core/services/permission.service';
import { AuthService } from '../../core/services/auth.service';

/**
 * Structural directive that shows/hides an element based on the DB-stored role permissions.
 *
 * Usage:
 *   <button *appCan="'properties'; action: 'create'">Add</button>
 *   <button *appCan="'users'; action: 'delete'">Delete</button>
 *   <div *appCan="'hr'">HR section (view-only check)</div>
 *
 * Automatically re-evaluates when the active role changes (multi-role users).
 */
@Directive({
  selector: '[appCan]',
  standalone: true
})
export class HasPermissionDirective implements OnInit, OnChanges, OnDestroy {
  @Input('appCan') module!: string;
  @Input('appCanAction') action: PermissionAction = 'view';

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
    const allowed = this.permissions.can(this.module, this.action);
    if (allowed && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!allowed && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}
