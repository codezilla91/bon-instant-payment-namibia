import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface BenefitCard {
  title: string;
  description: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-landing-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingPageComponent {
  protected expandedFaq: number | null = null;

  protected readonly benefits: ReadonlyArray<BenefitCard> = [
    {
      title: 'Instant Transfers',
      description: 'Send and receive payments in real time, 24 hours a day, 7 days a week. No more waiting for batch processing or banking hours.'
    },
    {
      title: 'Secure & Reliable',
      description: 'Built on robust infrastructure overseen by the Bank of Namibia, ensuring your transactions are processed safely and securely.'
    },
    {
      title: 'Low Cost',
      description: 'Designed to reduce transaction costs for everyday payments, making digital transfers accessible to all Namibians.'
    },
    {
      title: 'Interoperable',
      description: 'Works across participating banks and financial institutions in Namibia, enabling seamless person-to-person payments regardless of provider.'
    }
  ];

  protected readonly faqs: ReadonlyArray<FaqItem> = [
    {
      question: 'What is Instant Payment Namibia (IPN)?',
      answer: 'IPN is a national payment infrastructure initiative by the Bank of Namibia that enables real-time electronic fund transfers between individuals and businesses across participating financial institutions in Namibia.'
    },
    {
      question: 'How does a P2P payment work?',
      answer: 'A Person-to-Person (P2P) payment allows you to send money directly from your account to another person\'s account using their account number. The payment is processed instantly through the IPN system.'
    },
    {
      question: 'What currency is supported?',
      answer: 'IPN currently supports payments in Namibian Dollars (NAD) only, as it is designed for domestic transactions within Namibia.'
    },
    {
      question: 'Is there a maximum transaction amount?',
      answer: 'Transaction limits may apply depending on your financial institution\'s policies. Contact your bank for specific limits applicable to your account.'
    },
    {
      question: 'What happens if a payment fails?',
      answer: 'If a payment fails, you will receive an immediate response with an error code and message explaining the reason. Common reasons include insufficient funds, invalid account numbers, or connectivity issues. No funds are debited for failed transactions.'
    }
  ];

  protected toggleFaq(index: number): void {
    this.expandedFaq = this.expandedFaq === index ? null : index;
  }
}
