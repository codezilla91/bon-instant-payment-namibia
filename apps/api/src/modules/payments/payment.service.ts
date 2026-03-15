import { buildTransactionId } from '../../shared/utils/transaction-id.js';
import { PaymentReferenceStore } from './payment-reference.store.js';
import { applyMockBusinessRules } from './payment.rules.js';
import {
  type PaymentProcessingOptions,
  type PaymentProcessingResult,
  type PaymentSuccessResponse
} from './payment.types.js';
import { validatePaymentRequest } from './payment.validation.js';

const DEFAULT_AVAILABLE_BALANCE = 30000;

export class PaymentService {
  private availableBalance = DEFAULT_AVAILABLE_BALANCE;

  constructor(private readonly referenceStore = new PaymentReferenceStore()) {}

  process(payload: unknown, options: PaymentProcessingOptions = {}): PaymentProcessingResult {
    const validation = validatePaymentRequest(payload);

    if (!validation.valid || !validation.value) {
      return {
        kind: 'validation_failed',
        statusCode: 400,
        response: validation.error ?? {
          status: 'FAILED',
          errorCode: 'ERR000',
          message: 'We could not read this payment. Please try again.'
        }
      };
    }

    const paymentRequest = validation.value;
    const simulateErrorCode = options.simulateErrorCode?.trim().toUpperCase();

    if (simulateErrorCode === 'ERR006') {
      return {
        kind: 'simulated_internal_error',
        statusCode: 500,
        paymentRequest,
        response: {
          status: 'FAILED',
          errorCode: 'ERR006',
          clientReference: paymentRequest.clientReference,
          message: 'We could not complete this payment right now. Please try again.'
        }
      };
    }

    if (this.referenceStore.has(paymentRequest.clientReference)) {
      return {
        kind: 'duplicate_client_reference',
        statusCode: 409,
        paymentRequest,
        response: {
          status: 'FAILED',
          errorCode: 'ERR007',
          clientReference: paymentRequest.clientReference,
          message: 'This payment reference ID has already been used. Please enter a new one.'
        }
      };
    }

    // Prefer the caller-supplied balance for the browser-backed demo and fall
    // back to the API's in-memory balance when no balance hint is provided.
    const availableBalance =
      typeof options.availableBalance === 'number' && Number.isFinite(options.availableBalance)
        ? Math.max(0, Math.round(options.availableBalance * 100) / 100)
        : this.availableBalance;

    const businessFailure = applyMockBusinessRules(paymentRequest, availableBalance);

    if (businessFailure) {
      return {
        kind: 'business_failure',
        statusCode: businessFailure.errorCode === 'ERR005' ? 402 : 500,
        paymentRequest,
        response: businessFailure
      };
    }

    this.referenceStore.add(paymentRequest.clientReference);
    this.availableBalance = Math.max(0, Math.round((availableBalance - paymentRequest.amount) * 100) / 100);

    const response: PaymentSuccessResponse = {
      status: 'SUCCESS',
      transactionId: buildTransactionId(),
      clientReference: paymentRequest.clientReference,
      message: 'Payment processed successfully.'
    };

    return {
      kind: 'success',
      statusCode: 200,
      paymentRequest,
      response
    };
  }
}
