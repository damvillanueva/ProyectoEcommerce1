# Guia de demo - SmartLogix

Objetivo: mostrar que el sistema no solo tiene pantallas, sino un flujo completo entre inventario, pedidos y envios.

## Preparacion

Levantar backend:

```powershell
cd smartlogix-back
docker compose up -d --build
```

Levantar frontend:

```powershell
cd smartlogix-front
npm run dev
```

URL recomendada:

```txt
http://127.0.0.1:5174
```

Usuario demo:

```txt
admin / admin123
```

## Paso 1: Login

Entrar como `admin`.

Que decir:

> Entramos como administrador para poder revisar inventario, pedidos, envios y usuarios. El sistema usa JWT y roles.

## Paso 2: Inventario general

Ir a `Inventario`.

Mostrar:

- Productos con imagen.
- Categoria.
- Bodega.
- Stock disponible.
- Stock reservado.
- Estado OK o stock bajo.

Que decir:

> El inventario ahora maneja informacion visual y logistica: imagen del producto, categoria, bodega y ubicacion fisica.

## Paso 3: Vista 3D de bodega

En la vista 3D, buscar:

```txt
SKU-3001
```

Resultado esperado:

- Cambia a Bodega Valparaiso.
- Muestra `WH-VAP-02-MC-R1-N2-P3`.
- Producto: Monitor 24 Pulgadas.
- Panel lateral con zona, pasillo, rack, nivel y posicion.

Que decir:

> Esta vista no es solo decorativa. Usa los datos reales del inventario para ubicar el producto en una bodega visual. Si el producto esta en otra bodega, el sistema cambia automaticamente a esa bodega.

## Paso 4: Buscar producto por nombre

Buscar:

```txt
mouse
```

Resultado esperado:

- Cambia a Bodega Santiago.
- Producto: Mouse Inalambrico.
- Muestra su ubicacion dentro del rack.

Que decir:

> Esto resuelve el problema de que un usuario no siempre sabe el SKU. Puede buscar por nombre y el sistema muestra donde esta fisicamente.

## Paso 5: Crear pedido desde catalogo

Ir a `Pedidos`.

En catalogo buscar:

```txt
Monitor
```

Seleccionar `Monitor 24 Pulgadas`.

Completar:

```txt
Nombre cliente: Cliente Demo Profesor
Email cliente: demo.profesor@smartlogix.cl
Direccion envio: Av. Demo 123
Comuna envio: Providencia
Cantidad: 1
Precio unitario: 45990
```

Crear pedido.

Resultado esperado:

- Pedido creado.
- Estado: `Envio solicitado`.
- Tracking visible.
- Comuna visible.

Que decir:

> Antes era poco logico escribir SKU manualmente. Ahora el pedido se arma desde el catalogo de inventario, viendo producto, stock y ubicacion.

## Paso 6: Revisar envio generado

Ir a `Envios`.

Buscar visualmente el ultimo tracking generado.

Resultado esperado:

- Aparece el envio.
- Muestra pedido asociado.
- Comuna `Providencia`.
- Direccion `Av. Demo 123`.
- Estado planificado.

Que decir:

> El pedido se conecta con envios. Al aprobarse, el backend crea automaticamente un despacho y devuelve un tracking.

## Paso 7: Mostrar impacto en stock

Volver a `Inventario`.

Buscar:

```txt
SKU-3001
```

Resultado esperado:

- `Reservado` sube en 1.
- `Disponible` baja en 1.

Que decir:

> El pedido no queda aislado. Reserva stock real del inventario para evitar vender unidades que ya estan comprometidas.

## Paso 8: Eliminar pedido y limpiar datos

Volver a `Pedidos`.

Eliminar el pedido de prueba.

Resultado esperado:

- Pedido desaparece.
- La reserva se libera.
- El envio asociado se elimina.

Que decir:

> Se corrigio la limpieza del flujo. Al eliminar un pedido aprobado, el sistema libera inventario y elimina el envio asociado, evitando stock fantasma o tracking huerfano.

## Paso 9: Seguridad

Explicar sin cambiar pantalla:

> La seguridad esta repartida en frontend y backend. El frontend oculta acciones segun rol, pero lo importante es que el backend tambien valida JWT y permisos. Admin puede gestionar todo, bodeguero gestiona inventario y usuario puede crear pedidos.

## Cierre recomendado

Frase final:

> La mejora principal es que SmartLogix ahora conecta inventario, ubicacion fisica, pedidos y envios. La bodega 3D ayuda a visualizar donde esta cada producto, pero el valor real es que esta conectada con stock, reservas y tracking.

## Validaciones para mencionar

```powershell
cd smartlogix-front
npm run lint
npm run build
```

```powershell
cd smartlogix-back
.\mvnw.cmd -pl order-service -am test
```
