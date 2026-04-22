import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private count = 0;
  private readonly subject = new BehaviorSubject<boolean>(false);
  readonly isLoading$ = this.subject.pipe(distinctUntilChanged());

  show(): void { this.count++; this.subject.next(true); }
  hide(): void { this.count = Math.max(0, this.count - 1); if (this.count === 0) this.subject.next(false); }
}
