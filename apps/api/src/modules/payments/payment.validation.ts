import type { P2PPaymentRequest, ValidationResult } from './payment.types.js';
import { PAYMENT_MESSAGES } from './payment.messages.js';

const ACCOUNT_PATTERN = /^\d{10,}$/;

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function invalid(errorCode: string, message: string, clientReference?: string): ValidationResult {
  return {
    valid: false,
    error: {
      status: 'FAILED',
      errorCode,
      clientReference,
      message
    }
  };
}

export function validatePaymentRequest(payload: unknown): ValidationResult {
  if (!payload || typeof payload !== 'object') {
    return invalid('ERR000', PAYMENT_MESSAGES.invalidRequest);
  }

  const raw = payload as Record<string, unknown>;
  const senderAccountNumber = asTrimmedString(raw.senderAccountNumber);
  const receiverAccountNumber = asTrimmedString(raw.receiverAccountNumber);
  const currency = asTrimmedString(raw.currency).toUpperCase();
  const reference = asTrimmedString(raw.reference);
  const clientReference = asTrimmedString(raw.clientReference);
  const parsedAmount = typeof raw.amount === 'number' ? raw.amount : Number(asTrimmedString(raw.amount));

  const requiredFields = [
    'senderAccountNumber',
    'receiverAccountNumber',
    'amount',
    'currency',
    'reference',
    'clientReference'
  ];
  const missingFields = requiredFields.filter((field) => {
    const value = raw[field];
    return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
  });

  if (missingFields.length > 0) {
    return invalid('ERR001', PAYMENT_MESSAGES.missingRequiredFields, clientReference || undefined);
  }

  if (!ACCOUNT_PATTERN.test(senderAccountNumber) || !ACCOUNT_PATTERN.test(receiverAccountNumber)) {
    return invalid('ERR002', PAYMENT_MESSAGES.invalidAccountFormat, clientReference || undefined);
  }

  if (currency !== 'NAD') {
    return invalid('ERR003', PAYMENT_MESSAGES.invalidCurrency, clientReference || undefined);
  }

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return invalid('ERR004', PAYMENT_MESSAGES.invalidAmount, clientReference || undefined);
  }

  if (reference.length > 50) {
    return invalid('ERR001', PAYMENT_MESSAGES.invalidReference, clientReference || undefined);
  }

  if (clientReference.length > 50) {
    return invalid('ERR001', PAYMENT_MESSAGES.invalidReference, clientReference || undefined);
  }

  const value: P2PPaymentRequest = {
    senderAccountNumber,
    receiverAccountNumber,
    amount: parsedAmount,
    currency: 'NAD',
    reference,
    clientReference
  };

  return {
    valid: true,
    value
  };
}
