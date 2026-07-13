# Mejoras personales SmartLogix

Base copiada desde la entrega grupal y separada para seguir iterando sin tocar la rama del equipo.

## Hecho en esta copia

- [x] Copia limpia de `smartlogix-back` y `smartlogix-front` sin `.git`, `target`, `dist` ni `node_modules` originales.
- [x] Campo `imageUrl` en productos de inventario.
- [x] Seed de inventario con imagenes de ejemplo.
- [x] Formulario de inventario permite ingresar URL de imagen.
- [x] Tabla de inventario muestra miniatura del producto.
- [x] Historial de movimientos muestra miniatura del producto cuando el SKU existe en inventario.
- [x] Panel de detalle del historial muestra imagen del producto.
- [x] Alerta visual de stock bajo segun `reorderLevel`.
- [x] Badge de estado por producto: `OK` o `Stock bajo`.
- [x] Boton `Movimientos` en cada producto del inventario.
- [x] Apertura de historial filtrado automaticamente por SKU desde inventario.
- [x] Filtros reales de cantidad en backend para historial y exportacion CSV.
- [x] Modal de detalle completo por producto con stock, imagen e historial asociado.
- [x] Exportacion mejorada con CSV nombrado por filtros y archivo Excel del historial filtrado.
- [x] Guardar historial real en backend con usuario, filtros, fecha y total de movimientos.
- [x] Auditoria de inventario con usuario, rol, IP, accion, producto y fecha.
- [x] Permisos mas finos: usuario ve inventario en modo lectura, admin/bodega gestionan y admin audita/elimina.
- [x] Toasts visuales de exito/error en inventario e historial.
- [x] Modal propio de confirmacion para eliminar productos.
- [x] Categorias de productos con selector, filtro y visualizacion en detalle.
- [x] Bodegas multiples visuales completas: selector, filtro, resumen separado, mapa visual por bodega, productos por ubicacion, categorias, stock disponible/reservado y alertas criticas.
- [x] Subida simple de imagen desde archivo en el formulario de inventario, guardada como data URL.
- [x] Campo de imagen del backend ampliado con `@Lob` para aceptar imagenes embebidas.
- [x] QR escaneable por SKU en tabla, detalle y modal imprimible, con respaldo visual local.
- [x] Motivos predefinidos para movimientos manuales.
- [x] Historial con ordenamiento por fecha, producto, SKU, tipo, cantidad, stock y usuario.
- [x] Vista timeline para explicar movimientos por producto de forma visual.
- [x] Dashboard de inventario con productos criticos, movimientos del dia, stock por bodega y top productos con movimiento.
- [x] Validacion backend para impedir stock disponible menor al reservado.
- [x] Tests unitarios backend para reglas de SKU duplicado normalizado y stock reservado.
- [x] `npm audit --omit=dev` sin vulnerabilidades de produccion conocidas.
- [x] Flujo pedido-envio corregido: comuna separada en pedidos/envios, estado legible y sincronizacion segura del destino del envio al editar un pedido.
- [x] Localizador de productos en bodegas: busqueda por nombre, SKU, bodega o ubicacion, con zona, pasillo, rack, nivel y producto resaltado.
- [x] Ubicacion fisica real en backend de inventario: zona, pasillo, rack, nivel y posicion.
- [x] Crear pedido mas logico: catalogo de inventario con buscador, imagen, stock disponible, bodega, ubicacion y boton para elegir producto sin escribir SKU manualmente.

## Siguientes mejoras recomendadas

1. Subida real de imagenes
   - Reemplazar URL manual por carga de archivo.
   - Guardar imagen local o en un servicio externo.
   - Validar tipo y tamano de archivo.
   - Estado: implementado en modo demo con archivo convertido a data URL. Pendiente solo almacenamiento externo si se quisiera produccion.

2. Historial filtrado por producto
   - Boton en cada producto: `Ver movimientos`.
   - Abrir `/inventory/movements` con el SKU ya filtrado.
   - Estado: implementado con el boton `Movimientos` y query param `?product=SKU`.

3. Filtros de cantidad en backend
   - Agregar `minQuantity` y `maxQuantity` al endpoint de movimientos.
   - Evitar filtrar solo la pagina visible en frontend.
   - Estado: implementado en backend y conectado al frontend.

