import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AmountVisibilityService } from '../../amount-visibility.service';
import { PaymentLedgerService } from '../../payment-ledger.service';
import { type PaymentSubmission } from '../../payment.models';
import { PaymentWorkflowService } from '../../payment-workflow.service';
import { formatCurrencyAmount, formatNad, MASKED_AMOUNT } from '../../shared/formatting';

interface DetailItem {
  label: string;
  value: string;
}

@Component({
  selector: 'app-payment-confirm-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './payment-confirm-page.html',
  styleUrl: './payment-confirm-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentConfirmPageComponent {
  private readonly amountVisibility = inject(AmountVisibilityService);
  private readonly ledger = inject(PaymentLedgerService);
  private readonly router = inject(Router);
  private readonly workflow = inject(PaymentWorkflowService);

  protected readonly amountsVisible = this.amountVisibility.amountsVisible;
  protected readonly submitting = signal(false);
  protected readonly draft = this.workflow.draft;
  protected readonly balanceLabel = computed(() =>
    this.amountsVisible() ? formatNad(this.ledger.balance()) : MASKED_AMOUNT
  );
  protected readonly hasEnoughBalance = computed(() => {
    const draft = this.draft();

    if (!draft || draft.currency !== 'NAD') {
      return true;
    }

    return draft.amount <= this.ledger.balance();
  });
  protected readonly detailItems = computed<ReadonlyArray<DetailItem>>(() => {
    const draft = this.draft();

    if (!draft) {
      return [];
    }

    return [
      { label: 'Sender account', value: draft.senderAccountNumber },
      { label: 'Receiver account', value: draft.receiverAccountNumber },
      { label: 'Amount', value: this.formatSubmissionAmount(draft) },
      { label: 'Currency', value: draft.currency },
      { label: 'Reference', value: draft.reference },
      { label: 'Payment reference ID', value: draft.clientReference }
    ];
  });

  protected confirmPayment(): void {
    if (!this.draft() || this.submitting() || !this.hasEnoughBalance()) {
      return;
    }

    this.submitting.set(true);

    this.workflow.submitCurrentDraft().subscribe({
      next: () => {
        this.submitting.set(false);
        void this.router.navigate(['/payments/result']);
      },
      error: () => {
        this.submitting.set(false);
        void this.router.navigate(['/payments/result']);
      }
    });
  }

  protected formatSubmissionAmount(submission: PaymentSubmission): string {
    return this.amountsVisible() ? formatCurrencyAmount(submission.amount, submission.currency) : MASKED_AMOUNT;
  }
}
