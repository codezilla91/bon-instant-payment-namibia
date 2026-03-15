import { createApp } from './app.js';

const host = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? 3000);
const { app, logger } = createApp();

app.listen(port, host, () => {
  logger.info({ event: 'service.started', host, port }, `bon-p2p-api running on http://${host}:${port}`);
});
