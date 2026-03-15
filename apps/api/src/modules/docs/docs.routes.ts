import { Router } from 'express';
import { createOpenApiDocument } from './openapi.document.js';

function createSwaggerUiHtml(openApiUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Instant Payment Namibia API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      html { box-sizing: border-box; overflow-y: scroll; }
      *, *:before, *:after { box-sizing: inherit; }
      body { margin: 0; background: #faf7f1; }
      .swagger-ui .topbar { display: none; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '${openApiUrl}',
        dom_id: '#swagger-ui',
        deepLinking: true,
        docExpansion: 'list',
        displayRequestDuration: true,
        persistAuthorization: false
      });
    </script>
  </body>
</html>`;
}

export function createDocsRouter(): Router {
  const router = Router();

  router.get('/openapi.json', (req, res) => {
    const serverUrl = `${req.protocol}://${req.get('host')}`;
    res.status(200).json(createOpenApiDocument(serverUrl));
  });

  router.get('/docs', (req, res) => {
    const serverUrl = `${req.protocol}://${req.get('host')}`;
    res.type('html').send(createSwaggerUiHtml(`${serverUrl}/api/openapi.json`));
  });

  return router;
}
