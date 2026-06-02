import { AfterViewInit, Directive, ElementRef, Input, OnDestroy, Renderer2 } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Directive({
  selector: '[mat-dialog-title]',
  standalone: true
})
export class DialogTitleCloseDirective implements AfterViewInit, OnDestroy {
  /** Set to false to hide the header close button. */
  @Input() appDialogTitleClose: boolean | '' = true;

  private removeClick?: () => void;

  constructor(
    private readonly el: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
    private readonly dialogRef: MatDialogRef<unknown>
  ) {}

  ngAfterViewInit(): void {
    if (this.appDialogTitleClose === false) return;
    const host = this.el.nativeElement;
    if (host.querySelector('.app-dialog-close-btn, .close-btn, [mat-dialog-close]')) return;

    this.renderer.addClass(host, 'app-dialog-title-with-close');

    const main = this.renderer.createElement('div');
    this.renderer.addClass(main, 'app-dialog-title-main');
    while (host.firstChild) {
      this.renderer.appendChild(main, host.firstChild);
    }
    this.renderer.appendChild(host, main);

    const closeBtn = this.renderer.createElement('button');
    this.renderer.addClass(closeBtn, 'app-dialog-close-btn');
    this.renderer.addClass(closeBtn, 'mat-mdc-icon-button');
    this.renderer.setAttribute(closeBtn, 'type', 'button');
    closeBtn.setAttribute('aria-label', 'Close');

    const icon = this.renderer.createElement('span');
    this.renderer.addClass(icon, 'mat-icon');
    this.renderer.addClass(icon, 'notranslate');
    this.renderer.addClass(icon, 'material-icons');
    icon.textContent = 'close';
    this.renderer.appendChild(closeBtn, icon);

    this.removeClick = this.renderer.listen(closeBtn, 'click', () => this.dialogRef.close(false));
    this.renderer.appendChild(host, closeBtn);
  }

  ngOnDestroy(): void {
    this.removeClick?.();
  }
}
