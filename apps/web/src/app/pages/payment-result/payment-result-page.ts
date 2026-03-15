import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AmountVisibilityService } from '../../amount-visibility.service';
import { type PaymentJourneyResult } from '../../payment.models';
import { PaymentProofService } from '../../payment-proof.service';
import { PaymentWorkflowService } from '../../payment-workflow.service';
import { ToastService } from '../../toast.service';
import { formatCurrencyAmount, formatDateTime, MASKED_AMOUNT } from '../../shared/formatting';

interface DetailItem {
  label: string;
  value: string;
}

interface DetailSection {
  title: string;
  items: ReadonlyArray<DetailItem>;
}

@Component({
  selector: 'app-payment-result-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './payment-result-page.html',
  styleUrl: './payment-result-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentResultPageComponent {
  private readonly amountVisibility = inject(AmountVisibilityService);
  private readonly fb = inject(FormBuilder);
  private readonly proofService = inject(PaymentProofService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly workflow = inject(PaymentWorkflowService);
  private readonly phonePattern = /^[+\d][\d\s()-]{6,}$/;

  protected readonly amountsVisible = this.amountVisibility.amountsVisible;
  protected readonly result = this.workflow.result;
  protected readonly isSuccess = computed(() => this.result()?.response.status === 'SUCCESS');
  protected readonly statusTitle = computed(() => (this.isSuccess() ? 'Payment successful' : 'Payment failed'));
  protected readonly statusEyebrow = computed(() => (this.isSuccess() ? 'Transaction complete' : 'Transaction not completed'));
  protected readonly visibleAmount = computed(() => {
    const result = this.result();

    if (!result) {
      return MASKED_AMOUNT;
    }

    return this.amountsVisible() ? formatCurrencyAmount(result.submission.amount, result.submission.currency) : MASKED_AMOUNT;
  });
  protected readonly detailSections = computed<ReadonlyArray<DetailSection>>(() => {
    const result = this.result();
    return result ? this.buildDetailSections(result) : [];
  });
  protected readonly notificationForm = this.fb.nonNullable.group({
    notifyByEmail: false,
    emailAddress: ['', [Validators.email]],
    notifyBySms: false,
    smsNumber: ['']
  });

  protected startNewPayment(): void {
    this.workflow.clearDraft();
    this.workflow.clearResult();
    void this.router.navigate(['/payments']);
  }

  protected retryPayment(): void {
    this.workflow.useLatestResultAsDraft();
    this.workflow.clearResult();
    void this.router.navigate(['/payments']);
  }

  protected async downloadProof(): Promise<void> {
    const result = this.result();

    if (!result || result.response.status !== 'SUCCESS') {
      return;
    }

    try {
      await this.proofService.downloadProof(result);
      this.toastService.success('Proof downloaded', 'The proof of payment PDF is ready.');
    } catch {
      this.toastService.error('Download failed', 'The proof of payment PDF could not be generated.');
    }
  }

  protected async printProof(): Promise<void> {
    const result = this.result();

    if (!result || result.response.status !== 'SUCCESS') {
      return;
    }

    try {
      const opened = await this.proofService.openPrintView(result);

      if (opened) {
        this.toastService.success('Print view ready', 'Use the browser PDF viewer to print or save the proof.');
        return;
      }

      this.toastService.error('Popup blocked', 'Allow popups to open the printable proof of payment.');
    } catch {
      this.toastService.error('Print failed', 'The printable proof could not be prepared.');
    }
  }

  protected prepareEmailNotification(): void {
    const result = this.result();
    const { notifyByEmail, emailAddress } = this.notificationForm.getRawValue();

    if (!result || result.response.status !== 'SUCCESS') {
      return;
    }

    if (!notifyByEmail) {
      this.toastService.show('info', 'Email notification disabled', 'Enable email notification first to prepare the message.');
      return;
    }

    if (!emailAddress || this.notificationForm.controls.emailAddress.invalid) {
      this.toastService.error('Invalid email', 'Enter a valid email address for the notification.');
      return;
    }

    const subject = encodeURIComponent(this.proofService.buildEmailSubject(result));
    const body = encodeURIComponent(this.proofService.buildEmailBody(result));
    const opened = this.openExternal(`mailto:${emailAddress}?subject=${subject}&body=${body}`);

    if (opened) {
      this.toastService.success('Email handoff ready', 'Your mail client was opened with the payment proof details.');
      return;
    }

    this.toastService.error('Email handoff failed', 'The email client could not be opened on this device.');
  }

  protected prepareSmsNotification(): void {
    const result = this.result();
    const { notifyBySms, smsNumber } = this.notificationForm.getRawValue();

    if (!result || result.response.status !== 'SUCCESS') {
      return;
    }

    if (!notifyBySms) {
      this.toastService.show('info', 'SMS notification disabled', 'Enable SMS notification first to prepare the message.');
      return;
    }

    if (!smsNumber || !this.phonePattern.test(smsNumber.trim())) {
      this.toastService.error('Invalid number', 'Enter a valid mobile number for the SMS notification.');
      return;
    }

    const body = encodeURIComponent(this.proofService.buildSmsBody(result));
    const opened = this.openExternal(`sms:${smsNumber.trim()}?body=${body}`);

    if (opened) {
      this.toastService.success('SMS handoff ready', 'Your device was asked to open an SMS draft with the payment proof details.');
      return;
    }

    this.toastService.error('SMS handoff failed', 'An SMS application could not be opened on this device.');
  }

  private buildDetailSections(result: PaymentJourneyResult): ReadonlyArray<DetailSection> {
    return [
      {
        title: 'Transaction outcome',
        items: [
          { label: 'Status', value: result.response.status },
          { label: 'Message', value: result.response.message },
          { label: 'Transaction ID', value: result.response.transactionId ?? 'Not issued' },
          { label: 'Recorded', value: formatDateTime(result.payment.createdAt) },
          { label: 'Error code', value: result.response.errorCode ?? 'Not applicable' }
        ]
      },
      {
        title: 'Payment instruction',
        items: [
          { label: 'Sender account', value: result.submission.senderAccountNumber },
          { label: 'Receiver account', value: result.submission.receiverAccountNumber },
          { label: 'Amount', value: this.visibleAmount() },
          { label: 'Currency', value: result.submission.currency },
          { label: 'Reference', value: result.submission.reference },
          { label: 'Payment reference ID', value: result.submission.clientReference }
        ]
      }
    ];
  }

  private openExternal(url: string): boolean {
    try {
      globalThis.location.href = url;
      return true;
    } catch {
      return false;
    }
  }
}
