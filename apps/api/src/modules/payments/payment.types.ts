export interface P2PPaymentRequest {
  senderAccountNumber: string;
  receiverAccountNumber: string;
  amount: number;
  currency: 'NAD';
  reference: string;
  clientReference: string;
}

export interface PaymentSuccessResponse {
  status: 'SUCCESS';
  transactionId: string;
  clientReference: string;
  message: string;
}

export interface PaymentErrorResponse {
  status: 'FAILED';
  errorCode: string;
  clientReference?: string;
  message: string;
}

export type PaymentResponse = PaymentSuccessResponse | PaymentErrorResponse;

export interface ValidationResult {
  valid: boolean;
  value?: P2PPaymentRequest;
  error?: PaymentErrorResponse;
}

export interface PaymentProcessingOptions {
  simulateErrorCode?: string;
  availableBalance?: number;
}

export type PaymentProcessingResult =
  | {
      kind: 'validation_failed';
      statusCode: 400;
      response: PaymentErrorResponse;
    }
  | {
      kind: 'simulated_internal_error';
      statusCode: 500;
      paymentRequest: P2PPaymentRequest;
      response: PaymentErrorResponse;
    }
  | {
      kind: 'duplicate_client_reference';
      statusCode: 409;
      paymentRequest: P2PPaymentRequest;
      response: PaymentErrorResponse;
    }
  | {
      kind: 'business_failure';
      statusCode: 402 | 500;
      paymentRequest: P2PPaymentRequest;
      response: PaymentErrorResponse;
    }
  | {
      kind: 'success';
      statusCode: 200;
      paymentRequest: P2PPaymentRequest;
      response: PaymentSuccessResponse;
    };
