[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$BackupPath,
    [switch]$Force,
    [switch]$SkipSafetyBackup
)

$ErrorActionPreference = "Stop"
$backendRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$expectedDatabases = @(
    "smartlogix_auth",
    "smartlogix_inventory",
    "smartlogix_order",
    "smartlogix_shipment"
)
$databaseOwners = @{
    smartlogix_auth = "smartlogix_auth"
    smartlogix_inventory = "smartlogix_inventory"
    smartlogix_order = "smartlogix_order"
    smartlogix_shipment = "smartlogix_shipment"
}
$applicationServices = @(
    "api-gateway",
    "order-service",
    "shipment-service",
    "inventory-service",
    "auth-service"
)

function Invoke-DockerCommand {
    param([string[]]$Arguments)

    & docker @Arguments | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw "Docker fallo: docker $($Arguments -join ' ')"
    }
}

if (-not $Force) {
    throw "La restauracion reemplaza las cuatro bases. Repita el comando con -Force para confirmarla."
}

$resolvedBackupPath = (Resolve-Path -LiteralPath $BackupPath).Path
$manifestPath = Join-Path $resolvedBackupPath "manifest.json"
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "El respaldo no contiene manifest.json."
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if ($manifest.formatVersion -ne 1) {
    throw "Version de respaldo no compatible: $($manifest.formatVersion)"
}
if (-not $manifest.consistent) {
    throw "El respaldo fue creado en modo online y no garantiza consistencia entre servicios."
}

$entries = @($manifest.databases)
if ($entries.Count -ne $expectedDatabases.Count) {
    throw "El respaldo no contiene exactamente las cuatro bases esperadas."
}

foreach ($database in $expectedDatabases) {
    $entry = @($entries | Where-Object { $_.database -eq $database })
    if ($entry.Count -ne 1) {
        throw "Falta una entrada unica para la base $database."
    }

    $dumpName = [System.IO.Path]::GetFileName([string]$entry[0].file)
    if ($dumpName -ne [string]$entry[0].file) {
        throw "El manifiesto contiene una ruta de archivo no permitida."
    }

    $dumpPath = Join-Path $resolvedBackupPath $dumpName
    if (-not (Test-Path -LiteralPath $dumpPath -PathType Leaf)) {
        throw "No existe el archivo $dumpName."
    }

    $actualBytes = (Get-Item -LiteralPath $dumpPath).Length
    if ($actualBytes -ne [long]$entry[0].bytes) {
        throw "El tamano registrado no coincide para $dumpName."
    }

    $actualHash = (Get-FileHash -LiteralPath $dumpPath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actualHash -ne ([string]$entry[0].sha256).ToLowerInvariant()) {
        throw "El hash SHA-256 no coincide para $dumpName."
    }
}

Push-Location $backendRoot
$servicesStopped = $false
$temporaryFiles = @()
try {
    $postgresContainer = (& docker compose ps -q postgres).Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($postgresContainer)) {
        throw "El contenedor PostgreSQL no esta ejecutandose."
    }

    if (-not $SkipSafetyBackup) {
        $safetyBackup = & (Join-Path $PSScriptRoot "backup-postgres.ps1") -Retention 0
        Write-Host "Respaldo de seguridad previo: $safetyBackup"
    }

    Invoke-DockerCommand -Arguments (@("compose", "stop") + $applicationServices)
    $servicesStopped = $true

    foreach ($database in $expectedDatabases) {
        $entry = @($entries | Where-Object { $_.database -eq $database })[0]
        $dumpPath = Join-Path $resolvedBackupPath ([string]$entry.file)
        $containerFile = "/tmp/smartlogix-restore-$database.dump"
        $databaseOwner = $databaseOwners[$database]
        $temporaryFiles += $containerFile

        Invoke-DockerCommand -Arguments @("cp", $dumpPath, "${postgresContainer}:${containerFile}")
        Invoke-DockerCommand -Arguments @(
            "compose", "exec", "-T", "postgres",
            "psql", "-U", "smartlogix_admin", "-d", $database,
            "--set=ON_ERROR_STOP=1",
            "--command=DROP SCHEMA public CASCADE",
            "--command=CREATE SCHEMA public AUTHORIZATION $databaseOwner"
        )
        Invoke-DockerCommand -Arguments @(
            "compose", "exec", "-T", "postgres",
            "pg_restore", "-U", $databaseOwner, "-d", $database,
            "--exit-on-error", "--single-transaction",
            "--no-owner", "--no-privileges", $containerFile
        )
    }

    Write-Host "Restauracion completada desde: $resolvedBackupPath"
}
finally {
    foreach ($temporaryFile in $temporaryFiles) {
        & docker compose exec -T postgres rm -f $temporaryFile 2>$null | Out-Null
    }

    if ($servicesStopped) {
        Invoke-DockerCommand -Arguments (@("compose", "up", "-d", "--wait", "--wait-timeout", "180") + $applicationServices)
    }
    Pop-Location
}
