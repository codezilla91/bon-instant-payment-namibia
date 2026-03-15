const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'BoN P2P Mock Payment API',
    version: '1.0.0',
    description:
      'Mock API for the IPN Developer Integration Challenge. It validates requests, simulates deterministic outcomes, and returns contract-style responses.'
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local development server'
    }
  ],
  tags: [
    {
      name: 'Health'
    },
    {
      name: 'Payments'
    }
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'API health check',
        responses: {
          '200': {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'UP'
                    },
                    service: {
                      type: 'string',
                      example: 'bon-p2p-mock-api'
                    }
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
        summary: 'Submit a mock P2P payment',
        description:
          'Validates input and returns either a successful mock transaction or deterministic error responses for challenge testing.',
        parameters: [
          {
            name: 'x-correlation-id',
            in: 'header',
            required: false,
            schema: {
              type: 'string'
            },
            description: 'Optional caller-generated correlation ID. If omitted, the API generates one.'
          },
          {
            name: 'x-simulate-error',
            in: 'header',
            required: false,
            schema: {
              type: 'string',
              enum: ['ERR006']
            },
            description: 'Set to ERR006 to force an internal processing error response.'
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
                    receiverAccountNumber: '0987654321',
                    amount: 250.0,
                    currency: 'NAD',
                    reference: 'Family support',
                    clientReference: 'CLI-1700000000000-1234'
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
                schema: {
                  type: 'string'
                },
                description: 'Request correlation ID for end-to-end tracing.'
              }
            },
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PaymentSuccessResponse'
                }
              }
            }
          },
          '400': {
            description: 'Validation failure',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PaymentErrorResponse'
                }
              }
            }
          },
          '409': {
            description: 'Duplicate clientReference',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PaymentErrorResponse'
                }
              }
            }
          },
          '402': {
            description: 'Insufficient funds',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PaymentErrorResponse'
                }
              }
            }
          },
          '429': {
            description: 'Too many requests',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PaymentErrorResponse'
                }
              }
            }
          },
          '500': {
            description: 'Internal processing error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PaymentErrorResponse'
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
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
            pattern: '^\\\\d{10,}$',
            example: '1234567890'
          },
          receiverAccountNumber: {
            type: 'string',
            pattern: '^\\\\d{10,}$',
            example: '0987654321'
          },
          amount: {
            type: 'number',
            exclusiveMinimum: 0,
            example: 250.0
          },
          currency: {
            type: 'string',
            enum: ['NAD'],
            example: 'NAD'
          },
          reference: {
            type: 'string',
            minLength: 1,
            maxLength: 50,
            example: 'Family support transfer'
          },
          clientReference: {
            type: 'string',
            minLength: 1,
            maxLength: 50,
            example: 'CLI-1700000000000-1234'
          }
        }
      },
      PaymentSuccessResponse: {
        type: 'object',
        required: ['status', 'transactionId', 'clientReference', 'message'],
        properties: {
          status: {
            type: 'string',
            enum: ['SUCCESS']
          },
          transactionId: {
            type: 'string',
            example: 'TXN-20260312181512-ABC12345'
          },
          clientReference: {
            type: 'string',
            example: 'CLI-1700000000000-1234'
          },
          message: {
            type: 'string',
            example: 'Payment processed successfully.'
          }
        }
      },
      PaymentErrorResponse: {
        type: 'object',
        required: ['status', 'errorCode', 'message'],
        properties: {
          status: {
            type: 'string',
            enum: ['FAILED']
          },
          errorCode: {
            type: 'string',
            example: 'ERR005'
          },
          clientReference: {
            type: 'string',
            nullable: true,
            example: 'CLI-1700000000000-1234'
          },
          message: {
            type: 'string',
            example: 'Insufficient funds for this transaction.'
          }
        }
      }
    }
  }
} as const;

export default openApiDocument;
