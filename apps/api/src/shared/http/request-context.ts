import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { type IncomingMessage, type ServerResponse } from 'node:http';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';

export type RequestWithContext = Request & {
  id?: string;
  log?: Logger;
};

export function getRequestLogger(req: RequestWithContext, fallback: Logger): Logger {
  return req.log ?? fallback;
}

export function getCorrelationId(req: RequestWithContext): string {
  return typeof req.id === 'string' && req.id.length > 0 ? req.id : 'unknown';
}

export function createRequestContextMiddleware(logger: Logger) {
  return pinoHttp({
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
  });
}

export function createRequestLifecycleMiddleware(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction) => {
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
  };
}
