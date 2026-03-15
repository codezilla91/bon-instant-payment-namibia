import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { formatDateTime } from '../../shared/formatting';
import { nonBlankValidator } from '../../shared/validators';
import { SupportTicket, SupportTicketService } from './support-ticket.service';

interface HealthResponse {
  status: string;
  service: string;
}

interface HealthState {
  status: 'CHECKING' | 'UP' | 'DOWN';
  message: string;
  service: string;
  checkedAt?: string;
}

@Component({
  selector: 'app-support-page',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './support-page.html',
  styleUrl: './support-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SupportPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly supportDesk = inject(SupportTicketService);

  protected readonly tickets = this.supportDesk.recentTickets;
  protected readonly checkingHealth = signal(false);
  protected readonly health = signal<HealthState>({
    status: 'CHECKING',
    message: 'Checking API availability.',
    service: 'bon-p2p-mock-api'
  });

  protected readonly form = this.fb.nonNullable.group({
    category: ['API' as SupportTicket['category'], [Validators.required]],
    severity: ['Medium' as SupportTicket['severity'], [Validators.required]],
    subject: ['', [Validators.required, Validators.maxLength(60), nonBlankValidator]],
    detail: ['', [Validators.required, Validators.maxLength(240), nonBlankValidator]]
  });

  constructor() {
    this.refreshHealth();
  }

  protected submitTicket(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.supportDesk.createTicket(value);
    this.form.reset({
      category: 'API',
      severity: 'Medium',
      subject: '',
      detail: ''
    });
  }

  protected refreshHealth(): void {
    this.checkingHealth.set(true);

    this.http
      .get<HealthResponse>('/api/health')
      .pipe(finalize(() => this.checkingHealth.set(false)))
      .subscribe({
        next: (response) => {
          this.health.set({
            status: response.status === 'UP' ? 'UP' : 'DOWN',
            message: response.status === 'UP' ? 'API is responding normally.' : 'API is reporting an issue.',
            service: response.service,
            checkedAt: new Date().toISOString()
          });
        },
        error: () => {
          this.health.set({
            status: 'DOWN',
            message: 'API is unreachable from the web client.',
            service: 'bon-p2p-mock-api',
            checkedAt: new Date().toISOString()
          });
        }
      });
  }

  protected clearTickets(): void {
    this.supportDesk.clear();
  }

  protected formatTimestamp(createdAt: string): string {
    return formatDateTime(createdAt);
  }

  protected trackTicket(_index: number, ticket: SupportTicket): string {
    return ticket.id;
  }
}
