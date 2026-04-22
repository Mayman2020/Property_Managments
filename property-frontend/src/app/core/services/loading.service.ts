import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private count = 0;
  private readonly subject = new BehaviorSubject<boolean>(false);
  private watchdog?: ReturnType<typeof setTimeout>;
  private readonly watchdogMs = 15000;
  readonly isLoading$ = this.subject.pipe(distinctUntilChanged());

  show(): void {
    this.count++;
    this.subject.next(true);
    this.ensureWatchdog();
  }

  hide(): void {
    this.count = Math.max(0, this.count - 1);
    if (this.count === 0) {
      this.subject.next(false);
      this.clearWatchdog();
    }
  }

  private ensureWatchdog(): void {
    this.clearWatchdog();
    this.watchdog = setTimeout(() => {
      // Safety net: prevent permanent overlay if a request gets stuck forever.
      this.count = 0;
      this.subject.next(false);
      this.watchdog = undefined;
    }, this.watchdogMs);
  }

  private clearWatchdog(): void {
    if (this.watchdog) {
      clearTimeout(this.watchdog);
      this.watchdog = undefined;
    }
  }
}
