import { Pipe, PipeTransform } from '@angular/core';
import { MaintenanceRequest } from '../../core/services/maintenance.service';

@Pipe({ name: 'requestsByStatus', standalone: true })
export class RequestsByStatusPipe implements PipeTransform {
  transform(requests: MaintenanceRequest[], status: string): MaintenanceRequest[] {
    return requests.filter((r) => r.status === status);
  }
}
