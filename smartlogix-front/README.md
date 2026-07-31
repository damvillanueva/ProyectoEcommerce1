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

Las rutas del navegador mejoran la experiencia, pero la autorizacion definitiva
se aplica en el backend para cada operacion protegida.
