import { Routes } from '@angular/router';
import { ActivityPageComponent } from './pages/activity/activity-page';
import { DashboardPageComponent } from './pages/dashboard/dashboard-page';
import { LandingPageComponent } from './pages/landing/landing-page';
import { PaymentConfirmPageComponent } from './pages/payment-confirm/payment-confirm-page';
import { PaymentResultPageComponent } from './pages/payment-result/payment-result-page';
import { PaymentsPageComponent } from './pages/payments/payments-page';
import { SupportPageComponent } from './pages/support/support-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: LandingPageComponent, title: 'Instant Payment Namibia | Bank of Namibia' },
  { path: 'dashboard', component: DashboardPageComponent, title: 'Dashboard | Instant Payment Namibia' },
  { path: 'payments', component: PaymentsPageComponent, title: 'Payments | Instant Payment Namibia' },
  { path: 'payments/confirm', component: PaymentConfirmPageComponent, title: 'Confirm Payment | Instant Payment Namibia' },
  { path: 'payments/result', component: PaymentResultPageComponent, title: 'Payment Result | Instant Payment Namibia' },
  { path: 'activity', component: ActivityPageComponent, title: 'Activity | Instant Payment Namibia' },
  { path: 'support', component: SupportPageComponent, title: 'Support | Instant Payment Namibia' },
  { path: '**', redirectTo: '' }
];
