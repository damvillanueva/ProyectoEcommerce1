# Proyecto SmartLogix

Monorepo personal de SmartLogix con backend en Spring Boot y frontend en React.
La base viene de la entrega grupal y esta copia se usa para seguir mejorando el sistema sin tocar el repositorio del equipo.

## Estructura

```txt
ProyectoSmartlogix/
  smartlogix-back/       Microservicios Spring Boot
  smartlogix-front/      Frontend React + Vite
  MEJORAS_PERSONALES.md  Checklist de mejoras implementadas y pendientes
  ROADMAP_PLANTILLA_ECOMMERCE.md  Fases para convertirlo en plantilla reutilizable
  NORMATIVA_Y_ESTANDARES.md  Matriz chilena e internacional de cumplimiento
  EXPLICACION_GRUPO.md   Resumen tecnico simple para explicar al equipo
  GUIA_DEMO_PROFESOR.md  Guion de demo paso a paso
```

## Funcionalidades destacadas

- Autenticacion con JWT y roles.
- Inventario con productos, stock disponible, reservado y nivel de reposicion.
- Historial de movimientos de inventario.
- Registro manual de entradas, salidas y ajustes.
- Filtros por producto, tipo, usuario, fechas y cantidad.
- Exportacion CSV del historial con filtros aplicados.
- Imagenes por producto mediante `imageUrl`.
- Miniaturas en inventario e historial.
- Alerta de stock bajo.
- Detalle completo de producto con imagen, stock e historial asociado.
- Vista 3D de bodega con busqueda por nombre, SKU o ubicacion.
- Pedidos desde catalogo de inventario.
- Envios conectados al pedido y limpieza de reservas al eliminar.
- Traslado visual de productos entre bodegas.

## Backend

Ruta:

```powershell
cd smartlogix-back
```

Crear la configuracion local antes del primer arranque:

```powershell
Copy-Item .env.example .env
```

Luego se deben reemplazar todos los valores de `REEMPLAZAR_*`. El archivo `.env`
real contiene secretos locales y Git no lo versiona.

Validar:

```powershell
.\mvnw.cmd -pl inventory-service -am test
```

Levantar con Docker:

```powershell
docker compose up --build
```

API Gateway:

```txt
http://localhost:8080
```

Usuarios semilla de desarrollo:

```txt
admin
usuario
bodeguero
cliente
```

Las contrasenas se definen exclusivamente mediante las variables
`SMARTLOGIX_SEED_*_PASSWORD` del archivo `.env` local.

## Frontend

Ruta:

```powershell
cd smartlogix-front
```

Instalar dependencias:

```powershell
npm install
```

Ejecutar:

```powershell
npm run dev
```

Validar build:

```powershell
npm run build
```

URL local:

```txt
http://localhost:5174
```

## Seguridad y limpieza del repositorio

Este repositorio ignora dependencias, builds, logs y archivos locales sensibles:

- `node_modules`
- `dist`
- `target`
- `.env`
- contrasenas y secretos JWT
- `credential.txt`
- volumenes y datos locales de PostgreSQL

## Checklist

El avance personal esta documentado en:

```txt
MEJORAS_PERSONALES.md
ROADMAP_PLANTILLA_ECOMMERCE.md
NORMATIVA_Y_ESTANDARES.md
EXPLICACION_GRUPO.md
GUIA_DEMO_PROFESOR.md
```
