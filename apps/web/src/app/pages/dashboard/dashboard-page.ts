import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PaymentLedgerService } from '../../payment-ledger.service';
import { StoredPayment } from '../../payment.models';
import { formatCurrencyAmount, formatDateTime, formatNad } from '../../shared/formatting';

interface QuickAction {
  label: string;
  title: string;
  route: string;
  meta: string;
}

interface MetricCard {
  label: string;
  value: string;
}

@Component({
  selector: 'app-dashboard-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPageComponent {
  private readonly ledger = inject(PaymentLedgerService);

  protected readonly quickActions: ReadonlyArray<QuickAction> = [
    { label: 'Primary', title: 'Create payment', route: '/payments', meta: 'Submit a new instruction' },
    { label: 'Transactions', title: 'Recent transactions', route: '/activity', meta: 'View recent payment history' },
    { label: 'Integration', title: 'Developer tools', route: '/developer', meta: 'Inspect contract and docs' },
    { label: 'Support', title: 'Support centre', route: '/support', meta: 'Check status and log an issue' }
  ];

  protected readonly balanceVisible = signal(true);
  protected readonly payments = this.ledger.payments;
  protected readonly recentPayments = computed(() => this.payments().slice(0, 4));
  protected readonly latestPayment = computed(() => this.payments()[0] ?? null);
  protected readonly balanceLabel = computed(() =>
    this.balanceVisible() ? formatNad(this.ledger.balance()) : '•••••••'
  );

  protected toggleBalance(): void {
    this.balanceVisible.update((v) => !v);
  }
  protected readonly metricCards = computed<ReadonlyArray<MetricCard>>(() => {
    const payments = this.payments();
    const successful = payments.filter((payment) => payment.status === 'SUCCESS').length;
    const failed = payments.length - successful;

    return [
      { label: 'Transactions today', value: `${this.ledger.paymentsToday()}` },
      { label: 'Month volume', value: formatNad(this.ledger.monthlyVolume()) },
      { label: 'Successful', value: `${successful}` },
      { label: 'Failed', value: `${failed}` }
    ];
  });

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
