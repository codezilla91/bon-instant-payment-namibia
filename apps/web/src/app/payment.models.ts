export interface PaymentSubmission {
  senderAccountNumber: string;
  receiverAccountNumber: string;
  amount: number;
  currency: string;
  reference: string;
  clientReference: string;
}

export interface PaymentApiResponse {
  status: 'SUCCESS' | 'FAILED';
  transactionId?: string;
  clientReference?: string;
  errorCode?: string;
  message: string;
}

export interface StoredPayment extends PaymentSubmission {
  id: string;
  createdAt: string;
  status: PaymentApiResponse['status'];
  transactionId?: string;
  errorCode?: string;
  message: string;
}

export interface PaymentLedgerState {
  availableBalance: number;
  payments: StoredPayment[];
}
