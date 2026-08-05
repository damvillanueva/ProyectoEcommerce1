# SmartLogix Backend

Backend de microservicios para una plataforma ecommerce y de gestion logistica.
Esta implementacion forma parte de un proyecto de portafolio y prioriza una
arquitectura ejecutable, seguridad por capas y operacion reproducible.

Incluye los siguientes modulos:

- Gestion de Inventario (`inventory-service`)
- Procesamiento de Pedidos (`order-service`)
- Coordinacion de Envios (`shipment-service`)

Y componentes de infraestructura:

- Descubrimiento de servicios (`discovery-service` con Eureka)
- API Gateway (`api-gateway`)
- Autenticacion JWT (`auth-service`)

## Patrones de arquitectura implementados

- `Service Discovery`: registro dinamico con Eureka.
- `API Gateway`: punto unico de entrada para frontend o clientes.
- `Database per Service`: cada microservicio usa una base PostgreSQL y un usuario propio.
- `Database Migration`: Flyway versiona y valida la estructura de cada base.
- `Factory Method`: en `shipment-service` para crear planes de envio por zona.
- `Circuit Breaker`: en `order-service` para llamadas a `shipment-service`.
- `Synchronous orchestration`: `order-service` coordina inventario + envio.
- `Transactional outbox`: los avisos se persisten con el pedido y se entregan despues del commit.

## Estructura del repositorio

- `discovery-service` (puerto `8761`)
- `api-gateway` (puerto `8080`)
- `auth-service` (puerto interno `8084`)
- `inventory-service` (puerto interno `8081`)
- `order-service` (puerto interno `8082`)
- `shipment-service` (puerto interno `8083`)

## Requisitos

- Java 17
- Maven Wrapper (`mvnw.cmd` ya incluido)
- Docker Desktop para PostgreSQL y la ejecucion completa

## Compilar y validar

```powershell
.\mvnw.cmd clean test
```

## Docker

Todas las imagenes de los microservicios usan multi-stage build con Java 17:

```dockerfile
FROM eclipse-temurin:17-jdk AS build
```

Para levantar toda la plataforma con Docker Compose:

```powershell
Copy-Item .env.example .env
# Reemplace todos los valores REEMPLAZAR_* antes de continuar.
docker compose up --build -d
docker compose ps
```

PostgreSQL se publica localmente en `localhost:5433`. Los datos permanecen en
el volumen `smartlogix-postgres-data` aunque los contenedores se reinicien. Las
cuatro bases se crean con propietarios separados:

- `smartlogix_auth`
- `smartlogix_inventory`
- `smartlogix_order`
- `smartlogix_shipment`

El puerto se enlaza solo a `127.0.0.1`, por lo que PostgreSQL no queda expuesto
a otros equipos de la red. Las credenciales de las bases se aplican al crear el
volumen por primera vez; cambiarlas luego requiere actualizar los roles o crear
un volumen nuevo de manera intencional.

Flyway ejecuta los archivos `db/migration/V*__*.sql` antes de que Hibernate
valide las entidades. No se debe modificar una migracion ya aplicada; los
cambios futuros se agregan como `V2`, `V3` y siguientes.

### Respaldo y restauracion

Con la plataforma levantada, cree un respaldo consistente de las cuatro bases:

```powershell
.\scripts\backup-postgres.ps1
```

La restauracion valida el manifiesto y los hashes, crea primero un respaldo de
seguridad y exige confirmacion explicita:

```powershell
.\scripts\restore-postgres.ps1 `
  -BackupPath .\backups\20260718_231323 `
  -Force
```

El procedimiento completo, las opciones de retencion y las precauciones para
datos personales estan en [docs/BACKUP_RESTORE.md](docs/BACKUP_RESTORE.md).

Para detenerla:

```powershell
docker compose down
```

Si Docker Desktop no esta ejecutandose, `docker compose` devolvera un error de conexion al daemon.

Tambien puedes usar:

```powershell
.\run-docker.ps1
```

## Ejecutar (opcion 1: manual)

Iniciar en este orden (cada comando en terminal distinta):

```powershell
.\mvnw.cmd -pl discovery-service spring-boot:run
.\mvnw.cmd -pl auth-service spring-boot:run
.\mvnw.cmd -pl inventory-service spring-boot:run
.\mvnw.cmd -pl shipment-service spring-boot:run
.\mvnw.cmd -pl order-service spring-boot:run
.\mvnw.cmd -pl api-gateway spring-boot:run
```

## Ejecutar (opcion 2: script)

```powershell
.\run-services.ps1
```

## URLs principales

- Eureka Dashboard: `http://localhost:8761`
- API Gateway: `http://localhost:8080`
- Mailpit: `http://127.0.0.1:8025`

En Docker Compose solo quedan publicados `8761` y `8080`. Los microservicios internos no se exponen al host; deben consumirse por el gateway.

## Pruebas de seguridad

Los permisos se validan en cada microservicio a partir del JWT firmado; cambiar
el rol o los controles visibles desde las herramientas del navegador no concede
privilegios. Las pruebas HTTP cubren accesos sin autenticar, permisos por rol,
operaciones reservadas entre servicios y rechazo de tokens con una firma
invalida.

```powershell
.\mvnw.cmd test
```

## Pruebas rapidas por Gateway

### 1) Obtener token JWT

