import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-shell-footer',
  imports: [CommonModule, RouterLink],
  templateUrl: './app-footer.html',
  styleUrl: './app-footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppFooterComponent {
  protected readonly apiDocsUrl = 'http://localhost:3000/api/docs';
  protected readonly links: ReadonlyArray<{ label: string; route: string }> = [
    { label: 'Payments', route: '/payments' },
    { label: 'Transactions', route: '/activity' },
    { label: 'Support', route: '/support' }
  ];
}
