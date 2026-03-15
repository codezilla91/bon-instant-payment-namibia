import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AmountVisibilityService } from '../../amount-visibility.service';

interface HeaderNavItem {
  label: string;
  route: string;
}

@Component({
  selector: 'app-shell-header',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './app-header.html',
  styleUrl: './app-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppHeaderComponent {
  private readonly amountVisibility = inject(AmountVisibilityService);

  protected readonly apiDocsUrl = 'http://localhost:3000/api/docs';
  protected readonly navOpen = signal(false);
  protected readonly userMenuOpen = signal(false);
  protected readonly amountsVisible = this.amountVisibility.amountsVisible;

  protected readonly user = {
    name: 'John Doe',
    initials: 'JD',
    role: 'Payments User'
  };

  protected readonly navItems: ReadonlyArray<HeaderNavItem> = [
    { label: 'Home', route: '/' },
    { label: 'Dashboard', route: '/dashboard' },
    { label: 'Payments', route: '/payments' },
    { label: 'Transactions', route: '/activity' },
    { label: 'Support', route: '/support' }
  ];

  protected toggleNav(): void {
    this.navOpen.update((v) => !v);
  }

  protected closeNav(): void {
    this.navOpen.set(false);
    this.userMenuOpen.set(false);
  }

  protected toggleUserMenu(): void {
    this.userMenuOpen.update((v) => !v);
  }

  protected toggleAmountVisibility(): void {
    this.amountVisibility.toggle();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-wrap')) {
      this.userMenuOpen.set(false);
    }
  }
}
