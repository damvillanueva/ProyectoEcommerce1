# Observabilidad local de SmartLogix

SmartLogix incluye metricas, trazas distribuidas y logs correlacionados para
seguir una operacion desde el API Gateway hasta pedidos, inventario y envios.

## Paneles

Con `docker compose up --build -d` se levantan:

- Grafana: `http://127.0.0.1:3000`
- Prometheus: `http://127.0.0.1:9090`
- Zipkin: `http://127.0.0.1:9411`

Grafana carga automaticamente el tablero `SmartLogix - Operacion`, con estado
de los servicios, solicitudes, latencia p95, errores 5xx, pedidos, operaciones
de inventario y memoria JVM. Su acceso anonimo es solo de lectura y los tres
puertos estan enlazados a `127.0.0.1`; esta configuracion es para desarrollo
local, no para publicar directamente en Internet.

## Identificador de correlacion

El gateway acepta `X-Correlation-ID` solo si contiene entre 8 y 128 caracteres
seguros (`A-Z`, `a-z`, numeros, punto, guion, guion bajo o dos puntos). Cuando no
se envia o es invalido, genera un UUID. El mismo valor:

1. vuelve en la respuesta HTTP;
2. se propaga desde pedidos hacia inventario y envios;
3. aparece como `correlation_id` en los logs de los servicios.

Ejemplo:

```powershell
$headers = @{ "X-Correlation-ID" = "demo-pedido-001" }
Invoke-WebRequest http://127.0.0.1:8080/api/catalog/products -Headers $headers
```

Para buscar la operacion:

```powershell
docker compose logs api-gateway order-service inventory-service shipment-service |
  Select-String "demo-pedido-001"
```

Los logs usan campos estables: fecha, nivel, servicio, `trace_id`, `span_id`,
`correlation_id`, logger y mensaje. Los eventos de negocio evitan registrar
correo, direccion, documento o datos de pago del cliente.

## Metricas

Cada servicio expone `/actuator/prometheus` dentro de la red de Docker.
Prometheus consulta los seis servicios cada 15 segundos y conserva siete dias
de datos locales. Ademas de metricas HTTP, JVM y base de datos, se registran:

- `smartlogix_orders_submitted_total`
- `smartlogix_orders_approved_total`
- `smartlogix_orders_rejected_total`
- `smartlogix_orders_cancelled_total`
- `smartlogix_payments_processed_total`
- `smartlogix_inventory_operations_total`
- `smartlogix_shipments_planned_total`
- `smartlogix_shipments_status_updates_total`

## Trazas

Micrometer Tracing propaga el contexto entre el gateway y los clientes HTTP
creados por Spring. Zipkin permite abrir una traza y ver cuanto demoro cada
servicio durante un pedido. En desarrollo se usa muestreo `1.0` para que la
demostracion sea predecible; en produccion debe reducirse con
`SMARTLOGIX_TRACING_SAMPLE_RATE`, por ejemplo a `0.10`.

## Comprobaciones rapidas

```powershell
docker compose ps
Invoke-RestMethod http://127.0.0.1:9090/api/v1/targets
Invoke-RestMethod http://127.0.0.1:9411/api/v2/services
```

Prometheus debe mostrar los trabajos `smartlogix-*` en estado `up`. Luego de
usar la tienda o crear un pedido, Zipkin debe listar `api-gateway`,
`order-service`, `inventory-service` y `shipment-service`.
