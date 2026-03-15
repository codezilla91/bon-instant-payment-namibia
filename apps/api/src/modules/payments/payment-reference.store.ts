export class PaymentReferenceStore {
  private readonly usedClientReferences = new Set<string>();

  has(clientReference: string): boolean {
    return this.usedClientReferences.has(clientReference);
  }

  add(clientReference: string): void {
    this.usedClientReferences.add(clientReference);
  }

  clear(): void {
    this.usedClientReferences.clear();
  }
}
