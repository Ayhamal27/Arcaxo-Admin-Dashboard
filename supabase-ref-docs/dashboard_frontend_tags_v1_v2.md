# Dashboard Frontend — Tags V1/V2

Guía de implementación para el frontend del dashboard con los cambios recientes en sensores y RPCs para soportar tags de versión `v1`/`v2`.

---

## Resumen de cambios (backend)

### 1) Tabla `public.sensors`

Se agregaron dos columnas nuevas:

| Columna | Tipo | Default | Valores permitidos |
|---|---|---|---|
| `firmware_version` | `text` | `'v2'` | `v1`, `v2` |
| `hardware_version` | `text` | `'v2'` | `v1`, `v2` |

Reglas:
- Ambas columnas son `NOT NULL`.
- Si no se envían en creación, caen en `v2`.
- Se validan por constraints (`v1`/`v2`).

---

### 2) RPCs actualizados para exponer/filtrar versiones

| RPC | Cambio de input | Cambio de output |
|---|---|---|
| `rpc_sensor_upsert_stage` | + `p_firmware_version`, `p_hardware_version` | No cambia output |
| `rpc_sensor_list_by_store` | + `p_filter_firmware_version`, `p_filter_hardware_version` | + `firmware_version`, `hardware_version` |
| `rpc_admin_list_sensors` | + `p_filter_firmware_version`, `p_filter_hardware_version` | + `firmware_version`, `hardware_version` |
| `rpc_admin_get_sensor_detail` | Sin nuevos parámetros | + `firmware_version`, `hardware_version` en el record |
| `rpc_admin_list_store_sensors` | + `p_filter_firmware_version`, `p_filter_hardware_version` | + `firmware_version`, `hardware_version` |
| `rpc_sensor_replace_maintenance` | + `p_new_firmware_version`, `p_new_hardware_version` | No cambia output |

Regla de validación en filtros/parámetros versionados:
- Solo `v1` o `v2` (case-insensitive; backend normaliza a minúsculas).
- Cualquier otro valor retorna excepción.

---

## Páginas del dashboard impactadas

### A) Listado global de sensores (Admin)

RPC: `rpc_admin_list_sensors`.

Cambios frontend:
- Mostrar dos tags por fila:
  - `FW: {firmware_version}`
  - `HW: {hardware_version}`
- Agregar filtros opcionales:
  - `Firmware`: `Todos` | `v1` | `v2`
  - `Hardware`: `Todos` | `v1` | `v2`
- Enviar `NULL` cuando el filtro esté en `Todos`.

---

### B) Detalle de sensor (Admin)

RPC: `rpc_admin_get_sensor_detail`.

Cambios frontend:
- Mostrar tags o badges de versión en el header del detalle:
  - `Firmware vX`
  - `Hardware vX`

---

### C) Sensores por tienda (Admin)

RPC: `rpc_admin_list_store_sensors`.

Cambios frontend:
- Renderizar tags `FW/HW` por sensor en vistas "Actuales" e "Histórico".
- Reusar filtros de firmware/hardware con la misma semántica (`NULL` = sin filtro).

---

### D) Vistas operativas por tienda (installer/admin híbridas)

RPC: `rpc_sensor_list_by_store`.

Cambios frontend:
- Usar `firmware_version` y `hardware_version` para tags.
- Soportar filtros opcionales por firmware/hardware.

---

## Criterio visual recomendado para tags

- Tag 1: `FW v1|v2`
- Tag 2: `HW v1|v2`
- Si en algún flujo excepcional llega `NULL` (fallback defensivo): mostrar `FW -` / `HW -` sin romper UI.

---

## Prompt exacto para implementar en frontend

```text
Implementa en el frontend del dashboard (V1/V2) el soporte completo de tags de versión de sensores usando los cambios de backend ya desplegados.

Contexto técnico obligatorio:
1) La tabla public.sensors ahora tiene:
   - firmware_version (text, NOT NULL, default 'v2', permitido: 'v1'|'v2')
   - hardware_version (text, NOT NULL, default 'v2', permitido: 'v1'|'v2')
2) RPCs actualizados:
   - rpc_admin_list_sensors(
       p_page, p_page_size, p_search, p_filter_status, p_filter_store_id, p_filter_is_active,
       p_sort_by, p_sort_order, p_filter_firmware_version, p_filter_hardware_version
     ) => ahora retorna firmware_version, hardware_version
   - rpc_admin_get_sensor_detail(p_sensor_id?, p_mac_address?, p_serial?) => ahora retorna firmware_version, hardware_version
   - rpc_admin_list_store_sensors(
       p_store_id, p_page, p_page_size, p_include_historical,
       p_filter_firmware_version, p_filter_hardware_version
     ) => ahora retorna firmware_version, hardware_version
   - rpc_sensor_list_by_store(
       p_store_id, p_query, p_filter_firmware_version, p_filter_hardware_version
     ) => ahora retorna firmware_version, hardware_version
   - rpc_sensor_upsert_stage(..., p_firmware_version, p_hardware_version)
   - rpc_sensor_replace_maintenance(..., p_new_firmware_version, p_new_hardware_version)
3) Validación backend:
   - Los campos de versión aceptan solo 'v1' o 'v2' (case-insensitive).
   - En filtros frontend, enviar NULL cuando sea “Todos”.

Objetivos de implementación:
1) En la tabla/listado global de sensores (admin), renderiza 2 tags por fila:
   - FW: {firmware_version}
   - HW: {hardware_version}
2) En detalle de sensor (admin), muestra ambos tags en el header/resumen.
3) En sensores por tienda (actuales e histórico), muestra tags FW/HW por fila.
4) Agrega filtros UI para firmware/hardware en listados que llamen:
   - rpc_admin_list_sensors
   - rpc_admin_list_store_sensors
   - rpc_sensor_list_by_store (si aplica en esa vista)
5) Mantén retrocompatibilidad:
   - Si falta dato, render fallback visual seguro (ej: FW -, HW -).
   - No romper paginación, búsqueda ni ordenamiento existentes.

Criterios de aceptación:
- Se observan tags FW/HW en todas las vistas de sensores del dashboard V1/V2.
- Los filtros por firmware/hardware funcionan con v1/v2 y con opción Todos (NULL).
- No hay regresiones en llamadas RPC existentes ni en UX actual.
```

