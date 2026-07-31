# SmartLogix Frontend

Interfaz React de SmartLogix. Incluye la tienda ecommerce, cuenta de cliente,
carrito y checkout, junto con el panel interno de inventario y logistica.

## Requisitos

- Node.js 20 o superior
- Backend SmartLogix disponible mediante API Gateway

## Configuracion

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

La variable `VITE_API_URL` permite apuntar el frontend a otro gateway. Su valor
local predeterminado es `http://localhost:8080`.

## Rutas principales

- `/shop`: catalogo publico.
- `/shop/cart`: carrito.
- `/shop/checkout`: checkout para clientes autenticados.
- `/shop/account`: perfil, direcciones, favoritos y compras.
- `/dashboard`: resumen interno.
- `/inventory`: inventario, bodegas y vista 3D.
- `/inventory/movements`: historial y auditoria.
- `/orders`, `/shipments`, `/users`, `/discounts`: operacion interna por rol.

## Validacion

```powershell
npm run lint
npm run build
npm run audit:accessibility
```

La auditoria responsive abre las rutas publicas, de cliente y administrativas
en cinco anchos, genera capturas y detecta desbordamiento horizontal y errores
de consola. Requiere que frontend y backend esten ejecutandose:

```powershell
$env:SMARTLOGIX_TEST_ADMIN_PASSWORD="<password-local>"
$env:SMARTLOGIX_TEST_CUSTOMER_PASSWORD="<password-local>"
npm run audit:responsive
```

Las evidencias quedan en `artifacts/responsive-audit/` y no se versionan. Se
puede cambiar la URL con `SMARTLOGIX_AUDIT_URL`, el canal del navegador con
`SMARTLOGIX_BROWSER_CHANNEL` o indicar un ejecutable mediante
`SMARTLOGIX_BROWSER_EXECUTABLE`. Para revisar solo ciertos anchos se puede usar
`SMARTLOGIX_AUDIT_WIDTHS="320,390"`; las capturas completas se activan con
`SMARTLOGIX_AUDIT_FULL_PAGE="true"`.

## Accesibilidad

El boton global ofrece seis perfiles de accesibilidad, lectura por voz, tamaño y
espaciado de texto, altura de linea, contraste, grises, saturacion, enlaces,
fuente legible, reduccion de movimiento, ocultar imagenes, cursor, foco, guia de
lectura y navegacion por la estructura de la pagina. Tambien permite agrandar,
mover u ocultar el widget; `Ctrl+U` lo abre o recupera.

Las preferencias se conservan en `localStorage` y se aplican por igual a tienda
y panel interno.

La auditoria comprueba perfiles, herramientas avanzadas, estructura navegable,
persistencia, mover/ocultar, atajo de recuperacion, cierre con `Escape`, retorno
del foco y reflow con texto al 150% en una pantalla de 320 pixeles. Este panel es
una ayuda de personalizacion y no reemplaza una auditoria integral WCAG 2.2 AA.

## Rendimiento

Las paginas se cargan por ruta mediante `React.lazy`. La tienda no descarga los
modulos administrativos al iniciar y los motores de mapas, QR y bodega 3D se
distribuyen en chunks independientes. Three.js se carga solo al abrir la vista
3D y Leaflet solo cuando se muestra el seguimiento de un envio.

## Dependencias

Las actualizaciones de seguridad se aplican sin `--force` para conservar
compatibilidad. React Router se mantiene en la ultima version estable 7.x. Esta
aplicacion usa `BrowserRouter` como SPA y no habilita React Server Components ni
acciones RSC.

Las rutas del navegador mejoran la experiencia, pero la autorizacion definitiva
se aplica en el backend para cada operacion protegida.
