export const PAYMENT_MESSAGES = {
  invalidRequest: 'Invalid request payload',
  missingRequiredFields: 'Missing required fields',
  invalidAccountFormat: 'Invalid account format',
  invalidCurrency: 'Invalid currency. Only NAD is supported',
  invalidAmount: 'Invalid amount. Amount must be greater than zero',
  invalidReference: 'Invalid reference. Maximum 50 characters allowed',
  duplicateClientReference: 'Duplicate client reference',
  insufficientFunds: 'Insufficient funds',
  internalProcessingError: 'Internal processing error',
  success: 'Payment processed successfully'
} as const;
