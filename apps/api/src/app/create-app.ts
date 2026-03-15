import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import pino, { type LevelWithSilent, type Logger, type StreamEntry } from 'pino';
import { resolveAllowedOrigins } from '../config/http.js';
import { createDocsRouter } from '../modules/docs/docs.routes.js';
import { createHealthRouter } from '../modules/health/health.routes.js';
import { createPaymentRouter } from '../modules/payments/payment.routes.js';
import { PaymentService } from '../modules/payments/payment.service.js';
import { createJsonParseErrorHandler, createUnhandledErrorHandler } from '../shared/http/error-handlers.js';
import { createRequestContextMiddleware, createRequestLifecycleMiddleware } from '../shared/http/request-context.js';

export interface CreateAppOptions {
  allowedOrigins?: string[];
  disableRateLimit?: boolean;
  disableFileLogging?: boolean;
  logLevel?: LevelWithSilent;
}

export function createApp(options: CreateAppOptions = {}): { app: express.Express; logger: Logger } {
  const app = express();
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');
  const logDir = path.join(rootDir, 'logs');
  const logFilePath = path.join(logDir, 'api.log');
  const streams: StreamEntry[] = [{ stream: process.stdout }];

  if (!options.disableFileLogging) {
    mkdirSync(logDir, { recursive: true });
    streams.push({ stream: pino.destination({ dest: logFilePath, mkdir: true, sync: false }) });
  }

  const logger = pino({
    level: options.logLevel ?? (process.env.LOG_LEVEL as LevelWithSilent | undefined) ?? 'info'
  }, pino.multistream(streams));
  const allowedOrigins = resolveAllowedOrigins(options.allowedOrigins);
  const paymentService = new PaymentService();

  app.disable('x-powered-by');

  // Keep the mock API secure-by-default even though auth and persistence are out of scope.
  app.use(createRequestContextMiddleware(logger));
  app.use(createRequestLifecycleMiddleware(logger));
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
      allowedHeaders: ['Content-Type', 'x-correlation-id', 'x-simulate-error', 'x-available-balance'],
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

  app.use('/api', createHealthRouter());
  app.use('/api', createDocsRouter());
  app.use('/api', createPaymentRouter({ logger, paymentService }));

  app.use(createJsonParseErrorHandler(logger));
  app.use(createUnhandledErrorHandler(logger));

  return { app, logger };
}
