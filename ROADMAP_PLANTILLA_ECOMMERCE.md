# Roadmap de plantilla ecommerce SmartLogix

Objetivo: convertir SmartLogix en una base reutilizable para futuros ecommerce,
con tienda online, administracion interna, inventario, bodegas y punto de venta.

## Criterio transversal de cumplimiento

Todas las fases se revisaran contra `NORMATIVA_Y_ESTANDARES.md`. Una mejora no
se considerara lista solo porque funcione visualmente: tambien debe respetar
privacidad, permisos, derechos del consumidor, accesibilidad, trazabilidad y
calidad segun su alcance.

Cada cierre de bloque debe incluir pruebas, documentacion, revision para evitar
secretos y un commit con push al repositorio personal.

## Orden actual de prioridades

1. Boleta o factura e integracion tributaria real.
2. Pasarelas de pago y transportistas reales mediante adaptadores configurables.
3. Privacidad, terminos, cookies y consentimientos versionados.
4. Busqueda/paginacion de catalogo desde backend y almacenamiento real de imagenes.
5. Pruebas end-to-end y CI para impedir regresiones.
6. Fidelizacion, carritos abandonados y automatizaciones comerciales.
7. Limpieza final y arquitectura reutilizable, una vez cerrados los modulos.

El orden prioriza la integridad de los datos antes de agregar nuevos canales de
venta. Cada punto se cerrara en bloques pequenos con su propio commit y push.

## Fase 1 - Seguridad de configuracion

- [x] Exigir `JWT_SECRET` en todos los microservicios.
- [x] Eliminar contrasenas semilla predeterminadas del codigo.
- [x] Restringir CORS a origenes definidos por entorno.
- [x] Mantener `.env` fuera de Git y publicar solo `.env.example`.
- [x] Usar privilegio minimo entre pedidos y envios.
- [x] Agregar recuperacion de contrasena y verificacion de correo.
- [x] Agregar limite de intentos y bloqueo temporal de login.
- [x] Implementar access token corto con renovacion segura y cookie HttpOnly.

## Fase 2 - Persistencia y operacion

- [x] Reemplazar H2 en memoria por PostgreSQL local con Docker.
- [x] Crear migraciones de base de datos con Flyway.
- [x] Separar perfiles `dev`, `test` y `prod`.
- [x] Agregar respaldos y restauracion verificada con manifiesto y hashes.
- [x] Convertir los datos semilla en una opcion explicita por entorno.
- [x] Incorporar logs estructurados, metricas y trazabilidad por pedido.

PostgreSQL puede ejecutarse localmente en Docker sin pagar un servicio externo.

## Fase 3 - Bodegas reales

- [x] Crear entidad, migracion, API y panel CRUD de bodegas.
- [x] Administrar zonas, pasillos, racks, niveles y posiciones.
- [x] Impedir ubicaciones fisicas duplicadas.
- [x] Guardar stock del mismo SKU en varias bodegas.
- [x] Registrar traslados parciales con movimientos de origen y destino enlazados.
- [x] Seleccionar automaticamente la bodega de despacho por prioridad y disponibilidad.
- [x] Conectar la vista 3D con el nuevo modelo de stock por bodega.

## Fase 4 - Proveedores y compras

- [x] Crear proveedores, contactos y condiciones comerciales.
- [x] Asociar productos, costos y codigos de proveedor.
- [x] Crear ordenes de compra y estados de aprobacion.
- [x] Recibir mercaderia y aumentar stock mediante movimientos.
- [x] Calcular costo, margen y precio sugerido por producto asociado.
- [x] Generar alertas y propuestas de reposicion.

## Fase 5 - Punto de venta fisico

- [x] Crear modulo POS separado del ecommerce.
- [x] Buscar o escanear productos por SKU o QR.
- [x] Crear carrito de venta presencial.
- [x] Aceptar efectivo, tarjeta o transferencia simulada.
- [x] Descontar stock sin generar envio.
- [x] Administrar apertura, cierre y arqueo de caja.
- [x] Emitir comprobante de venta presencial.

## Fase 6 - Ecommerce avanzado

