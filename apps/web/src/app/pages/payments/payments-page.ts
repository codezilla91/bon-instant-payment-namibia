import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { PaymentLedgerService } from '../../payment-ledger.service';
import { PaymentApiResponse, PaymentSubmission, StoredPayment } from '../../payment.models';
import { formatCurrencyAmount, formatDateTime, formatNad } from '../../shared/formatting';
import { nonBlankValidator, positiveAmountValidator } from '../../shared/validators';
import { ToastService } from '../../toast.service';

type FormControlName =
  | 'senderAccountNumber'
  | 'receiverAccountNumber'
  | 'amount'
  | 'currency'
  | 'reference'
  | 'clientReference';

interface ResponseView extends PaymentApiResponse {
  createdAt?: string;
}

@Component({
  selector: 'app-payments-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './payments-page.html',
  styleUrl: './payments-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentsPageComponent {
  protected readonly currencies = ['NAD', 'ZAR', 'USD'] as const;
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly ledger = inject(PaymentLedgerService);
  private readonly toastService = inject(ToastService);

  protected readonly submitting = signal(false);
  protected readonly balanceVisible = signal(true);
  protected readonly apiResponse = signal<PaymentApiResponse | null>(null);
  protected readonly payments = this.ledger.payments;
  protected readonly recentPayments = computed(() => this.payments().slice(0, 4));
  protected readonly latestPayment = computed(() => this.payments()[0] ?? null);
  protected readonly balanceLabel = computed(() =>
    this.balanceVisible() ? formatNad(this.ledger.balance()) : '•••••••'
  );
  protected readonly responseView = computed<ResponseView | null>(() => {
    const current = this.apiResponse();

    if (current) {
      return {
        ...current,
        createdAt: this.latestPayment()?.createdAt
      };
    }

    const latestPayment = this.latestPayment();

    if (!latestPayment) {
      return null;
    }

    return {
      status: latestPayment.status,
      transactionId: latestPayment.transactionId,
      clientReference: latestPayment.clientReference,
      errorCode: latestPayment.errorCode,
      message: latestPayment.message,
      createdAt: latestPayment.createdAt
    };
  });

  protected readonly form = this.fb.nonNullable.group({
    senderAccountNumber: ['', [Validators.required, Validators.pattern(/^\d{10,}$/)]],
    receiverAccountNumber: ['', [Validators.required, Validators.pattern(/^\d{10,}$/)]],
    amount: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/), positiveAmountValidator]],
    currency: ['NAD', [Validators.required]],
    reference: ['', [Validators.required, Validators.maxLength(50), nonBlankValidator]],
    clientReference: [this.generateClientReference(), [Validators.required, Validators.maxLength(50), nonBlankValidator]]
  });

  private readonly formStatus = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  protected readonly canSubmit = computed(() => this.formStatus() === 'VALID' && !this.submitting());

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.apiResponse.set(null);

    const payload = this.toPayload();

    this.http
      .post<PaymentApiResponse>('/api/p2p-payment', payload)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (response) => {
          this.ledger.recordPayment(payload, response);
          this.apiResponse.set(response);
          if (response.status === 'SUCCESS') {
            this.toastService.success('Payment submitted', response.message ?? 'Transaction accepted successfully.');
          } else {
            this.toastService.error('Payment failed', response.message ?? response.errorCode ?? 'The payment was rejected.');
          }
        },
        error: (error: HttpErrorResponse) => {
          const response = this.normalizeHttpError(error);
          this.ledger.recordPayment(payload, response);
          this.apiResponse.set(response);
          this.toastService.error('Payment failed', response.message);
        }
      });
  }

  protected resetForm(): void {
    this.form.reset({
      senderAccountNumber: '',
      receiverAccountNumber: '',
      amount: '',
      currency: 'NAD',
      reference: '',
      clientReference: this.generateClientReference()
    });
    this.apiResponse.set(null);
  }

  protected fieldHasError(controlName: FormControlName, errorCode: string): boolean {
    const control = this.form.controls[controlName];
    return (control.dirty || control.touched) && control.hasError(errorCode);
  }

  protected fieldError(controlName: FormControlName): string {
    const control = this.form.controls[controlName];
    if (!(control.dirty || control.touched)) return '';
    if (control.hasError('required') || control.hasError('blank')) {
      return 'This field is required.';
    }
    if (control.hasError('pattern')) {
      if (controlName === 'senderAccountNumber' || controlName === 'receiverAccountNumber') {
        return 'Must be a numeric account number of at least 10 digits.';
      }
      if (controlName === 'amount') return 'Enter a valid amount (e.g. 250.00).';
    }
    if (control.hasError('positiveAmount')) return 'Amount must be greater than zero.';
    if (control.hasError('maxlength')) {
      const err = control.getError('maxlength') as { requiredLength: number };
      return `Must be at most ${err.requiredLength} characters.`;
    }
    return '';
  }

  protected toggleBalance(): void {
    this.balanceVisible.update((v) => !v);
  }

  protected amountPreview(): string {
    const parsedAmount = Number(this.form.controls.amount.value);
    return Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount.toFixed(2) : '0.00';
  }

  protected formatAmount(payment: StoredPayment): string {
    return formatCurrencyAmount(payment.amount, payment.currency);
  }

  protected formatTimestamp(createdAt: string): string {
    return formatDateTime(createdAt);
  }

  protected trackPayment(_index: number, payment: StoredPayment): string {
    return payment.id;
  }

  private toPayload(): PaymentSubmission {
    const raw = this.form.getRawValue();
    return {
      senderAccountNumber: raw.senderAccountNumber,
      receiverAccountNumber: raw.receiverAccountNumber,
      amount: Number(raw.amount),
      currency: raw.currency,
      reference: raw.reference,
      clientReference: raw.clientReference
    };
  }

  private normalizeHttpError(error: HttpErrorResponse): PaymentApiResponse {
    const apiError = error.error as PaymentApiResponse | undefined;

    if (apiError && typeof apiError.message === 'string') {
      return apiError;
    }

    return {
      status: 'FAILED',
      message: 'API unreachable. Confirm the Node API is running on http://localhost:3000.'
    };
  }

  private generateClientReference(): string {
    const timestamp = Date.now();
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `CLI-${timestamp}-${randomPart}`;
  }
}
