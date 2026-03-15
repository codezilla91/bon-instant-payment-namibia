const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:4200', 'http://127.0.0.1:4200'];

export function resolveAllowedOrigins(explicitAllowedOrigins?: string[]): string[] {
  if (explicitAllowedOrigins && explicitAllowedOrigins.length > 0) {
    return explicitAllowedOrigins;
  }

  const originsFromEnv = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return originsFromEnv.length > 0 ? originsFromEnv : DEFAULT_ALLOWED_ORIGINS;
}