- [x] Agregar cambios, devoluciones y garantias posteriores al despacho.
- [x] Enviar notificaciones de compra, pago, envio y cancelacion.
- [ ] Agregar boleta o factura; el comprobante actual no es tributario.
- [ ] Integrar opcionalmente Webpay, Mercado Pago y transportistas reales.
- [ ] Agregar carritos abandonados, puntos y fidelizacion.
- [ ] Implementar busqueda, filtros y paginacion desde backend.
- [ ] Mover imagenes desde data URL a almacenamiento de archivos.
- [ ] Publicar privacidad, terminos, cookies y condiciones de compra versionadas.
- [ ] Registrar la aceptacion de textos y consentimientos aplicables.

## Fase 7 - Limpieza y arquitectura reutilizable

- [x] Separar rutas y motores pesados mediante carga diferida y chunks estables.
- [x] Cubrir permisos HTTP criticos y rechazo de tokens con firma alterada.
- [x] Actualizar dependencias frontend con correcciones compatibles.
- [ ] Detectar componentes, servicios, estilos y dependencias sin uso.
- [ ] Eliminar codigo duplicado y archivos del template inicial.
- [ ] Separar modulos compartidos de tienda, administracion y POS.
- [ ] Centralizar permisos, estados, formatos y manejo de errores.
- [ ] Dividir paginas grandes en componentes mantenibles.
- [ ] Estandarizar DTOs, nombres, validaciones y respuestas de API.
- [ ] Crear pruebas de integracion, contratos y flujos end-to-end.
- [ ] Agregar CI para lint, tests, build y auditoria de dependencias.

La limpieza se realizara cuando los modulos principales esten definidos para no
eliminar codigo que todavia pueda reutilizarse durante su construccion.

## Fase 8 - Responsive completo

- [x] Auditar login, tienda, dashboard, inventario, pedidos, envios, usuarios y descuentos.
- [x] Auditar detalle de producto, carrito, checkout, cuenta, movimientos y vista 3D.
- [x] Auditar POS cuando el modulo este implementado.
- [x] Definir navegacion movil por rol para el panel interno.
- [x] Completar navegacion movil especializada de tienda y cuenta.
- [x] Completar navegacion movil especializada de POS cuando exista el modulo.
- [x] Adaptar las tablas restantes a listas o vistas resumidas en pantallas pequenas.
- [x] Completar la revision responsive de tablas y modales criticos.
- [x] Probar el primer bloque en anchos de 320, 390, 768, 1024 y 1440 pixeles.
- [x] Probar el segundo bloque en esos cinco anchos, con sesiones reales de cliente y administrador.
- [x] Automatizar capturas, errores de consola y controles de desbordamiento.

## Fase 9 - Accesibilidad transversal

- [ ] Apuntar a WCAG 2.2 nivel AA en todas las variantes responsive.
- [ ] Corregir semantica HTML, etiquetas, foco y navegacion por teclado.
- [ ] Validar contraste, textos alternativos y nombres accesibles.
- [x] Respetar `prefers-reduced-motion` y permitir reducir animaciones manualmente.
- [ ] Agregar pruebas automatizadas con `axe-core` y Lighthouse.
- [ ] Realizar revision manual con teclado y lector de pantalla.
- [x] Crear un boton de accesibilidad propio, gratuito y reutilizable.
- [ ] Conservar evidencia de auditoria WCAG automatizada y manual.

El boton podra incluir:

- aumentar o disminuir texto;
- alto contraste;
- escala de grises;
- subrayar enlaces;
- fuente de lectura clara;
- reducir animaciones;
- cursor grande;
- foco reforzado;
- restablecer preferencias.

Las preferencias se guardaran localmente para tienda, administracion y POS. El
boton sera una ayuda de personalizacion, no un reemplazo de una interfaz bien
construida ni de las pruebas WCAG.

## Criterio para reutilizar la plantilla

Una nueva tienda deberia poder cambiar marca, colores, catalogo, bodegas,
transportistas, medios de pago y reglas comerciales mediante configuracion, sin
reescribir autenticacion, carrito, checkout, inventario, cuenta o POS.
