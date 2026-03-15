import type { P2PPaymentRequest, ValidationResult } from './payment.types.js';

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
    return invalid('ERR000', 'We could not read this payment. Please try again.');
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
    return invalid('ERR001', `Complete the missing payment details: ${missingFields.join(', ')}.`, clientReference || undefined);
  }

  if (!ACCOUNT_PATTERN.test(senderAccountNumber) || !ACCOUNT_PATTERN.test(receiverAccountNumber)) {
    return invalid(
      'ERR002',
      'Enter account numbers with at least 10 digits.',
      clientReference || undefined
    );
  }

  if (currency !== 'NAD') {
    return invalid('ERR003', 'Only Namibian dollars (NAD) are supported right now.', clientReference || undefined);
  }

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return invalid('ERR004', 'Enter an amount greater than zero.', clientReference || undefined);
  }

  if (reference.length > 50) {
    return invalid('ERR001', 'Reference can be up to 50 characters.', clientReference || undefined);
  }

  if (clientReference.length > 50) {
    return invalid('ERR001', 'Payment reference ID can be up to 50 characters.', clientReference || undefined);
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
