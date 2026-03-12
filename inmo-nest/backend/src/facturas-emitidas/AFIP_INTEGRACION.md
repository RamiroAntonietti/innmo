# Integración AFIP/ARCA - Pendiente

Este módulo está preparado para la integración con facturación electrónica de AFIP.

## Pasos para implementar

1. **Certificados**: Obtener certificado digital (.crt) y clave privada (.key) de AFIP.

2. **Dependencias**: Instalar librería para WSAA/WSFE, ej. `afip.js` o similar.

3. **Variables de entorno**:
   - `AFIP_CUIT` - CUIT del tenant
   - `AFIP_CERT_PATH` - Ruta al certificado
   - `AFIP_KEY_PATH` - Ruta a la clave privada
   - `AFIP_PRODUCTION` - true/false (homologación vs producción)

4. **Método `enviarAfip`** en `FacturasEmitidasService`:
   - Autenticarse en WSAA
   - Llamar a WSFE (Responsable Inscripto) o WSBFEV1 (Monotributista)
   - Obtener CAE y fecha vencimiento
   - Actualizar factura con cae, fechaVencimientoCae, estado: AUTORIZADA

5. **Generación de PDF** con CAE y QR según normativa AFIP.

## Web Services AFIP

- **WSAA**: Autenticación (token + sign)
- **WSFE**: Facturación electrónica (RI)
- **WSBFEV1**: Facturación electrónica (Monotributo)
