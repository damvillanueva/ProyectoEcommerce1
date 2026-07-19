# Evolucion tecnica de SmartLogix

Registro de funcionalidades y mejoras incorporadas al proyecto de portafolio.

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
- [x] Vista 3D completa de bodega con Three.js: pasillos, racks, cajas, etiquetas, seleccion por clic, buscador global por SKU/nombre/ubicacion, filtros y panel de detalle.
- [x] Optimizacion frontend: la vista 3D se carga de forma diferida para separar Three.js del bundle inicial.
- [x] Correccion de flujo pedido-envio: al eliminar un pedido aprobado se libera la reserva de inventario y se elimina el envio asociado.
- [x] Lint frontend limpio con `npm run lint`.
- [x] Tests unitarios de `order-service` para reserva, envio y limpieza al eliminar pedido.
- [x] Traslado avanzado entre bodegas desde el detalle del producto, manteniendo stock y reservas.
- [x] Documentacion tecnica y guion de demostracion del flujo completo.
- [x] Checkout ecommerce con carrito separado, despacho/retiro, descuentos y pagos simulados.
- [x] Cuenta de cliente con perfil, direcciones, favoritos, compras y seguimiento privado.
- [x] Catalogo con detalle, resenas, preguntas y productos relacionados.
- [x] Cancelacion segura de pedidos con liberacion de inventario y reembolso simulado.
- [x] Seguridad interna de envios con `ROLE_ORDER_SERVICE` y pruebas de permisos.
- [x] Secretos JWT, CORS y contrasenas semilla movidos a variables de entorno obligatorias.
- [x] Plantilla publica `.env.example` y archivo `.env` local ignorado por Git.
- [x] Matriz de normativa chilena y estandares internacionales aplicables.
- [x] PostgreSQL persistente con una base y credencial separada por microservicio.
- [x] Migraciones Flyway y validacion de entidades con `ddl-auto: validate`.
- [x] Perfiles `dev`, `test` y `prod` para los servicios persistentes.
- [x] Backup consistente de las cuatro bases con manifiesto, retencion y SHA-256.
- [x] Restauracion completa probada con respaldo previo y propietarios separados.
- [x] Sesiones JWT vencidas se limpian y redirigen al login correspondiente.
- [x] Login sin exposicion del token en consola y con errores accesibles en pantalla.
- [x] Bloqueo temporal luego de cinco intentos fallidos, persistido aunque el login responda 401.
- [x] Recuperacion de contrasena mediante enlace de un solo uso y expiracion de 30 minutos.
- [x] Verificacion obligatoria de correo para nuevas cuentas de cliente.
- [x] Refresh token rotativo guardado como hash y enviado solo en cookie HttpOnly.
- [x] Revocacion de todas las sesiones al cambiar la contrasena.
- [x] Mailpit local para probar correos sin contratar un proveedor externo.
- [x] Prueba de escalamiento: un usuario que falsifica el rol en el navegador recibe 403.
- [x] Correlacion de solicitudes con `X-Correlation-ID` validado y propagado entre microservicios.
- [x] Trazabilidad distribuida con Micrometer Tracing y Zipkin.
- [x] Metricas Prometheus de HTTP, JVM, pedidos, pagos, inventario y envios.
- [x] Tablero Grafana local aprovisionado automaticamente y limitado a solo lectura.
- [x] Logs operativos con servicio, traza, span y correlacion, sin datos personales del cliente.

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
   - Estado backend: implementada tabla persistente de bodegas, migracion Flyway, API CRUD, validacion del plano fisico, bloqueo de eliminacion con productos y permisos por rol.
   - Estado frontend: implementado panel administrativo para crear, editar, activar, desactivar y eliminar bodegas; los selectores y resumen consumen la API real.
   - Pendiente: stock separado por SKU/bodega, ubicaciones unicas y traslados con movimientos de origen/destino.

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

16. Vista 3D de bodega
    - Renderizar una bodega navegable con pasillos A-F, racks 01-06, cajas y paredes usando Three.js.
    - Permitir rotar, hacer zoom, seleccionar productos desde el rack y alternar vista superior.
    - Buscar por nombre, SKU o ubicacion; si el producto esta en otra bodega, cambia automaticamente a esa bodega y muestra la ubicacion exacta.
    - Mostrar panel lateral con codigo de ubicacion, zona, pasillo, rack, nivel, posicion, imagen, categoria y stock disponible.
    - Estado: implementado en inventario con validacion visual desktop/movil.

16.1. Optimizacion de carga del 3D
    - Cargar `Warehouse3DExplorer` con `React.lazy` y `Suspense`.
    - Separar el codigo de Three.js en un chunk propio para no cargarlo junto al inicio de la app.
    - Estado: implementado. La build ahora genera un chunk independiente para `Warehouse3DExplorer`.

17. Limpieza correcta de pedidos
    - Al eliminar una orden con stock reservado, liberar las unidades reservadas en inventario.
    - Si la orden tenia tracking, eliminar tambien el envio asociado para evitar registros huerfanos.
    - Estado: implementado en `order-service` y validado por API local.

18. Calidad de codigo y documentacion
    - `npm run lint` pasa limpio en frontend.
    - Se agregaron tests unitarios en `order-service` para crear pedido, reservar stock, solicitar envio, eliminar pedido, liberar stock y borrar tracking.
    - Se mantiene documentacion de arquitectura, operacion y alcance del producto.

19. Traslado entre bodegas
    - Desde el modal de detalle se puede cambiar bodega, zona, pasillo, rack, nivel y posicion.
    - El traslado actualiza ubicacion sin modificar stock disponible ni reservado.
    - Estado: implementado como mejora avanzada viable usando la API actual de inventario.

## Validacion actual

- Backend: `.\mvnw.cmd -pl inventory-service -am test` OK.
- Backend: `.\mvnw.cmd -pl order-service -am test` OK.
- Frontend: `npm.cmd run build` OK.
- Frontend 3D: Playwright con Edge OK en desktop y movil; busqueda `SKU-3001` encontro `WH-VAP-02-MC-R1-N2-P3`; capturas con pixeles no vacios.
- Flujo pedido-envio: pedido creado desde catalogo con `SKU-3001`, comuna `Providencia`, estado legible y envio generado con tracking.
- Flujo borrar pedido: `ORD-5D401FAB` creo reserva/envio temporal, al eliminarlo el monitor volvio de disponible 44/reservado 1 a disponible 45/reservado 0 y el tracking desaparecio.
- Frontend: `npm.cmd run lint` OK.
- Backend: `.\mvnw.cmd -pl order-service -am test` OK con 2 tests unitarios.
- Nota: Vite mantiene advertencia de bundle mayor a 500 KB; no bloquea.

## Roadmap vigente

La continuacion para convertir SmartLogix en una plantilla completa de ecommerce,
administracion interna y punto de venta se encuentra en:

```txt
ROADMAP_PLANTILLA_ECOMMERCE.md
NORMATIVA_Y_ESTANDARES.md
```
