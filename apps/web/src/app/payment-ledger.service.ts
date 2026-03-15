import { Injectable, computed, signal } from '@angular/core';
import { PaymentApiResponse, PaymentLedgerState, PaymentSubmission, StoredPayment } from './payment.models';

const STORAGE_KEY = 'bon-ipn-payment-ledger';
const DEFAULT_AVAILABLE_BALANCE = 30000;
const MAX_PAYMENTS = 40;

@Injectable({ providedIn: 'root' })
export class PaymentLedgerService {
  private readonly storage = this.resolveStorage();
  // Browser storage stands in for persistence so the payment trail survives refreshes.
  private readonly state = signal<PaymentLedgerState>(this.loadState());

  readonly balance = computed(() => this.state().availableBalance);
  readonly payments = computed(() => this.state().payments);
  readonly recentPayments = computed(() => this.state().payments.slice(0, 6));
  readonly paymentsToday = computed(() => {
    const today = this.dayKey(new Date());
    return this.state().payments.filter((payment) => this.dayKey(new Date(payment.createdAt)) === today).length;
  });
  readonly monthlyVolume = computed(() => {
    const today = new Date();
    const monthKey = `${today.getFullYear()}-${today.getMonth()}`;

    return this.state().payments.reduce((total, payment) => {
      const createdAt = new Date(payment.createdAt);
      const paymentMonthKey = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;

      return payment.status === 'SUCCESS' && paymentMonthKey === monthKey ? total + payment.amount : total;
    }, 0);
  });

  recordPayment(submission: PaymentSubmission, response: PaymentApiResponse): StoredPayment {
    const nextPayment: StoredPayment = {
      ...submission,
      id: this.buildId('PAY'),
      createdAt: new Date().toISOString(),
      status: response.status,
      transactionId: response.transactionId,
      errorCode: response.errorCode,
      message: response.message
    };

    const availableBalance =
      response.status === 'SUCCESS'
        ? this.roundToCurrency(Math.max(0, this.state().availableBalance - submission.amount))
        : this.state().availableBalance;

    this.commit({
      availableBalance,
      payments: [nextPayment, ...this.state().payments].slice(0, MAX_PAYMENTS)
    });

    return nextPayment;
  }

  clear(): void {
    this.commit(this.createDefaultState());
  }

  private loadState(): PaymentLedgerState {
    if (!this.storage) {
      return this.createDefaultState();
    }

    try {
      const rawState = this.storage.getItem(STORAGE_KEY);

      if (!rawState) {
        return this.createDefaultState();
      }

      const parsed = JSON.parse(rawState) as Partial<PaymentLedgerState>;

      if (
        typeof parsed.availableBalance !== 'number' ||
        !Array.isArray(parsed.payments) ||
        parsed.payments.some((payment) => !this.isStoredPayment(payment))
      ) {
        return this.createDefaultState();
      }

      return {
        availableBalance: this.roundToCurrency(parsed.availableBalance),
        payments: parsed.payments
      };
    } catch {
      return this.createDefaultState();
    }
  }

  private commit(state: PaymentLedgerState): void {
    this.state.set(state);

    if (this.storage) {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }

  private createDefaultState(): PaymentLedgerState {
    return {
      availableBalance: DEFAULT_AVAILABLE_BALANCE,
      payments: []
    };
  }

  private resolveStorage(): Storage | null {
    return typeof globalThis !== 'undefined' && 'localStorage' in globalThis ? globalThis.localStorage : null;
  }

  private buildId(prefix: string): string {
    if (typeof globalThis !== 'undefined' && 'crypto' in globalThis && typeof globalThis.crypto.randomUUID === 'function') {
      return `${prefix}-${globalThis.crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  private dayKey(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  private roundToCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private isStoredPayment(value: unknown): value is StoredPayment {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const payment = value as Partial<StoredPayment>;

    return (
      typeof payment.id === 'string' &&
      typeof payment.createdAt === 'string' &&
      typeof payment.senderAccountNumber === 'string' &&
      typeof payment.receiverAccountNumber === 'string' &&
      typeof payment.amount === 'number' &&
      typeof payment.currency === 'string' &&
      typeof payment.reference === 'string' &&
      typeof payment.clientReference === 'string' &&
      typeof payment.status === 'string' &&
      typeof payment.message === 'string'
    );
  }
}
