# Integración Mercado Libre - Publicar inmuebles

El backend está preparado para que un programador implemente la publicación de propiedades en Mercado Libre. La estructura, endpoints y base de datos ya están definidos.

## Lo que ya está hecho

- **Schema Prisma**: `Tenant` tiene `mlAppId`, `mlClientId`, `mlClientSecret`, `mlAccessToken`, `mlRefreshToken`
- **Modelo `PropiedadMercadoLibre`**: vincula `propiedad_id` ↔ `ml_item_id` (ID de la publicación en ML)
- **Tenant API**: `PUT /tenant/mercado-libre` guarda credenciales y tokens
- **MercadoLibreModule**: Service y Controller con endpoints listos para implementar
- **Migración**: `add_mercado_libre_integracion.sql` (ejecutar con `node prisma/run-migrations.js`)

## Endpoints disponibles

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/mercado-libre/auth-url?redirect_uri=...` | URL para iniciar OAuth (ya implementado) |
| GET | `/mercado-libre/oauth/callback?code=...` | Callback OAuth - intercambiar code por tokens |
| POST | `/mercado-libre/publicar/:propiedadId` | Publicar propiedad en ML |
| PUT | `/mercado-libre/actualizar/:propiedadId` | Actualizar publicación existente |
| DELETE | `/mercado-libre/despublicar/:propiedadId` | Pausar/cerrar publicación |
| GET | `/mercado-libre/estado/:propiedadId` | Estado de la publicación (desde BD) |

## Pasos para implementar

### 1. Crear app en Mercado Libre

1. Ir a [developers.mercadolibre.com.ar](https://developers.mercadolibre.com.ar)
2. Crear una aplicación
3. Obtener **App ID**, **Client ID** y **Client Secret**
4. Configurar **Redirect URI** (ej: `https://tu-backend.com/api/mercado-libre/oauth/callback` o en desarrollo `http://localhost:3000/mercado-libre/oauth/callback`)
5. Guardar en Configuración del tenant: `PUT /tenant/mercado-libre` con `mlAppId`, `mlClientId`, `mlClientSecret`

### 2. Flujo OAuth

**getAuthUrl** (ya implementado): genera la URL para redirigir al usuario a ML.

**exchangeCodeForTokens** (TODO): implementar en `MercadoLibreService`:

```typescript
// POST https://api.mercadolibre.com/oauth/token
// Content-Type: application/x-www-form-urlencoded
// Body: grant_type=authorization_code&client_id=...&client_secret=...&code=...&redirect_uri=...
```

Respuesta de ML incluye `access_token` y `refresh_token`. Guardarlos con:

```typescript
await this.prisma.tenant.update({
  where: { id: tenantId },
  data: { mlAccessToken: data.access_token, mlRefreshToken: data.refresh_token },
});
```

### 3. Publicar inmueble (POST /items)

Documentación: [Publica inmuebles](https://developers.mercadolibre.com.ar/es_ar/publica-inmuebles/publica-inmueble)

**Campos obligatorios**:
- `title`, `category_id`, `price`, `currency_id` (ARS)
- `buying_mode`: `"classified"`
- `listing_type_id`: `"silver"` (o gold según paquete)
- `condition`: `"not_specified"`
- `pictures`: array de `{ source: "url" }` — **obligatorio desde feb 2026**
- `seller_contact`: nombre, teléfono, email
- `location`: address_line, zip_code, neighborhood (id), latitude, longitude
- `attributes`: ROOMS, FULL_BATHROOMS, COVERED_AREA, TOTAL_AREA, PROPERTY_TYPE, OPERATION, etc.

**Mapeo Propiedad → ML**:
- `Propiedad.titulo` → `title`
- `Propiedad.precio` → `price` (entero)
- `Propiedad.imagenes[].url` → `pictures[].source`
- `Propiedad.direccion` → `location.address_line`
- `Propiedad.dormitorios` → `attributes` ROOMS
- `Propiedad.banos` → `attributes` FULL_BATHROOMS
- `Propiedad.metrosCuadrados` → `attributes` COVERED_AREA, TOTAL_AREA
- `Propiedad.tipoOperacion` → OPERATION (VENTA/ALQUILER)

**Categorías** (Argentina): MLA401686 (departamentos), MLA401687 (casas), etc. Ver [Categorías y atributos](https://developers.mercadolibre.com.ar/es_ar/categorias-y-atributos-inmuebles).

### 4. Actualizar publicación

`PUT https://api.mercadolibre.com/items/{item_id}` con el body parcial (solo campos a cambiar).

### 5. Despublicar

`PUT https://api.mercadolibre.com/items/{item_id}` con `"status": "closed"` o `"paused"`.

### 6. Refresh token

Los access_token expiran. Antes de cada llamada a la API, verificar si está vencido y usar `refresh_token` para obtener uno nuevo:

```
POST https://api.mercadolibre.com/oauth/token
Body: grant_type=refresh_token&client_id=...&client_secret=...&refresh_token=...
```

## Archivos a modificar

- `src/mercado-libre/mercado-libre.module.ts` — implementar los métodos marcados con TODO
- Opcional: crear `src/mercado-libre/ml-api.client.ts` para centralizar llamadas HTTP a ML

## Consideraciones

- **Imágenes**: ML requiere al menos 1 imagen. Usar `PropiedadImagen` (url en Supabase).
- **Barrios**: ML usa IDs de barrio (`neighborhood.id`). Puede requerir búsqueda en `GET /sites/MLA/domain_discovery/search?q=...` o similar.
- **Código postal**: Si no se tiene, usar uno por defecto según ciudad.
- **Lat/Long**: Opcional pero recomendado. Considerar geocoding si no está en la propiedad.
