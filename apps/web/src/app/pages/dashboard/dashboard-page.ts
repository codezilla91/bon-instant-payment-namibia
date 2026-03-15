import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AmountVisibilityService } from '../../amount-visibility.service';
import { PaymentLedgerService } from '../../payment-ledger.service';
import { StoredPayment } from '../../payment.models';
import { formatCurrencyAmount, formatDateTime, formatNad, MASKED_AMOUNT } from '../../shared/formatting';

interface MetricCard {
  label: string;
  value: string;
  icon: 'today' | 'volume' | 'success' | 'rate';
}

@Component({
  selector: 'app-dashboard-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPageComponent {
  private readonly amountVisibility = inject(AmountVisibilityService);
  private readonly ledger = inject(PaymentLedgerService);

  protected readonly displayName = 'John Doe';
  protected readonly amountsVisible = this.amountVisibility.amountsVisible;
  protected readonly payments = this.ledger.payments;
  protected readonly recentPayments = computed(() => this.payments().slice(0, 5));
  protected readonly successfulCount = computed(() => this.payments().filter((payment) => payment.status === 'SUCCESS').length);
  protected readonly failedCount = computed(() => this.payments().length - this.successfulCount());
  protected readonly balanceLabel = computed(() =>
    this.amountsVisible() ? formatNad(this.ledger.balance()) : MASKED_AMOUNT
  );
  protected readonly metricCards = computed<ReadonlyArray<MetricCard>>(() => {
    const total = this.payments().length;
    const successRate = total ? `${Math.round((this.successfulCount() / total) * 100)}%` : '0%';

    return [
      { label: 'Transactions today', value: `${this.ledger.paymentsToday()}`, icon: 'today' },
      { label: 'Month volume', value: this.amountsVisible() ? formatNad(this.ledger.monthlyVolume()) : MASKED_AMOUNT, icon: 'volume' },
      { label: 'Successful', value: `${this.successfulCount()}`, icon: 'success' },
      { label: 'Success rate', value: successRate, icon: 'rate' }
    ];
  });

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
}
