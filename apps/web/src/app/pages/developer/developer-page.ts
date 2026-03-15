import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

interface ResponseState {
  code: string;
  title: string;
  http: string;
}

@Component({
  selector: 'app-developer-page',
  imports: [CommonModule],
  templateUrl: './developer-page.html',
  styleUrl: './developer-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeveloperPageComponent {
  protected readonly copied = signal(false);
  protected readonly responseStates: ReadonlyArray<ResponseState> = [
    { code: 'SUCCESS', title: 'Payment instruction accepted',       http: '200' },
    { code: 'ERR000',  title: 'Malformed request body',            http: '400' },
    { code: 'ERR001',  title: 'Missing or invalid required field',  http: '400' },
    { code: 'ERR002',  title: 'Invalid account number format',      http: '400' },
    { code: 'ERR003',  title: 'Unsupported currency (NAD only)',    http: '400' },
    { code: 'ERR004',  title: 'Invalid amount value',               http: '400' },
    { code: 'ERR005',  title: 'Insufficient funds',                 http: '402' },
    { code: 'ERR006',  title: 'Internal processing error',          http: '500' },
    { code: 'ERR007',  title: 'Duplicate clientReference',          http: '409' },
    { code: 'ERR010',  title: 'Rate limit exceeded',                http: '429' }
  ];

  protected readonly samplePayload = JSON.stringify(
    {
      clientReference: 'REF-20260306-001',
      senderAccountNumber: '1234567890',
      receiverAccountNumber: '0987654321',
      amount: 150.00,
      currency: 'NAD',
      reference: 'Lunch payment'
    },
    null,
    2
  );

  protected async copyPayload(): Promise<void> {
    if (!('clipboard' in navigator)) {
      return;
    }

    await navigator.clipboard.writeText(this.samplePayload);
    this.copied.set(true);
    globalThis.setTimeout(() => this.copied.set(false), 1800);
  }
}
