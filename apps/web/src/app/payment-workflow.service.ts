import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { PaymentLedgerService } from './payment-ledger.service';
import { type PaymentApiResponse, type PaymentJourneyResult, type PaymentSubmission } from './payment.models';

const DRAFT_STORAGE_KEY = 'bon-ipn-payment-draft';
const RESULT_STORAGE_KEY = 'bon-ipn-payment-result';

@Injectable({ providedIn: 'root' })
export class PaymentWorkflowService {
  private readonly storage = this.resolveStorage();
  private readonly http = inject(HttpClient);
  private readonly ledger = inject(PaymentLedgerService);

  private readonly draftState = signal<PaymentSubmission | null>(this.loadDraft());
  private readonly resultState = signal<PaymentJourneyResult | null>(this.loadResult());

  readonly draft = computed(() => this.draftState());
  readonly result = computed(() => this.resultState());

  stageDraft(submission: PaymentSubmission): void {
    this.draftState.set(submission);
    this.persist(DRAFT_STORAGE_KEY, submission);
  }

  clearDraft(): void {
    this.draftState.set(null);
    this.remove(DRAFT_STORAGE_KEY);
  }

  clearResult(): void {
    this.resultState.set(null);
    this.remove(RESULT_STORAGE_KEY);
  }

  createClientReference(): string {
    const timestamp = Date.now();
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `CLI-${timestamp}-${randomPart}`;
  }

  useLatestResultAsDraft(): PaymentSubmission | null {
    const latestResult = this.resultState();

    if (!latestResult) {
      return null;
    }

    const nextDraft: PaymentSubmission = {
      ...latestResult.submission,
      clientReference: this.createClientReference()
    };

    this.stageDraft(nextDraft);
    return nextDraft;
  }

  submitCurrentDraft(): Observable<PaymentJourneyResult | null> {
    const currentDraft = this.draftState();

    if (!currentDraft) {
      return of(null);
    }

    if (currentDraft.currency === 'NAD' && currentDraft.amount > this.ledger.balance()) {
      return of(
        this.finalizeSubmission(currentDraft, {
          status: 'FAILED',
          errorCode: 'ERR005',
          clientReference: currentDraft.clientReference,
          message: 'Insufficient funds'
        })
      );
    }

    const headers = new HttpHeaders({
      'x-available-balance': this.ledger.balance().toFixed(2)
    });

    return this.http.post<PaymentApiResponse>('/api/p2p-payment', currentDraft, { headers }).pipe(
      map((response) => this.finalizeSubmission(currentDraft, response)),
      catchError((error: HttpErrorResponse) => of(this.finalizeSubmission(currentDraft, this.normalizeHttpError(error))))
    );
  }

  private finalizeSubmission(submission: PaymentSubmission, response: PaymentApiResponse): PaymentJourneyResult {
    const payment = this.ledger.recordPayment(submission, response);
    const result: PaymentJourneyResult = {
      submission,
      response,
      payment
    };

    this.resultState.set(result);
    this.persist(RESULT_STORAGE_KEY, result);
    this.clearDraft();

    return result;
  }

  private normalizeHttpError(error: HttpErrorResponse): PaymentApiResponse {
    const apiError = error.error as PaymentApiResponse | undefined;

    if (apiError && typeof apiError.message === 'string') {
      return apiError;
    }

    return {
      status: 'FAILED',
      errorCode: 'ERR006',
      message: 'Internal processing error'
    };
  }

  private loadDraft(): PaymentSubmission | null {
    const parsed = this.read<PaymentSubmission>(DRAFT_STORAGE_KEY);

    if (!parsed || !this.isPaymentSubmission(parsed)) {
      return null;
    }

    return parsed;
  }

  private loadResult(): PaymentJourneyResult | null {
    const parsed = this.read<PaymentJourneyResult>(RESULT_STORAGE_KEY);

    if (!parsed || !this.isPaymentJourneyResult(parsed)) {
      return null;
    }

    return parsed;
  }

  private read<T>(key: string): T | null {
    if (!this.storage) {
      return null;
    }

    try {
      const raw = this.storage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  private persist(key: string, value: unknown): void {
    if (!this.storage) {
      return;
    }

    this.storage.setItem(key, JSON.stringify(value));
  }

  private remove(key: string): void {
    if (!this.storage) {
      return;
    }

    this.storage.removeItem(key);
  }

  private resolveStorage(): Storage | null {
    if (typeof globalThis === 'undefined') {
      return null;
    }

    if ('sessionStorage' in globalThis) {
      return globalThis.sessionStorage;
    }

    return 'localStorage' in globalThis ? globalThis.localStorage : null;
  }

  private isPaymentSubmission(value: unknown): value is PaymentSubmission {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const submission = value as Partial<PaymentSubmission>;

    return (
      typeof submission.senderAccountNumber === 'string' &&
      typeof submission.receiverAccountNumber === 'string' &&
      typeof submission.amount === 'number' &&
      typeof submission.currency === 'string' &&
      typeof submission.reference === 'string' &&
      typeof submission.clientReference === 'string'
    );
  }

  private isPaymentJourneyResult(value: unknown): value is PaymentJourneyResult {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const result = value as Partial<PaymentJourneyResult>;

    return (
      this.isPaymentSubmission(result.submission) &&
      !!result.response &&
      typeof result.response === 'object' &&
      typeof result.response.status === 'string' &&
      typeof result.response.message === 'string' &&
      !!result.payment &&
      typeof result.payment === 'object' &&
      typeof result.payment.id === 'string' &&
      typeof result.payment.createdAt === 'string'
    );
  }
}
