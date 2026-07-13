# Explicacion para el grupo - SmartLogix

Este documento resume lo nuevo del proyecto con palabras simples y tecnicas, para que todos puedan explicar que se hizo y donde esta el codigo.

## 1. Inventario mejorado

El inventario ya no guarda solo SKU, nombre y stock. Ahora tambien trabaja con imagen, categoria, bodega y ubicacion fisica.

Campos importantes:

- `imageUrl`: imagen del producto.
- `category`: categoria, por ejemplo Perifericos, Monitores o Notebooks.
- `warehouseCode`: bodega donde esta el producto.
- `locationZone`, `locationAisle`, `locationRack`, `locationLevel`, `locationPosition`: ubicacion exacta dentro de la bodega.
- `availableQuantity`: stock disponible.
- `reservedQuantity`: unidades reservadas por pedidos.
- `reorderLevel`: nivel minimo para marcar stock bajo.

Ubicacion principal:

- Backend: `smartlogix-back/inventory-service`
- Frontend: `smartlogix-front/src/pages/InventoryPage.jsx`
- Utilidades de ubicacion: `smartlogix-front/src/utils/inventoryLocationUtils.js`

## 2. Vista 3D de bodega

Se agrego una vista 3D usando Three.js. Esta pantalla permite ver una bodega con pasillos, racks, cajas, etiquetas y productos seleccionables.

Que permite hacer:

- Buscar por nombre, SKU o ubicacion.
- Cambiar automaticamente a la bodega donde esta el producto.
- Ver zona, pasillo, rack, nivel y posicion.
- Seleccionar productos desde el mapa 3D.
- Ver stock disponible, reservado, categoria e imagen.

Archivo principal:

- `smartlogix-front/src/components/Warehouse3DExplorer.jsx`

Optimizacion:

- La vista 3D se carga con `React.lazy` y `Suspense`.
- Esto separa Three.js del bundle inicial para que la app no cargue todo el 3D de inmediato.

Archivo donde se integra:

- `smartlogix-front/src/pages/InventoryPage.jsx`

## 3. Pedidos mas logicos

Antes crear un pedido dependia de escribir el SKU manualmente. Ahora hay un catalogo de productos disponibles dentro de pedidos.

Que mejora:

- El usuario busca productos por nombre, SKU, categoria o bodega.
- Puede ver imagen, stock disponible y ubicacion.
- Selecciona el producto con un boton.
- El formulario se llena con el SKU seleccionado.

Archivo principal:

- `smartlogix-front/src/pages/OrderPage.jsx`

Backend relacionado:

- `smartlogix-back/order-service`

## 4. Flujo pedido-envio

Cuando se crea un pedido aprobado:

1. El backend revisa stock disponible.
2. Reserva unidades en inventario.
3. Crea un envio asociado.
4. Guarda el tracking en el pedido.
5. El frontend muestra estado legible como `Envio solicitado`.

Codigo clave:

- Servicio de pedidos: `smartlogix-back/order-service/src/main/java/com/smartlogix/order/service/OrderService.java`
- Cliente de inventario: `smartlogix-back/order-service/src/main/java/com/smartlogix/order/client/InventoryClient.java`
- Cliente de envios: `smartlogix-back/order-service/src/main/java/com/smartlogix/order/client/ShipmentClient.java`
- Servicio de envios: `smartlogix-back/shipment-service`

## 5. Correccion importante al eliminar pedidos

Se corrigio un problema de flujo: si se eliminaba un pedido con stock reservado, podia quedar stock reservado fantasma y un envio huerfano.

Ahora al eliminar un pedido aprobado:

- Se liberan las unidades reservadas en inventario.
- Se elimina el envio asociado si tenia tracking.
- Se borra la orden.

Esto esta en:

- `smartlogix-back/order-service/src/main/java/com/smartlogix/order/service/OrderService.java`
- `smartlogix-back/order-service/src/main/java/com/smartlogix/order/client/ShipmentClient.java`

## 6. Seguridad

La seguridad se basa en JWT y roles.

Roles principales:

- `ROLE_ADMIN`: puede gestionar inventario, usuarios, pedidos, envios y auditoria.
- `ROLE_WAREHOUSE_MANAGER`: puede gestionar inventario y movimientos.
- `ROLE_USER`: puede ver inventario y crear pedidos.

Puntos importantes:

- El frontend oculta acciones segun rol.
- El backend tambien bloquea rutas segun rol.
- Las llamadas internas entre servicios usan JWT interno cuando corresponde.
- Las passwords semilla se manejan por variables de entorno con fallback para desarrollo.

Archivos clave:

- Gateway: `smartlogix-back/api-gateway`
- Auth: `smartlogix-back/auth-service`
- Filtros JWT: archivos `JwtAuthenticationFilter.java` en cada servicio.

## 7. Tests agregados

Se agregaron tests unitarios para el flujo de pedidos.

Prueban que:

- Crear un pedido reserva stock.
- Crear un pedido solicita envio.
- Eliminar un pedido libera la reserva.
- Eliminar un pedido borra el envio asociado.

Archivo:

- `smartlogix-back/order-service/src/test/java/com/smartlogix/order/service/OrderServiceTest.java`

Comando:

```powershell
cd smartlogix-back
.\mvnw.cmd -pl order-service -am test
```

## 8. Como explicar la idea general

SmartLogix ahora simula un flujo logistico mas completo:

1. El inventario sabe donde esta fisicamente cada producto.
2. El usuario puede encontrar productos visualmente en una bodega 3D.
3. El cliente crea pedidos desde un catalogo, sin memorizar SKU.
4. El backend valida stock y reserva unidades.
5. Se genera un envio con tracking.
6. Si se elimina el pedido, el sistema limpia reserva y envio para no dejar datos inconsistentes.

La idea fuerte para defender es esta:

> No es solo una pantalla bonita. La vista 3D se conecta con datos reales de inventario, pedidos y stock reservado.
