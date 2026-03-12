/**
 * Agrega el logo de la inmobiliaria al PDF en la esquina superior izquierda.
 * @param {object} pdf - Instancia de jsPDF
 * @param {string} [logoUrl] - URL del logo (si no se pasa, usa el del tenant en auth)
 * @param {object} [opts] - Opciones: { x: 20, y: 4, maxWidth: 24, maxHeight: 24 }
 * @returns {Promise<number>} - Posición Y después del logo (para continuar el contenido)
 */
export async function addLogoToPdf(pdf, logoUrl, opts = {}) {
  const auth = (await import('../stores/auth.js')).useAuthStore();
  const url = logoUrl || auth.tenant?.logoUrl;
  if (!url || typeof url !== 'string') return opts.y ?? 4;

  const x = opts.x ?? 20;
  const y = opts.y ?? 4;
  const maxW = opts.maxWidth ?? 24;
  const maxH = opts.maxHeight ?? 24;

  try {
    const resp = await fetch(url, { mode: 'cors' });
    if (!resp.ok) return y + maxH;
    const blob = await resp.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    if (!dataUrl || typeof dataUrl !== 'string') return y + maxH;

    const fmt = blob.type?.includes('png') ? 'PNG' : 'JPEG';
    pdf.addImage(dataUrl, fmt, x, y, maxW, maxH);
    return y + maxH;
  } catch {
    return y + maxH;
  }
}
