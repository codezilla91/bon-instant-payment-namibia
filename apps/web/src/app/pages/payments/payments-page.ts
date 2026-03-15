import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AmountVisibilityService } from '../../amount-visibility.service';
import { PaymentLedgerService } from '../../payment-ledger.service';
import { type PaymentSubmission } from '../../payment.models';
import { PaymentWorkflowService } from '../../payment-workflow.service';
import { formatNad, MASKED_AMOUNT } from '../../shared/formatting';
import { nonBlankValidator, positiveAmountValidator } from '../../shared/validators';

type FormControlName =
  | 'senderAccountNumber'
  | 'receiverAccountNumber'
  | 'amount'
  | 'currency'
  | 'reference'
  | 'clientReference';

@Component({
  selector: 'app-payments-page',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './payments-page.html',
  styleUrl: './payments-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentsPageComponent {
  protected readonly currencies = ['NAD', 'ZAR', 'USD'] as const;

  private readonly amountVisibility = inject(AmountVisibilityService);
  private readonly fb = inject(FormBuilder);
  private readonly ledger = inject(PaymentLedgerService);
  private readonly router = inject(Router);
  private readonly workflow = inject(PaymentWorkflowService);

  protected readonly amountsVisible = this.amountVisibility.amountsVisible;
  protected readonly balanceLabel = computed(() =>
    this.amountsVisible() ? formatNad(this.ledger.balance()) : MASKED_AMOUNT
  );

  protected readonly form = this.fb.nonNullable.group({
    senderAccountNumber: ['', [Validators.required, Validators.pattern(/^\d{10,}$/)]],
    receiverAccountNumber: ['', [Validators.required, Validators.pattern(/^\d{10,}$/)]],
    amount: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/), positiveAmountValidator]],
    currency: ['NAD', [Validators.required]],
    reference: ['', [Validators.required, Validators.maxLength(50), nonBlankValidator]],
    clientReference: ['', [Validators.required, Validators.maxLength(50), nonBlankValidator]]
  });

  private readonly formStatus = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  protected readonly hasEnoughBalance = computed(() => {
    const value = this.formValue();
    const amount = Number(value.amount);

    if (!Number.isFinite(amount) || amount <= 0 || value.currency !== 'NAD') {
      return true;
    }

    return amount <= this.ledger.balance();
  });
  protected readonly canContinue = computed(() => this.formStatus() === 'VALID' && this.hasEnoughBalance());

  constructor() {
    this.form.reset(this.buildFormValue(this.workflow.draft()));
  }

  protected continueToConfirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.workflow.stageDraft(this.toPayload());
    void this.router.navigate(['/payments/confirm']);
  }

  protected resetForm(): void {
    this.form.reset(this.buildFormValue());
    this.workflow.clearDraft();
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
    if (controlName === 'amount' && !this.hasEnoughBalance()) {
      return 'This amount is higher than your available balance.';
    }
    if (control.hasError('positiveAmount')) return 'Amount must be greater than zero.';
    if (control.hasError('maxlength')) {
      const err = control.getError('maxlength') as { requiredLength: number };
      return `Must be at most ${err.requiredLength} characters.`;
    }
    return '';
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

  private buildFormValue(draft: PaymentSubmission | null = null) {
    return {
      senderAccountNumber: draft?.senderAccountNumber ?? '',
      receiverAccountNumber: draft?.receiverAccountNumber ?? '',
      amount: draft ? `${draft.amount}` : '',
      currency: draft?.currency ?? 'NAD',
      reference: draft?.reference ?? '',
      clientReference: draft?.clientReference ?? this.workflow.createClientReference()
    };
  }
}
