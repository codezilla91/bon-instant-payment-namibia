import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { type IncomingMessage, type ServerResponse } from 'node:http';
import pino, { type LevelWithSilent, type Logger } from 'pino';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { randomUUID } from 'node:crypto';
import { applyMockBusinessRules } from './mock-rules.js';
import openApiDocument from './openapi.js';
import { type PaymentSuccessResponse } from './types.js';
import { validatePaymentRequest } from './validation.js';

interface CreateAppOptions {
  allowedOrigins?: string[];
  disableRateLimit?: boolean;
  logLevel?: LevelWithSilent;
}

type RequestWithContext = Request & {
  id?: string;
  log?: Logger;
};

function getRequestLogger(req: RequestWithContext, fallback: Logger): Logger {
  return req.log ?? fallback;
}

function getCorrelationId(req: RequestWithContext): string {
  return typeof req.id === 'string' && req.id.length > 0 ? req.id : 'unknown';
}

function buildTransactionId(): string {
  return `TXN-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;
}

function parseAllowedOrigins(): string[] {
  const fromEnv = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (fromEnv.length > 0) {
    return fromEnv;
  }

  return ['http://localhost:4200', 'http://127.0.0.1:4200'];
}

export function createApp(options: CreateAppOptions = {}): { app: express.Express; logger: Logger } {
  const app = express();
  const logger = pino({
    level: options.logLevel ?? (process.env.LOG_LEVEL as LevelWithSilent | undefined) ?? 'info'
  });
  const usedClientReferences = new Set<string>();
  const allowedOrigins = options.allowedOrigins ?? parseAllowedOrigins();

  app.disable('x-powered-by');

  app.use(
    pinoHttp({
      logger,
      autoLogging: false,
      genReqId(req: IncomingMessage, res: ServerResponse) {
        const incoming = req.headers['x-correlation-id'];
        const rawValue = Array.isArray(incoming) ? incoming[0] : incoming;
        const correlationId =
          typeof rawValue === 'string' && rawValue.trim().length > 0 ? rawValue.trim() : randomUUID();

        res.setHeader('x-correlation-id', correlationId);
        return correlationId;
      }
    })
  );

  app.use((req, res, next) => {
    const contextReq = req as RequestWithContext;
    const requestLogger = getRequestLogger(contextReq, logger);
    const correlationId = getCorrelationId(contextReq);
    const startedAt = process.hrtime.bigint();

    requestLogger.info(
      {
        event: 'request.received',
        correlationId,
        method: req.method,
        path: req.originalUrl
      },
      'Request received'
    );

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

      requestLogger.info(
        {
          event: 'request.completed',
          correlationId,
          statusCode: res.statusCode,
          durationMs: Number(durationMs.toFixed(2))
        },
        'Request completed'
      );
    });

    next();
  });

  app.use(helmet({ contentSecurityPolicy: false }));

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error('Origin blocked by CORS policy'));
      },
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'x-correlation-id', 'x-simulate-error'],
      exposedHeaders: ['x-correlation-id']
    })
  );

  if (!options.disableRateLimit) {
    app.use(
      rateLimit({
        windowMs: 60_000,
        limit: 120,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: {
          status: 'FAILED',
          errorCode: 'ERR010',
          message: 'Too many requests. Please retry shortly.'
        }
      })
    );
  }

  app.use(express.json({ limit: '16kb' }));

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'UP', service: 'bon-p2p-mock-api' });
  });

  app.get('/api/openapi.json', (_req, res) => {
    res.status(200).json(openApiDocument);
  });

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

  app.post('/api/p2p-payment', (req, res) => {
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

    const validation = validatePaymentRequest(req.body);

    if (!validation.valid || !validation.value) {
      requestLogger.warn(
        {
          event: 'payment.validation.failed',
          correlationId,
          errorCode: validation.error?.errorCode
        },
        'Payment validation failed'
      );

      return res.status(400).json(validation.error);
    }

    const paymentRequest = validation.value;

    if (req.header('x-simulate-error')?.toUpperCase() === 'ERR006') {
      requestLogger.error(
        {
          event: 'payment.simulated.internal_error',
          correlationId,
          clientReference: paymentRequest.clientReference
        },
        'Returning simulated internal error'
      );

      return res.status(500).json({
        status: 'FAILED',
        errorCode: 'ERR006',
        clientReference: paymentRequest.clientReference,
        message: 'Internal processing error. Please retry later.'
      });
    }

    if (usedClientReferences.has(paymentRequest.clientReference)) {
      requestLogger.warn(
        {
          event: 'payment.duplicate_client_reference',
          correlationId,
          clientReference: paymentRequest.clientReference
        },
        'Duplicate clientReference rejected'
      );

      return res.status(409).json({
        status: 'FAILED',
        errorCode: 'ERR007',
        clientReference: paymentRequest.clientReference,
        message: 'Duplicate clientReference. Use a new unique clientReference.'
      });
    }

    const businessFailure = applyMockBusinessRules(paymentRequest);

    if (businessFailure) {
      const statusCode = businessFailure.errorCode === 'ERR005' ? 402 : 500;

      requestLogger.warn(
        {
          event: 'payment.business_rule.failed',
          correlationId,
          errorCode: businessFailure.errorCode,
          clientReference: paymentRequest.clientReference
        },
        'Mock business rule rejected payment'
      );

      return res.status(statusCode).json(businessFailure);
    }

    usedClientReferences.add(paymentRequest.clientReference);

    const responseBody: PaymentSuccessResponse = {
      status: 'SUCCESS',
      transactionId: buildTransactionId(),
      clientReference: paymentRequest.clientReference,
      message: 'Payment processed successfully.'
    };

    requestLogger.info(
      {
        event: 'payment.completed',
        correlationId,
        clientReference: paymentRequest.clientReference,
        transactionId: responseBody.transactionId,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency
      },
      'Payment completed successfully'
    );

    return res.status(200).json(responseBody);
  });

  app.use((error: unknown, req: Request, res: Response, next: NextFunction) => {
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
        message: 'Malformed JSON payload.'
      });
    }

    next(error);
  });

  app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
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
      message: 'Internal processing error. Please retry later.'
    });
  });

  return { app, logger };
}
