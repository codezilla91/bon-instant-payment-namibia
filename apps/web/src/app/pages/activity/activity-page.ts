import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PaymentLedgerService } from '../../payment-ledger.service';
import { StoredPayment } from '../../payment.models';
import { formatCurrencyAmount, formatDateTime, formatNad } from '../../shared/formatting';

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
  private readonly ledger = inject(PaymentLedgerService);

  protected readonly filter = signal<ActivityFilter>('ALL');
  protected readonly payments = this.ledger.payments;
  protected readonly filteredPayments = computed(() => {
    const filter = this.filter();
    const payments = this.payments();

    if (filter === 'ALL') {
      return payments;
    }

    return payments.filter((payment) => payment.status === filter);
  });
  protected readonly metricCards = computed<ReadonlyArray<MetricCard>>(() => {
    const payments = this.payments();
    const successful = payments.filter((payment) => payment.status === 'SUCCESS').length;
    const failed = payments.length - successful;

    return [
      { label: 'Total transactions', value: `${payments.length}` },
      { label: 'Successful', value: `${successful}` },
      { label: 'Failed', value: `${failed}` },
      { label: 'Month volume', value: formatNad(this.ledger.monthlyVolume()) }
    ];
  });

  protected setFilter(filter: ActivityFilter): void {
    this.filter.set(filter);
  }

  protected clearLedger(): void {
    this.ledger.clear();
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
}
