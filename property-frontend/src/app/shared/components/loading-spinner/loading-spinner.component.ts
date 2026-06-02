import { Component } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [AsyncPipe, NgIf, TranslateModule],
  templateUrl: './loading-spinner.component.html',
  styleUrl: './loading-spinner.component.scss'
})
export class LoadingSpinnerComponent {
  constructor(readonly loading: LoadingService) {}
}
