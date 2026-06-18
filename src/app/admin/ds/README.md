# Modulo Admin DS

Ruta principal: `/admin/ds`

## SQL recomendado (una vez)
- Ejecutar `src/app/admin/ds/sql/add-assignment-rules.sql` en Supabase para crear:
  - `assignment_mode`
  - `min_price`
  - `max_price`
  - constraints de consistencia
- Ejecutar `src/app/admin/ds/sql/add-service-type-categories.sql` para:
  - `category_code`
  - `category_name`
  - `sort_order`
  - índices y constraints de grupo
- Ejecutar `src/app/admin/ds/sql/add-seller-service-types.sql` para:
  - tabla `ds_seller_service_types` (rubros/tipos habilitados por vendedor)
  - índices y constraint único `(seller_id, service_type_id)`
- Ejecutar `src/app/admin/ds/sql/add-product-subcategories.sql` para:
  - tabla `ds_product_subcategories` (subgrupos por tipo de servicio)
  - columna `subcategory_id` en `ds_catalog_products`
- Opcional: ejecutar `src/app/admin/ds/sql/seed-service-types-common.sql` para cargar rubros/tipos frecuentes
  - Restaurantes, Comida rápida, Farmacias, Almacenes, Supermercados, Minimarkets, Courier y encomiendas

## Que incluye
- CRUD de `public.ds_catalog_products`
- Asignacion vendedor-producto sobre `public.ds_seller_catalog_products`
- Seleccion de rubros/tipos por vendedor en `public.ds_seller_service_types`
- Gestion de `public.ds_service_types` desde UI (crear/editar/activar/desactivar)
- Gestión de subgrupos en `public.ds_product_subcategories`
- Reglas de asignacion por producto en catalogo:
  - `assignment_mode`: `required | optional | restricted`
  - `min_price` / `max_price` (opcionales)
- Filtros, paginacion, validaciones inline y confirmacion para activar/desactivar

## Endpoints del modulo
- `GET /api/admin/ds/meta`
  - Obtiene `ds_service_types`, `ds_product_subcategories` y vendedores (`ds_seller_profiles` + `ds_profiles`)
- `GET /api/admin/ds/service-types`
  - Lista tipos de servicio
- `POST /api/admin/ds/service-types`
  - Crea tipo de servicio
- `PUT /api/admin/ds/service-types`
  - Edita tipo de servicio
- `PATCH /api/admin/ds/service-types`
  - Activa/desactiva tipo de servicio
- `GET /api/admin/ds/subcategories`
  - Lista subgrupos (opcional por `service_type_id`)
- `POST /api/admin/ds/subcategories`
  - Crea subgrupo
- `PUT /api/admin/ds/subcategories`
  - Edita subgrupo
- `PATCH /api/admin/ds/subcategories`
  - Activa/desactiva subgrupo
- `GET /api/admin/ds/catalog`
  - Lista paginada de catalogo con filtros (`service_type_id`, `subcategory_id`, `is_active`, `search`)
- `POST /api/admin/ds/catalog`
  - Crea producto catalogo
  - SKU numerico se genera automaticamente
- `PUT /api/admin/ds/catalog`
  - Edita producto catalogo
- `PATCH /api/admin/ds/catalog`
  - Activa/desactiva producto (soft toggle)
- `DELETE /api/admin/ds/catalog?id=<uuid>`
  - Elimina producto del catalogo
- `GET /api/admin/ds/assignments`
  - Lista productos + asignacion para un vendedor
  - Por defecto solo trae productos de tipos habilitados del vendedor
- `POST /api/admin/ds/assignments`
  - Upsert de asignacion vendedor-producto
- `GET /api/admin/ds/seller-services?seller_id=<uuid>`
  - Obtiene tipos habilitados para el vendedor
- `PUT /api/admin/ds/seller-services`
  - Reemplaza selección de tipos para el vendedor (`service_type_ids[]`)

## Validaciones de negocio
- `sku` numerico autogenerado (se intenta unicidad antes de insertar)
- `price >= 0`
- `stock >= 0`
- Si existe rango en catalogo, `price` debe respetar `min_price` / `max_price`
- Si `assignment_mode = required`, la asignacion vendedor queda activa (`is_active = true`)
- `specs` debe ser objeto JSON valido
- `slug` de service type: formato kebab-case (`gas-lp`, `agua-purificada`)
- `code` de subgrupo: formato snake_case y único por tipo de servicio

## Compatibilidad
- Este modulo administra el catalogo base y asignaciones.
- Flujo recomendado:
  - Admin define grupos/tipos en `ds_service_types` (ej: Alimentos > Restaurante).
  - Admin habilita al vendedor los tipos que puede operar.
  - Admin asigna productos solo dentro de esos tipos habilitados.
- `ds_products` se mantiene como salida operativa mediante triggers ya existentes en DB.
