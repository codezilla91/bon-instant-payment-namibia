import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface FeatureCard {
  title: string;
  description: string;
  icon: 'send' | 'shield' | 'history';
}

interface JourneyStep {
  title: string;
  description: string;
}

interface LandingSummary {
  label: string;
  title: string;
  description: string;
  icon: 'wallet' | 'status' | 'receipt';
}

@Component({
  selector: 'app-landing-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingPageComponent {
  protected readonly summaries: ReadonlyArray<LandingSummary> = [
    {
      label: 'Currency',
      title: 'NAD only',
      description: 'Domestic transactions stay clear and explicit throughout the flow.',
      icon: 'wallet'
    },
    {
      label: 'Outcome',
      title: 'Immediate result',
      description: 'Every payment shows a clear status, message, and payment reference.',
      icon: 'status'
    },
    {
      label: 'Proof',
      title: 'Receipt ready',
      description: 'Successful transactions can be printed or downloaded as proof of payment.',
      icon: 'receipt'
    }
  ];

  protected readonly features: ReadonlyArray<FeatureCard> = [
    {
      title: 'Create a payment',
      description: 'Capture sender, receiver, amount, currency, and reference in one clear flow.',
      icon: 'send'
    },
    {
      title: 'Track the outcome',
      description: 'Review payment status, message, payment reference, and transaction ID where available.',
      icon: 'shield'
    },
    {
      title: 'Keep a payment trail',
      description: 'Use recent transactions, proof of payment, and privacy controls for follow-up.',
      icon: 'history'
    }
  ];

  protected readonly steps: ReadonlyArray<JourneyStep> = [
    {
      title: 'Capture instruction',
      description: 'Enter the payment details and check them before you continue.'
    },
    {
      title: 'Confirm details',
      description: 'Review the transfer one more time before it is processed.'
    },
    {
      title: 'Receive result',
      description: 'See the result immediately and keep it in recent history for follow-up.'
    }
  ];
}