```powershell
$adminPassword = Read-Host "Contrasena local de admin"
$login = Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8080/api/auth/login `
  -ContentType "application/json" `
  -Body (@{ credential = "admin"; password = $adminPassword } | ConvertTo-Json)

$token = $login.token
```

Usuarios seed de desarrollo:

- `admin`
- `usuario`
- `bodeguero`
- `cliente`

Las contrasenas y la clave JWT son obligatorias y se definen en `.env`:

- `SMARTLOGIX_SEED_ADMIN_PASSWORD`
- `SMARTLOGIX_SEED_USER_PASSWORD`
- `SMARTLOGIX_SEED_WAREHOUSE_PASSWORD`
- `SMARTLOGIX_SEED_CUSTOMER_PASSWORD`
- `JWT_SECRET`
- `SMARTLOGIX_CORS_ALLOWED_ORIGIN`
- `SMARTLOGIX_CORS_ALLOWED_ORIGIN_ALT`
- `SMARTLOGIX_DB_ADMIN_PASSWORD`
- `SMARTLOGIX_DB_AUTH_PASSWORD`
- `SMARTLOGIX_DB_INVENTORY_PASSWORD`
- `SMARTLOGIX_DB_ORDER_PASSWORD`
- `SMARTLOGIX_DB_SHIPMENT_PASSWORD`

Los perfiles disponibles en los servicios persistentes son:

- `dev`: PostgreSQL local en el puerto `5433`.
- `test`: H2 aislado, Flyway desactivado y tablas temporales.
- `prod`: exige URL, usuario y contrasena de base sin valores predeterminados.

### 2) Listar inventario inicial

```powershell
Invoke-RestMethod `
  -Uri http://localhost:8080/api/inventory/items `
  -Headers @{ Authorization = "Bearer $token" }
```

### 3) Crear un pedido

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8080/api/orders `
  -ContentType "application/json" `
  -Headers @{ Authorization = "Bearer $token" } `
  -Body '{
    "customerName": "Ana Torres",
    "customerEmail": "ana@cliente.cl",
    "shippingAddress": "Av. Providencia 1234, Santiago",
    "lines": [
      { "sku": "SKU-1001", "quantity": 2, "unitPrice": 29990 },
      { "sku": "SKU-2001", "quantity": 1, "unitPrice": 14990 }
    ]
  }'
```

### 4) Ver pedidos

```powershell
Invoke-RestMethod `
  -Uri http://localhost:8080/api/orders `
  -Headers @{ Authorization = "Bearer $token" }
```

### 5) Ver envios

```powershell
Invoke-RestMethod `
  -Uri http://localhost:8080/api/shipments `
  -Headers @{ Authorization = "Bearer $token" }
```

## Endpoints clave

### Auth Service

- `POST /api/auth/register` publico
- `POST /api/auth/login` publico
- `GET /api/auth/validate` protegido con `Authorization: Bearer <token>`

### Inventory Service

- `GET /api/inventory/items`
- `POST /api/inventory/items`
- `GET /api/inventory/items/{sku}`
- `GET /api/inventory/items/{sku}/availability?quantity=...`
- `PATCH|POST /api/inventory/items/{sku}/reserve?quantity=...`
- `PATCH|POST /api/inventory/items/{sku}/release?quantity=...`
- `PATCH|POST /api/inventory/items/{sku}/dispatch?quantity=...`

### Order Service

- `POST /api/orders`
- `GET /api/orders`
- `GET /api/orders/{orderNumber}`
- `GET /api/notifications/mine`
- `PATCH /api/notifications/mine/{id}/read`
- `PATCH /api/notifications/mine/read-all`
- `GET /api/notifications`
- `POST /api/notifications/{id}/retry`

### Shipment Service

- `POST /api/shipments`
- `GET /api/shipments`
- `GET /api/shipments/{trackingCode}`
- `PATCH /api/shipments/{trackingCode}/status?value=IN_TRANSIT`

## Flujo funcional implementado

1. Se crea orden en `order-service`.
2. `order-service` valida disponibilidad en `inventory-service`.
3. Si hay stock, reserva unidades en inventario.
4. Solicita planificacion de envio en `shipment-service`.
5. Devuelve orden con `trackingCode` y estado final.
6. Persiste avisos transaccionales y envia el correo despues de confirmar la transaccion.

Si SMTP no responde, el pedido conserva su estado y la notificacion queda
`FAILED` para supervision y reintento. El motivo tecnico no se entrega al
cliente y el reintento esta reservado a `ROLE_ADMIN`.

## Evolucion prevista

El backend puede ampliarse con:

- mensajeria asincrona (Kafka/RabbitMQ),
- procesamiento asincrono e idempotente de eventos,
- almacenamiento de objetos para imagenes,
- despliegue automatizado y orquestacion de contenedores.

## Observabilidad

Docker Compose incluye Prometheus, Grafana y Zipkin. Las solicitudes reciben
`X-Correlation-ID`, los clientes internos propagan el contexto y los eventos de
pedidos, stock y envios generan metricas y logs correlacionados sin datos
personales. Consulte [OBSERVABILITY.md](docs/OBSERVABILITY.md) para usar los
paneles y seguir un pedido completo.

## Documentacion operativa

- [Backup y restauracion](docs/BACKUP_RESTORE.md)
- [Metricas, trazas y logs](docs/OBSERVABILITY.md)
- [Roadmap general](../ROADMAP_PLANTILLA_ECOMMERCE.md)
- [Normativa y estandares](../NORMATIVA_Y_ESTANDARES.md)
