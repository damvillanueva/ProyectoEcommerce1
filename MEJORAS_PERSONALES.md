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

## Siguientes mejoras recomendadas

1. Subida real de imagenes
   - Reemplazar URL manual por carga de archivo.
   - Guardar imagen local o en un servicio externo.
   - Validar tipo y tamano de archivo.

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

9. Bodegas multiples
   - Mejorar `warehouseCode` con selector.
   - Ver stock por bodega.

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

## Validacion actual

- Backend: `.\mvnw.cmd -pl inventory-service -am test` OK.
- Frontend: `npm.cmd run build` OK.
- Nota: Vite mantiene advertencia de bundle mayor a 500 KB; no bloquea.
