# Backup y restauracion de PostgreSQL

SmartLogix mantiene cuatro bases PostgreSQL separadas. Los scripts de esta guia
crean y restauran un conjunto unico para conservar la coherencia entre usuarios,
inventario, pedidos y envios.

## Requisitos

- Docker Desktop en ejecucion.
- Plataforma iniciada mediante `docker compose`.
- Archivo `.env` local con las mismas credenciales usadas por los contenedores.
- Espacio suficiente para conservar los respaldos y el respaldo de seguridad.

Ejecute los comandos desde `smartlogix-back`.

## Crear un respaldo

```powershell
.\scripts\backup-postgres.ps1
```

El script realiza estas acciones:

1. verifica que PostgreSQL este saludable;
2. detiene temporalmente los servicios que escriben datos;
3. genera un dump comprimido por base con `pg_dump`;
4. calcula el tamano y hash SHA-256 de cada archivo;
5. guarda fecha UTC, commit Git e imagen PostgreSQL en `manifest.json`;
6. reinicia los servicios y espera sus health checks.

La carpeta predeterminada es `backups/AAAAMMDD_HHMMSS`. Git ignora su contenido
porque puede contener datos personales y comerciales.

### Opciones

```powershell
.\scripts\backup-postgres.ps1 -Retention 14
.\scripts\backup-postgres.ps1 -OutputRoot D:\Respaldos\SmartLogix -Retention 30
```

`Retention` conserva los conjuntos mas recientes; `0` desactiva la eliminacion
automatica. La limpieza solo puede actuar dentro del directorio configurado.

## Restaurar

La restauracion reemplaza las cuatro bases. Primero valide que selecciono el
conjunto correcto y ejecute el proceso en un entorno controlado:

```powershell
.\scripts\restore-postgres.ps1 `
  -BackupPath .\backups\20260718_231323 `
  -Force
```

Antes de modificar datos, el script crea otro respaldo en `backups`. Luego:

1. valida version, bases esperadas, rutas, tamanos y hashes;
2. detiene API Gateway y los servicios de datos;
3. recrea cada esquema con el propietario de minimo privilegio correcto;
4. restaura cada dump dentro de una transaccion;
5. reinicia la plataforma y espera que todos los servicios esten saludables.

Solo para una recuperacion ya protegida por otro respaldo se puede omitir la
copia previa:

```powershell
.\scripts\restore-postgres.ps1 `
  -BackupPath D:\Respaldos\SmartLogix\20260718_231323 `
  -Force `
  -SkipSafetyBackup
```

## Verificacion posterior

```powershell
docker compose ps
Invoke-RestMethod http://localhost:8080/actuator/health
```

Ademas de los health checks, compruebe un login, el inventario, un pedido y su
envio. Una copia solo se considera confiable despues de probar su restauracion.

## Seguridad y continuidad

- No suba dumps a Git ni los comparta por canales publicos.
- Cifre las copias que salgan del equipo y controle quienes pueden acceder.
- Aplique una estrategia 3-2-1: tres copias, dos medios y una fuera del equipo.
- Defina retencion y eliminacion segun la finalidad de los datos personales.
- Pruebe la restauracion periodicamente en un entorno aislado.
- Registre responsable, fecha, resultado y tiempo de cada prueba.

Estos scripts cubren la operacion local. Un entorno productivo debe sumar
almacenamiento cifrado, automatizacion, monitoreo y credenciales administradas
por un gestor de secretos.
