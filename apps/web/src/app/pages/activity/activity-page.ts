import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AmountVisibilityService } from '../../amount-visibility.service';
import { PaymentLedgerService } from '../../payment-ledger.service';
import { StoredPayment } from '../../payment.models';
import { formatCurrencyAmount, formatDateTime, formatNad, MASKED_AMOUNT } from '../../shared/formatting';

type ActivityFilter = 'ALL' | 'SUCCESS' | 'FAILED';

interface MetricCard {
  label: string;
  value: string;
}

@Component({
  selector: 'app-activity-page',
  imports: [CommonModule],
  templateUrl: './activity-page.html',
  styleUrl: './activity-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivityPageComponent {
  private readonly amountVisibility = inject(AmountVisibilityService);
  private readonly ledger = inject(PaymentLedgerService);

  protected readonly amountsVisible = this.amountVisibility.amountsVisible;
  protected readonly filter = signal<ActivityFilter>('ALL');
  protected readonly searchTerm = signal('');
  protected readonly payments = this.ledger.payments;
  protected readonly filteredPayments = computed(() => {
    const filter = this.filter();
    const searchTerm = this.searchTerm().trim().toLowerCase();
    const payments = this.payments();
    const filteredByStatus = filter === 'ALL' ? payments : payments.filter((payment) => payment.status === filter);

    if (!searchTerm) {
      return filteredByStatus;
    }

    return filteredByStatus.filter((payment) => this.matchesSearch(payment, searchTerm));
  });
  protected readonly metricCards = computed<ReadonlyArray<MetricCard>>(() => {
    const payments = this.payments();
    const successful = payments.filter((payment) => payment.status === 'SUCCESS').length;
    const failed = payments.length - successful;
    const monthlyVolume = this.amountsVisible() ? formatNad(this.ledger.monthlyVolume()) : MASKED_AMOUNT;

    return [
      { label: 'Total transactions', value: `${payments.length}` },
      { label: 'Successful', value: `${successful}` },
      { label: 'Failed', value: `${failed}` },
      { label: 'Month volume', value: monthlyVolume }
    ];
  });

  protected setFilter(filter: ActivityFilter): void {
    this.filter.set(filter);
  }

  protected setSearch(term: string): void {
    this.searchTerm.set(term);
  }

  protected clearLedger(): void {
    this.ledger.clear();
  }

  protected formatAmount(payment: StoredPayment): string {
    return this.amountsVisible() ? formatCurrencyAmount(payment.amount, payment.currency) : MASKED_AMOUNT;
  }

  protected formatTimestamp(createdAt: string): string {
    return formatDateTime(createdAt);
  }

  protected transactionDetail(payment: StoredPayment): string {
    if (payment.status === 'FAILED') {
      return payment.errorCode ? `${payment.errorCode} · ${payment.message}` : payment.message;
    }

    return payment.transactionId ? `Transaction ID: ${payment.transactionId}` : payment.message;
  }

  protected trackPayment(_index: number, payment: StoredPayment): string {
    return payment.id;
  }

  private matchesSearch(payment: StoredPayment, searchTerm: string): boolean {
    const haystack = [
      payment.reference,
      payment.clientReference,
      payment.senderAccountNumber,
      payment.receiverAccountNumber,
      payment.status,
      payment.errorCode ?? '',
      payment.message,
      payment.transactionId ?? ''
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(searchTerm);
  }
}
