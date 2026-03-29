# Documentación del Proyecto — Arcaxo Supabase

Referencia técnica por dominio del modelo de datos, reglas de negocio y contratos de RPC.

---

## Índice de documentos

| Documento | Dominio | Descripción |
|---|---|---|
| [stores.md](./stores.md) | Tiendas | Modelo de datos, triggers, RPCs de instalación y RPCs administrativos del dashboard |
| [profiles.md](./profiles.md) | Usuarios | `profiles`, roles, estados, RPCs de acceso y RPCs administrativos del dashboard |
| [sensors.md](./sensors.md) | Sensores | Ciclo de vida de sensores, instalaciones, eventos y RPCs administrativos del dashboard |
| [sessions.md](./sessions.md) | Sesiones | Sesiones de instalación y mantenimiento, reglas de exclusividad, RPCs |
| [maintenance.md](./maintenance.md) | Mantenimiento | Solicitudes y sesiones de mantenimiento, flujo admin, acciones sobre sensores |
| [installer_locations.md](./installer_locations.md) | Ubicaciones GPS | Tracking de instaladores en tiempo real, `rpc_log_installer_location`, `rpc_get_nearby_installers` |
| [geography.md](./geography.md) | Geografía | Catálogos de regiones, países, estados y ciudades |
| [app_version.md](./app_version.md) | Versionado | Control de versión de la app móvil |
| [dashboard_frontend_tags_v1_v2.md](./dashboard_frontend_tags_v1_v2.md) | Frontend Dashboard | Implementación de tags V1/V2 para sensores y cambios de RPC |

---

## Resumen de dominios y tablas

| Dominio | Tablas principales |
|---|---|
| Tiendas | `stores`, `store_context`, `store_metadata_current` |
| Usuarios | `profiles` (vinculada a `auth.users`) |
| Sensores | `sensors`, `sensor_installations`, `sensor_installation_events` |
| Sesiones | `store_installation_sessions`, `store_maintenance_sessions` |
| Mantenimiento | `store_maintenance_requests`, `sensor_maintenance_actions` |
| Ubicaciones | `installer_locations` |
| Geografía | `regions`, `subregions`, `countries`, `states`, `cities` |
| App | `app_version` |

---

## Convenciones del proyecto

### Patrón de autorización en RPCs

Todos los RPCs con `SECURITY DEFINER` siguen este patrón:

```
v_is_privileged_backend := (service_role OR console_admin)

Si NO es privileged:
  → verificar auth.uid()
  → verificar perfil activo en profiles
  → verificar rol suficiente
```

`service_role` y usuarios de consola (`postgres`, `supabase_admin`) bypassean todas las verificaciones de rol.

### Patrón de paginación

Los RPCs de listado usan `COUNT(*) OVER()` para retornar el total sin paginación en el mismo query:

```sql
COUNT(*) OVER()::BIGINT AS total_count
```

Con `p_page` y `p_page_size` como parámetros estándar (DEFAULT 1 y 20 respectivamente).

### Patrón de ordenamiento seguro

El ordenamiento dinámico usa `CASE WHEN` sobre una whitelist para evitar SQL injection:

```sql
ORDER BY
  CASE WHEN v_sort_by = 'name'       THEN s.name       END,
  CASE WHEN v_sort_by = 'updated_at' THEN s.updated_at  END,
  ...
```

### RLS

Todas las tablas de negocio tienen `ENABLE ROW LEVEL SECURITY`. No hay políticas directas definidas — el acceso es exclusivamente vía RPCs `SECURITY DEFINER` que bypassean RLS.

### PostGIS

Las funciones geoespaciales usan el prefijo `extensions.`:

```sql
extensions.ST_SetSRID(extensions.ST_MakePoint(lon, lat), 4326)::extensions.geography
extensions.ST_DWithin(location, center, radius)
extensions.ST_Distance(location, center)
```

El tipo geography en DDL: `extensions.geography(POINT, 4326)`.
