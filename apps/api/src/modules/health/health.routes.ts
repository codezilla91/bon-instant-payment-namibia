import { Router } from 'express';

export function createHealthRouter(): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.status(200).json({ status: 'UP', service: 'Instant Payment Namibia' });
  });

  return router;
}
