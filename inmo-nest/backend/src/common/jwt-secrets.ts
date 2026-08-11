/**
 * Resuelve secretos JWT. En producción exige variables de entorno;
 * en desarrollo permite fallbacks conocidos solo para arrancar local.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET es obligatorio en producción.');
  }
  return 'dev-secret-change-in-production';
}

export function getJwtPortalSecret(): string {
  const secret = process.env.JWT_PORTAL_SECRET?.trim() || process.env.JWT_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_PORTAL_SECRET (o JWT_SECRET) es obligatorio en producción.');
  }
  return 'portal-secret';
}

export function assertProductionSecrets(): void {
  if (process.env.NODE_ENV !== 'production') return;
  getJwtSecret();
  getJwtPortalSecret();
}
