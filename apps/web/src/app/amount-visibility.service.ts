import { Injectable, computed, signal } from '@angular/core';

const STORAGE_KEY = 'bon-ipn-amount-visibility';

@Injectable({ providedIn: 'root' })
export class AmountVisibilityService {
  private readonly storage = this.resolveStorage();
  private readonly visibleState = signal(this.loadState());

  readonly amountsVisible = computed(() => this.visibleState());

  toggle(): void {
    this.commit(!this.visibleState());
  }

  private loadState(): boolean {
    if (!this.storage) {
      return true;
    }

    try {
      const rawState = this.storage.getItem(STORAGE_KEY);

      if (rawState === null) {
        return true;
      }

      return JSON.parse(rawState) !== false;
    } catch {
      return true;
    }
  }

  private commit(isVisible: boolean): void {
    this.visibleState.set(isVisible);

    if (this.storage) {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(isVisible));
    }
  }

  private resolveStorage(): Storage | null {
    return typeof globalThis !== 'undefined' && 'localStorage' in globalThis ? globalThis.localStorage : null;
  }
}