4. Dashboard de inventario
   - Total de productos.
   - Productos con stock bajo.
   - Movimientos del dia.
   - Top productos con mas movimientos.
   - Estado: implementado en dashboard con stock por bodega, productos criticos, movimientos del dia y ranking por movimientos.

5. Detalle de producto mas completo
   - Vista con SKU, bodega, stock, reservado, disponible, nivel de reposicion e imagen.
   - Historial asociado con ultimos movimientos del SKU.
   - Estado: implementado como modal desde el boton `Detalle`.

6. Modal de confirmacion propio
   - Reemplazar `window.confirm`.
   - Mantener estilo visual de SmartLogix.
   - Estado: implementado para eliminar productos desde inventario.

7. Toasts de exito/error
   - Mostrar mensajes temporales al crear, editar, eliminar o registrar movimientos.
   - Estado: implementado con `ToastStack` y `useToasts`.

8. Categorias de productos
   - Agregar campo `category`.
   - Filtrar inventario por categoria.
   - Estado: implementado en backend, formulario, tabla, filtro y detalle.

9. Bodegas multiples
   - Mejorar `warehouseCode` con selector.
   - Ver stock por bodega.
   - Estado: implementado completo a nivel visual: selector, filtro, panel separado por bodega, mapa visual por ubicacion, productos dentro de cada bodega, categorias, stock total, disponible, reservado, productos criticos, barra de capacidad visual y acciones rapidas de detalle/QR.
   - Pendiente solo si se quisiera nivel produccion: tabla propia de bodegas, CRUD de bodegas, movimientos de traslado entre bodegas y stock separado por SKU/bodega en backend.

9.1. Etiquetas por SKU
   - Generar QR escaneable por SKU.
   - Mostrarlo en tabla, detalle y modal imprimible.
   - Estado: implementado con libreria local `qrcode` y respaldo visual autocontenido.

10. Exportacion mejorada
   - Agregar Excel o PDF.
   - Incluir filtros aplicados en el nombre del archivo.
   - Estado: implementado con descarga CSV y Excel usando fecha y filtros activos.

11. Guardar historial real
   - Registrar en backend el reporte guardado desde la pantalla.
   - Guardar usuario, filtros aplicados, fecha y total de movimientos.
   - Estado: implementado con endpoint `/api/inventory/movements/reports`.

12. Auditoria de usuarios
   - Registrar quien crea, edita o elimina productos.
   - Mostrar usuario, rol, IP, fecha, accion, SKU y detalle.
   - Estado: implementado con endpoint `/api/inventory/audit` visible para admin.

13. Permisos mas finos
   - Admin: puede gestionar inventario, eliminar, ver auditoria y movimientos.
   - Bodeguero: puede crear/editar inventario y registrar movimientos, sin eliminar ni auditar.
   - Usuario: puede entrar al inventario en modo lectura y usar pedidos.
   - Estado: implementado en rutas, menu y acciones visibles del frontend; backend mantiene bloqueo por rol.

14. Tests
    - Tests backend para `imageUrl`.
    - Tests de seguridad de movimientos.
    - Tests de reglas de stock bajo.
    - Estado: agregados tests unitarios para SKU duplicado normalizado y stock disponible menor al reservado.

15. Localizador de bodega y pedidos por catalogo
    - Buscar productos por nombre, SKU, bodega o ubicacion.
    - Mostrar zona, pasillo, rack, nivel y posicion.
    - Resaltar el producto dentro del mapa visual de bodegas.
    - Crear pedidos desde productos disponibles del inventario sin depender de memorizar SKU.
    - Estado: implementado en frontend y backend. La ubicacion fisica ahora se guarda como datos reales del producto y mantiene calculo de respaldo si faltan datos antiguos.

## Validacion actual

- Backend: `.\mvnw.cmd -pl inventory-service -am test` OK.
- Backend: `.\mvnw.cmd -pl order-service -am test` OK.
- Frontend: `npm.cmd run build` OK.
- Nota: Vite mantiene advertencia de bundle mayor a 500 KB; no bloquea.
