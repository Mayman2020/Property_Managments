import { Component, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-map-preview',
  standalone: true,
  imports: [NgIf, MatIconModule, TranslateModule],
  template: `
    <div class="map-preview-container" [style.display]="url ? 'block' : 'none'">
      <iframe
        *ngIf="sanitizedUrl"
        [src]="sanitizedUrl"
        width="100%"
        height="250"
        frameborder="0"
        style="border:0; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"
        allowfullscreen>
      </iframe>
      <div *ngIf="isShortUrl" class="map-placeholder">
        <mat-icon>link_off</mat-icon>
        <p>{{ 'PROPERTY_FORM.MAP_SHORT_URL_NOT_SUPPORTED' | translate }}</p>
      </div>
      <div *ngIf="!sanitizedUrl && !isShortUrl && url" class="map-placeholder">
         <mat-icon>map_off</mat-icon>
         <p>{{ 'PROPERTY_FORM.MAP_PREVIEW_INVALID' | translate }}</p>
      </div>
    </div>
  `,
  styles: [`
    .map-preview-container {
      margin-top: 8px;
      width: 100%;
    }
    .map-placeholder {
      min-height: 200px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      background: var(--surface-2);
      color: var(--text-muted);
      border-radius: 14px;
      padding: 32px;
      text-align: center;
      border: 1px dashed var(--line);

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: var(--accent);
        opacity: 0.8;
      }
      p {
        margin: 0;
        font-size: 0.9rem;
        line-height: 1.6;
        max-width: 450px;
        color: var(--navy-700);
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MapPreviewComponent implements OnChanges {
  @Input() url: string | null = null;
  sanitizedUrl: SafeResourceUrl | null = null;
  isShortUrl = false;
  private lastEmbedUrl: string | null = null;

  constructor(
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['url']) {
      this.updateUrl(this.url);
    }
  }

  private updateUrl(url: string | null): void {
    const embed = url ? this.computeEmbedUrl(url) : null;
    if (embed === this.lastEmbedUrl) return;

    this.lastEmbedUrl = embed;
    this.isShortUrl = embed === '__short__';
    this.sanitizedUrl = (embed && !this.isShortUrl)
      ? this.sanitizer.bypassSecurityTrustResourceUrl(embed)
      : null;
    this.cdr.markForCheck();
  }

  /** Stable iframe URL without API key (lat/lng preferred). */
  private buildEmbed(lat: string, lng: string, z: number): string {
    return `https://maps.google.com/maps?q=${lat},${lng}&z=${z}&output=embed&iwloc=near`;
  }

  private zoomFromPb(url: string): number {
    const zi = url.match(/!6i(\d+)/);
    if (zi) {
      const n = parseInt(zi[1], 10);
      if (!Number.isNaN(n)) return Math.min(21, Math.max(1, n));
    }
    return 16;
  }

  /**
   * Extract lat/lng from normal Maps links (@…), embed pb fragments (!3d…!4d…, !1s…),
   * or broken embed URLs (origin=mfe&pb=…).
   */
  private extractCoords(url: string): { lat: string; lng: string; z: number } | null {
    const at = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)(?:,(\d+(?:\.\d+)?)z)?/);
    if (at) {
      const z = at[3] ? Math.min(21, Math.max(1, Math.round(parseFloat(at[3])))) : 16;
      return { lat: at[1], lng: at[2], z };
    }
    const d34 = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/i);
    if (d34) {
      return { lat: d34[1], lng: d34[2], z: this.zoomFromPb(url) };
    }
    const s1 = url.match(/!1s(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (s1) {
      return { lat: s1[1], lng: s1[2], z: this.zoomFromPb(url) };
    }
    return null;
  }

  private computeEmbedUrl(raw: string): string | null {
    const url = raw.trim();
    if (!url) return null;

    const lower = url.toLowerCase();
    if (lower.includes('maps.app.goo.gl') || lower.includes('goo.gl/maps')) return '__short__';

    const coords = this.extractCoords(url);
    if (coords) {
      return this.buildEmbed(coords.lat, coords.lng, coords.z);
    }

    // User pasted a full embed HTML src we cannot parse — pass through (may still be blocked by Google)
    if (url.includes('/maps/embed')) {
      return url;
    }

    const placeMatch = url.match(/\/maps\/place\/([^/@?]+)/);
    if (placeMatch) {
      const placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')).trim();
      if (placeName) {
        return `https://maps.google.com/maps?q=${encodeURIComponent(placeName)}&z=16&output=embed&iwloc=near`;
      }
    }

    if (/google\.com\/maps|maps\.google\.com\/maps/i.test(url)) {
      try {
        const u = new URL(url);
        const q = u.searchParams.get('q');
        if (q) {
          return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed&iwloc=near`;
        }
      } catch { /* ignore */ }
    }

    return null;
  }
}
