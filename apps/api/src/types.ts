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
