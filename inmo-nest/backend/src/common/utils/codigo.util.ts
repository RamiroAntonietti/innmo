const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Genera un código legible: PREFIJO + 7 caracteres alfanuméricos en mayúsculas.
 * Ej: generarCodigo('PROP') => 'PROP-A3K9X2M'
 */
export function generarCodigo(prefijo: string): string {
  let s = prefijo + '-';
  for (let i = 0; i < 7; i++) {
    s += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return s;
}

export const PREFIJOS = {
  PROPIEDAD: 'PROP',
  CLIENTE: 'CLI',
  CONTRATO: 'CON',
  COBRO: 'COB',
  GASTO: 'GAS',
  VENTA: 'VEN',
} as const;
