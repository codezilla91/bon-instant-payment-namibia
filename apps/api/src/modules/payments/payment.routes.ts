import { Router } from 'express';
import type { Logger } from 'pino';
import { getCorrelationId, getRequestLogger, type RequestWithContext } from '../../shared/http/request-context.js';
import { PaymentService } from './payment.service.js';

interface CreatePaymentRouterOptions {
  logger: Logger;
  paymentService?: PaymentService;
}

function parseAvailableBalanceHeader(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function createPaymentRouter({
  logger,
  paymentService = new PaymentService()
}: CreatePaymentRouterOptions): Router {
  const router = Router();

  router.post('/p2p-payment', (req, res) => {
    const contextReq = req as RequestWithContext;
    const requestLogger = getRequestLogger(contextReq, logger);
    const correlationId = getCorrelationId(contextReq);

    requestLogger.info(
      {
        event: 'payment.request.received',
        correlationId,
        clientReference: typeof req.body?.clientReference === 'string' ? req.body.clientReference : null
      },
      'Payment request received'
    );

    const result = paymentService.process(req.body, {
      simulateErrorCode: req.header('x-simulate-error') ?? undefined,
      // The web app keeps the wallet in browser storage, so it sends the current
      // balance with each payment to keep the API's insufficient-funds rule aligned.
      availableBalance: parseAvailableBalanceHeader(req.header('x-available-balance') ?? undefined)
    });

    switch (result.kind) {
      case 'validation_failed':
        requestLogger.warn(
          {
            event: 'payment.validation.failed',
            correlationId,
            errorCode: result.response.errorCode
          },
          'Payment validation failed'
        );
        break;

      case 'simulated_internal_error':
        requestLogger.error(
          {
            event: 'payment.simulated.internal_error',
            correlationId,
            clientReference: result.paymentRequest.clientReference
          },
          'Returning simulated internal error'
        );
        break;

      case 'duplicate_client_reference':
        requestLogger.warn(
          {
            event: 'payment.duplicate_client_reference',
            correlationId,
            clientReference: result.paymentRequest.clientReference
          },
          'Duplicate clientReference rejected'
        );
        break;

      case 'business_failure':
        requestLogger.warn(
          {
            event: 'payment.business_rule.failed',
            correlationId,
            errorCode: result.response.errorCode,
            clientReference: result.paymentRequest.clientReference
          },
          'Mock business rule rejected payment'
        );
        break;

      case 'success':
        requestLogger.info(
          {
            event: 'payment.completed',
            correlationId,
            clientReference: result.paymentRequest.clientReference,
            transactionId: result.response.transactionId,
            amount: result.paymentRequest.amount,
            currency: result.paymentRequest.currency
          },
          'Payment completed successfully'
        );
        break;
    }

    return res.status(result.statusCode).json(result.response);
  });

  return router;
}
