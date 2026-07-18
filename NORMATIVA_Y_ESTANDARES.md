# Normativa y estandares aplicables a SmartLogix

Fecha de revision: 18 de julio de 2026.

Este documento es una guia de ingenieria para desarrollar SmartLogix como
plantilla ecommerce, administracion interna y POS en Chile. No reemplaza una
revision legal, tributaria ni una certificacion formal. Antes de operar con
clientes reales se debe confirmar el alcance con profesionales competentes.

## Regla general de cumplimiento

Cada funcionalidad nueva debe revisar, segun corresponda:

1. privacidad y proteccion de datos personales;
2. derechos del consumidor y comercio electronico;
3. seguridad, autorizacion, auditoria y respuesta a incidentes;
4. accesibilidad y calidad del software;
5. obligaciones tributarias y documentales;
6. seguridad de medios de pago y proveedores externos.

No se debe declarar que SmartLogix esta certificado o cumple completamente una
norma solo por usar esta lista. La conformidad requiere evidencia, pruebas,
procesos operativos y, cuando corresponda, una evaluacion independiente.

## Normativa chilena

### Proteccion de datos personales

Referencias:

- [Ley 19.628 vigente](https://www.bcn.cl/leychile/Navegar?idNorma=141599)
- [Ley 21.719](https://www.bcn.cl/leychile/Navegar?idNorma=1209272)

La Ley 19.628 se mantiene como referencia vigente hasta el 30 de noviembre de
2026. La Ley 21.719 entra en vigencia el 1 de diciembre de 2026 y moderniza el
regimen de proteccion de datos personales.

Controles que la plantilla debe incorporar:

- aviso de privacidad claro antes de recolectar datos;
- base que legitime cada tratamiento y consentimiento demostrable cuando aplique;
- recoleccion de los datos estrictamente necesarios;
- finalidades, plazos de conservacion y eliminacion documentados;
- acceso, rectificacion, supresion, oposicion, portabilidad y demas derechos aplicables;
- exportacion y eliminacion de la cuenta mediante un flujo seguro;
- medidas de seguridad para datos en transito y almacenados;
- registro y gestion de incidentes que afecten datos personales;
- contratos y evaluacion de proveedores que procesen datos;
- privacidad desde el diseno y configuraciones protectoras por defecto.

### Consumidores y comercio electronico

Referencias:

- [Texto refundido de la Ley 19.496](https://www.bcn.cl/leychile/Navegar?idNorma=1160403)
- [Decreto 6 sobre comercio electronico](https://www.bcn.cl/leychile/Navegar?idNorma=1165504)
- [Decreto 52 sobre excepciones al retracto](https://www.bcn.cl/leychile/Navegar?idNorma=1206144)

La tienda debe presentar antes de confirmar la compra:

- identidad y contacto del vendedor;
- caracteristicas esenciales y disponibilidad real del producto;
- precio total, descuentos, impuestos, despacho y otros cargos;
- condiciones, restricciones y vigencia de promociones;
- plazo, modalidad y direccion de entrega o retiro;
- condiciones de retracto, cambios, devoluciones y garantia legal;
- resumen final y una accion inequivoca para confirmar la compra;
- comprobante durable con el detalle y estado del pedido.

Los terminos no deben eliminar derechos irrenunciables del consumidor. Los
flujos de cancelacion, devolucion y reembolso deben conservar evidencia y
mantener sincronizados pago, pedido, envio e inventario.

### Documentos electronicos

Referencia:

- [Ley 19.799](https://www.bcn.cl/leychile/Navegar?idNorma=196640)

Cuando SmartLogix genere contratos, aceptaciones o documentos que requieran
firma, se debe determinar si basta una firma electronica simple o si corresponde
firma electronica avanzada. Los registros deben proteger autoria, integridad,
fecha y trazabilidad.

### Delitos informaticos y ciberseguridad

Referencias:

- [Ley 21.459 sobre delitos informaticos](https://www.bcn.cl/leychile/Navegar?idNorma=1177743)
- [Ley Marco de Ciberseguridad 21.663](https://www.bcn.cl/leychile/Navegar?idNorma=1202434)

La aplicacion debe aplicar acceso autorizado, minimo privilegio, proteccion de
credenciales, logs de seguridad y evidencia de auditoria. Las pruebas nunca
deben realizar acceso, interceptacion o alteracion de sistemas sin autorizacion.

La Ley 21.663 no se presume aplicable automaticamente a todo ecommerce. Antes
de produccion se debe evaluar si la organizacion queda dentro de sus entidades
obligadas. Sus principios de gestion de riesgos, continuidad y respuesta a
incidentes se adoptan igualmente como buena practica.

### Accesibilidad e inclusion

Referencias:

- [Ley 20.422](https://www.bcn.cl/leychile/Navegar?idNorma=1010903)
- [Decreto 1 de 2015](https://www.bcn.cl/leychile/Navegar?idNorma=1078308)

La Ley 20.422 establece principios de accesibilidad universal, diseno universal
y no discriminacion. El Decreto 1 se dirige a sistemas y sitios web de organos
del Estado; SmartLogix lo utiliza como referencia tecnica y no afirma que su
alcance sea identico para una tienda privada.

La meta tecnica de la plantilla sera WCAG 2.2 nivel AA, con navegacion por
teclado, foco visible, semantica correcta, alternativas textuales, contraste,
mensajes comprensibles y compatibilidad con tecnologias de asistencia.

### Documentos tributarios

Referencia:

- [Boleta electronica del SII](https://www.sii.cl/destacados/boletas_electronicas/)

El comprobante actual de SmartLogix es demostrativo y no reemplaza una boleta o
factura tributaria. Antes de vender realmente se debe integrar la emision
tributaria autorizada por el SII, conservar los documentos y distinguir el
comprobante de transferencia del documento tributario.

## Estandares internacionales de ingenieria

### Seguridad de la informacion

- [ISO/IEC 27001:2022](https://www.iso.org/standard/27001): marco para gestionar
  riesgos de confidencialidad, integridad y disponibilidad. Se usara como guia
  de riesgos, activos, controles, incidentes, continuidad y mejora continua.
- [OWASP ASVS 5.0](https://owasp.org/www-project-application-security-verification-standard/):
  requisitos verificables para autenticacion, sesiones, autorizacion, datos,
  API, archivos, configuracion y registro de seguridad.
- [OWASP Top 10:2025](https://owasp.org/www-project-top-ten/): referencia de
  concientizacion para riesgos web, sin reemplazar ASVS ni las pruebas.

### Calidad del producto

- [ISO/IEC 25010:2023](https://www.iso.org/standard/78176.html): modelo para
  especificar y evaluar calidad del software. SmartLogix lo aplicara a
  adecuacion funcional, eficiencia de desempeno, compatibilidad, capacidad de
  interaccion, confiabilidad, seguridad, mantenibilidad, flexibilidad y
  seguridad operacional.

### Accesibilidad web

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/): objetivo de conformidad AA para
  tienda, checkout, cuenta, administracion, POS y vista de bodegas.

El boton de accesibilidad sera una ayuda de personalizacion. No sustituye el
cumplimiento estructural ni las pruebas manuales con teclado y lector de
pantalla.

### Seguridad de pagos

- [PCI DSS 4.0.1](https://www.pcisecuritystandards.org/document_library/?class=pcidss&doc=pci_dss):
  aplicable al entorno que almacena, procesa o transmite datos de tarjetas.

La estrategia recomendada es usar un proveedor de pago con checkout alojado o
tokenizacion. SmartLogix no debe guardar PAN completo, CVV ni credenciales de
tarjeta. La integracion debe verificar firmas de webhooks, evitar cobros
duplicados y registrar estados sin exponer datos sensibles.

## Estado actual del proyecto

### Implementado

- [x] JWT y autorizacion por roles verificada en backend.
- [x] Privilegio minimo en la comunicacion interna de pedidos y envios.
- [x] Secretos y contrasenas semilla fuera del codigo y fuera de Git.
- [x] CORS limitado a origenes configurados por entorno.
- [x] Pedidos privados por cliente y operaciones administrativas protegidas.
- [x] Liberacion de inventario y reembolso simulado al cancelar.
- [x] Pagos demostrativos sin almacenar datos reales de tarjetas.
- [x] Pruebas de permisos, stock, pedidos y envios.
- [x] PostgreSQL persistente con migraciones versionadas y usuarios separados.

### Pendiente antes de produccion

- [ ] Publicar politica de privacidad, terminos de venta y politica de cookies.
- [ ] Registrar consentimientos, finalidades y versiones de los textos aceptados.
- [ ] Implementar exportacion, rectificacion y eliminacion segura de datos.
- [ ] Definir retencion, anonimizado y eliminacion de registros.
- [ ] Incorporar recuperacion segura, verificacion de correo y MFA para admins.
- [ ] Agregar limite de intentos, proteccion antiabuso y gestion de sesiones.
- [ ] Implementar logs centralizados, alertas y plan de respuesta a incidentes.
- [ ] Revisar dependencias, imagenes Docker y vulnerabilidades en CI.
- [ ] Integrar boleta o factura electronica y flujo formal de garantia/retracto.
- [ ] Usar proveedor de pagos real sin almacenar datos de tarjeta.
- [ ] Completar auditoria WCAG 2.2 AA automatizada y manual.
- [ ] Crear respaldos cifrados, restauracion probada y plan de continuidad.
- [ ] Evaluar legalmente el alcance de las leyes 21.663 y 21.719.

## Evidencia exigida por cada entrega

Para marcar una funcionalidad como terminada se debe conservar:

- historia o requisito con criterios de aceptacion;
- analisis de datos personales y permisos involucrados;
- pruebas unitarias, de integracion y del flujo critico correspondiente;
- revision de errores, logs y casos de acceso no autorizado;
- prueba responsive y de teclado cuando exista interfaz;
- documentacion de configuracion, migracion y operacion;
- commit pequeno, descriptivo y sin secretos;
- actualizacion de esta matriz cuando cambie el alcance normativo.
