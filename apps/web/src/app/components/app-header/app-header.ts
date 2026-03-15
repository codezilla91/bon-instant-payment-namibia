import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

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
  protected readonly navOpen = signal(false);
  protected readonly userMenuOpen = signal(false);

  protected readonly user = {
    name: 'Demo User',
    initials: 'DU',
    role: 'IPN Developer'
  };

  protected readonly navItems: ReadonlyArray<HeaderNavItem> = [
    { label: 'Home', route: '/' },
    { label: 'Dashboard', route: '/dashboard' },
    { label: 'Payments', route: '/payments' },
    { label: 'Transactions', route: '/activity' },
    { label: 'Developer', route: '/developer' },
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-wrap')) {
      this.userMenuOpen.set(false);
    }
  }
}
