import type { P2PPaymentRequest, PaymentErrorResponse } from './payment.types.js';

export function applyMockBusinessRules(
  request: P2PPaymentRequest,
  availableBalance: number
): PaymentErrorResponse | null {
  if (request.senderAccountNumber.endsWith('0001') || request.amount > availableBalance) {
    return {
      status: 'FAILED',
      errorCode: 'ERR005',
      clientReference: request.clientReference,
      message: 'Your available balance is not enough for this payment.'
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
