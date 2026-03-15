import { Injectable, computed, signal } from '@angular/core';

export interface SupportTicket {
  id: string;
  createdAt: string;
  category: 'API' | 'Payments' | 'Validation' | 'Access';
  severity: 'Low' | 'Medium' | 'High';
  subject: string;
  detail: string;
  status: 'OPEN';
}

const STORAGE_KEY = 'bon-ipn-support-tickets';

@Injectable({ providedIn: 'root' })
export class SupportTicketService {
  private readonly storage = this.resolveStorage();
  private readonly ticketsState = signal<SupportTicket[]>(this.loadTickets());

  readonly tickets = computed(() => this.ticketsState());
  readonly recentTickets = computed(() => this.ticketsState().slice(0, 5));

  createTicket(ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'status'>): void {
    const nextTicket: SupportTicket = {
      ...ticket,
      id: this.buildId('SUP'),
      createdAt: new Date().toISOString(),
      status: 'OPEN'
    };

    this.commit([nextTicket, ...this.ticketsState()]);
  }

  clear(): void {
    this.commit([]);
  }

  private loadTickets(): SupportTicket[] {
    if (!this.storage) {
      return [];
    }

    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as SupportTicket[]) : [];
    } catch {
      return [];
    }
  }

  private commit(tickets: SupportTicket[]): void {
    this.ticketsState.set(tickets);

    if (this.storage) {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(tickets));
    }
  }

  private resolveStorage(): Storage | null {
    return typeof globalThis !== 'undefined' && 'localStorage' in globalThis ? globalThis.localStorage : null;
  }

  private buildId(prefix: string): string {
    if (typeof globalThis !== 'undefined' && 'crypto' in globalThis && typeof globalThis.crypto.randomUUID === 'function') {
      return `${prefix}-${globalThis.crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
}
