import type { P2PPaymentRequest, PaymentErrorResponse } from './types.js';

export function applyMockBusinessRules(request: P2PPaymentRequest): PaymentErrorResponse | null {
  if (request.senderAccountNumber.endsWith('0001') || request.amount > 25000) {
    return {
      status: 'FAILED',
      errorCode: 'ERR005',
      clientReference: request.clientReference,
      message: 'Insufficient funds for this transaction.'
    };
  }

  if (request.senderAccountNumber.endsWith('9999') || request.receiverAccountNumber.endsWith('9999')) {
    return {
      status: 'FAILED',
      errorCode: 'ERR006',
      clientReference: request.clientReference,
      message: 'Internal processing error. Please retry later.'
    };
  }

  return null;
}
