import type { ErrorRequestHandler } from 'express';
import type { Logger } from 'pino';
import { PAYMENT_MESSAGES } from '../../modules/payments/payment.messages.js';
import { getCorrelationId, getRequestLogger, type RequestWithContext } from './request-context.js';

export function createJsonParseErrorHandler(logger: Logger): ErrorRequestHandler {
  return (error, req, res, next) => {
    if (error instanceof SyntaxError && 'body' in error) {
      const contextReq = req as RequestWithContext;
      const requestLogger = getRequestLogger(contextReq, logger);
      const correlationId = getCorrelationId(contextReq);

      requestLogger.warn(
        {
          event: 'request.json_parse_error',
          correlationId
        },
        'Malformed JSON payload'
      );

      return res.status(400).json({
        status: 'FAILED',
        errorCode: 'ERR000',
        message: PAYMENT_MESSAGES.invalidRequest
      });
    }

    next(error);
  };
}

export function createUnhandledErrorHandler(logger: Logger): ErrorRequestHandler {
  return (error, req, res, _next) => {
    void _next;

    const contextReq = req as RequestWithContext;
    const requestLogger = getRequestLogger(contextReq, logger);
    const correlationId = getCorrelationId(contextReq);

    if (error instanceof Error && error.message.includes('CORS')) {
      requestLogger.warn(
        {
          event: 'request.cors_blocked',
          correlationId
        },
        'CORS origin blocked'
      );

      return res.status(403).json({
        status: 'FAILED',
        errorCode: 'ERR009',
        message: 'Origin is not allowed by CORS policy.'
      });
    }

    requestLogger.error(
      {
        event: 'request.unhandled_error',
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      'Unhandled request error'
    );

    return res.status(500).json({
      status: 'FAILED',
      errorCode: 'ERR006',
      message: PAYMENT_MESSAGES.internalProcessingError
    });
  };
}
