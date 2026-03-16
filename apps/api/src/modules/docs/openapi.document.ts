import { PAYMENT_MESSAGES } from '../payments/payment.messages.js';

export function createOpenApiDocument(serverUrl: string) {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Instant Payment Namibia API',
      version: '1.0.0',
      description: 'Mock P2P payment contract for the Bank of Namibia IPN technical assessment.'
    },
    servers: [{ url: serverUrl }],
    tags: [
      { name: 'Health', description: 'Service readiness checks' },
      { name: 'Payments', description: 'P2P payment processing' }
    ],
    paths: {
      '/api/health': {
        get: {
          tags: ['Health'],
          summary: 'Get service health',
          responses: {
            '200': {
              description: 'Service is available',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'UP' },
                      service: { type: 'string', example: 'Instant Payment Namibia' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/p2p-payment': {
        post: {
          tags: ['Payments'],
          summary: 'Submit a P2P payment',
          description: 'Validate and process a domestic NAD payment instruction.',
          parameters: [
            {
              in: 'header',
              name: 'x-correlation-id',
              required: false,
              schema: {
                type: 'string',
                example: 'a6d6e6b4-1506-4d35-9e54-4d17ad3d2f84'
              },
              description: 'Optional trace ID supplied by the caller. The API echoes it back on the response.'
            },
            {
              in: 'header',
              name: 'x-simulate-error',
              required: false,
              schema: {
                type: 'string',
                example: 'ERR006'
              },
              description: 'Optional test header to simulate an internal processing failure.'
            },
            {
              in: 'header',
              name: 'x-available-balance',
              required: false,
              schema: {
                type: 'number',
                format: 'float',
                example: 30000
              },
              description: 'Optional balance hint used by the web app to keep insufficient-funds checks aligned.'
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/P2PPaymentRequest'
                },
                examples: {
                  validPayment: {
                    value: {
                      senderAccountNumber: '1234567890',
                      receiverAccountNumber: '2234567890',
                      amount: 800,
                      currency: 'NAD',
                      reference: 'Fuel',
                      clientReference: 'CLI-1773598364191-4963'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Payment processed successfully',
              headers: {
                'x-correlation-id': {
                  $ref: '#/components/headers/CorrelationId'
                }
              },
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/PaymentSuccessResponse'
                  },
                  examples: {
                    success: {
                      value: {
                        status: 'SUCCESS',
                        transactionId: 'TXN202603150001',
                        clientReference: 'CLI-1773598364191-4963',
                        message: PAYMENT_MESSAGES.success
                      }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Validation failed',
              headers: {
                'x-correlation-id': {
                  $ref: '#/components/headers/CorrelationId'
                }
              },
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/PaymentErrorResponse'
                  },
                  examples: {
                    invalidCurrency: {
                      value: {
                        status: 'FAILED',
                        errorCode: 'ERR003',
                        clientReference: 'CLI-1773598364191-4963',
                        message: PAYMENT_MESSAGES.invalidCurrency
                      }
                    }
                  }
                }
              }
            },
            '402': {
              description: 'Business rule failure',
              headers: {
                'x-correlation-id': {
                  $ref: '#/components/headers/CorrelationId'
                }
              },
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/PaymentErrorResponse'
                  },
                  examples: {
                    insufficientFunds: {
                      value: {
                        status: 'FAILED',
                        errorCode: 'ERR005',
                        clientReference: 'CLI-1773598364191-4963',
                        message: PAYMENT_MESSAGES.insufficientFunds
                      }
                    }
                  }
                }
              }
            },
            '409': {
              description: 'Duplicate payment reference',
              headers: {
                'x-correlation-id': {
                  $ref: '#/components/headers/CorrelationId'
                }
              },
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/PaymentErrorResponse'
                  },
                  examples: {
                    duplicateReference: {
                      value: {
                        status: 'FAILED',
                        errorCode: 'ERR007',
                        clientReference: 'CLI-1773598364191-4963',
                        message: PAYMENT_MESSAGES.duplicateClientReference
                      }
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Internal processing failure',
              headers: {
                'x-correlation-id': {
                  $ref: '#/components/headers/CorrelationId'
                }
              },
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/PaymentErrorResponse'
                  },
                  examples: {
                    internalError: {
                      value: {
                        status: 'FAILED',
                        errorCode: 'ERR006',
                        clientReference: 'CLI-1773598364191-4963',
                        message: PAYMENT_MESSAGES.internalProcessingError
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    components: {
      headers: {
        CorrelationId: {
          description: 'Trace identifier returned with the response for log and support correlation.',
          schema: {
            type: 'string',
            example: 'a6d6e6b4-1506-4d35-9e54-4d17ad3d2f84'
          }
        }
      },
      schemas: {
        P2PPaymentRequest: {
          type: 'object',
          required: [
            'senderAccountNumber',
            'receiverAccountNumber',
            'amount',
            'currency',
            'reference',
            'clientReference'
          ],
          properties: {
            senderAccountNumber: {
              type: 'string',
              pattern: '^\\d{10,}$',
              example: '1234567890'
            },
            receiverAccountNumber: {
              type: 'string',
              pattern: '^\\d{10,}$',
              example: '2234567890'
            },
            amount: {
              type: 'number',
              format: 'float',
              minimum: 0.01,
              example: 800
            },
            currency: {
              type: 'string',
              enum: ['NAD'],
              example: 'NAD'
            },
            reference: {
              type: 'string',
              maxLength: 50,
              example: 'Fuel'
            },
            clientReference: {
              type: 'string',
              maxLength: 50,
              example: 'CLI-1773598364191-4963',
              description: 'Shown in the web app as Payment reference ID.'
            }
          }
        },
        PaymentSuccessResponse: {
          type: 'object',
          required: ['status', 'transactionId', 'clientReference', 'message'],
          properties: {
            status: {
              type: 'string',
              enum: ['SUCCESS'],
              example: 'SUCCESS'
            },
            transactionId: {
              type: 'string',
              example: 'TXN202603150001'
            },
            clientReference: {
              type: 'string',
              example: 'CLI-1773598364191-4963'
            },
            message: {
              type: 'string',
              example: PAYMENT_MESSAGES.success
            }
          }
        },
        PaymentErrorResponse: {
          type: 'object',
          required: ['status', 'errorCode', 'message'],
          properties: {
            status: {
              type: 'string',
              enum: ['FAILED'],
              example: 'FAILED'
            },
            errorCode: {
              type: 'string',
              example: 'ERR005'
            },
            clientReference: {
              type: 'string',
              example: 'CLI-1773598364191-4963'
            },
            message: {
              type: 'string',
              example: PAYMENT_MESSAGES.insufficientFunds
            }
          }
        }
      }
    }
  };
}
