[CmdletBinding()]
param(
    [string]$OutputRoot = "backups",
    [ValidateRange(0, 100)]
    [int]$Retention = 7
)

$ErrorActionPreference = "Stop"
$backendRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$databases = @(
    "smartlogix_auth",
    "smartlogix_inventory",
    "smartlogix_order",
    "smartlogix_shipment"
)
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

function Get-FullOutputRoot {
    if ([System.IO.Path]::IsPathRooted($OutputRoot)) {
        return [System.IO.Path]::GetFullPath($OutputRoot)
    }

    return [System.IO.Path]::GetFullPath((Join-Path $backendRoot $OutputRoot))
}

$outputRootPath = Get-FullOutputRoot
New-Item -ItemType Directory -Force -Path $outputRootPath | Out-Null
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd_HHmmss")
$backupDirectory = Join-Path $outputRootPath $timestamp
New-Item -ItemType Directory -Path $backupDirectory | Out-Null

$servicesStopped = $false
$temporaryFiles = @()

Push-Location $backendRoot
try {
    $postgresContainer = (& docker compose ps -q postgres).Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($postgresContainer)) {
        throw "El contenedor PostgreSQL no esta ejecutandose. Use docker compose up -d."
    }

    $health = (& docker inspect --format "{{.State.Health.Status}}" $postgresContainer).Trim()
    if ($LASTEXITCODE -ne 0 -or $health -ne "healthy") {
        throw "PostgreSQL no esta saludable. Estado actual: $health"
    }

    Invoke-DockerCommand -Arguments (@("compose", "stop") + $applicationServices)
    $servicesStopped = $true

    $entries = @()
    foreach ($database in $databases) {
        $dumpName = "$database.dump"
        $containerFile = "/tmp/smartlogix-$timestamp-$dumpName"
        $localFile = Join-Path $backupDirectory $dumpName
        $temporaryFiles += $containerFile

        Invoke-DockerCommand -Arguments @(
            "compose", "exec", "-T", "postgres",
            "pg_dump", "-U", "smartlogix_admin", "-d", $database,
            "--format=custom", "--compress=9", "--no-owner", "--no-privileges",
            "--file=$containerFile"
        )
        Invoke-DockerCommand -Arguments @("cp", "${postgresContainer}:${containerFile}", $localFile)

        $fileInfo = Get-Item -LiteralPath $localFile
        $hash = Get-FileHash -LiteralPath $localFile -Algorithm SHA256
        $entries += [ordered]@{
            database = $database
            file = $dumpName
            bytes = $fileInfo.Length
            sha256 = $hash.Hash.ToLowerInvariant()
        }
    }

    $gitCommit = (& git rev-parse HEAD 2>$null).Trim()
    if ($LASTEXITCODE -ne 0) {
        $gitCommit = $null
    }

    $manifest = [ordered]@{
        formatVersion = 1
        createdAtUtc = (Get-Date).ToUniversalTime().ToString("o")
        consistent = $true
        postgresImage = "postgres:16-alpine"
        gitCommit = $gitCommit
        databases = $entries
    }
    $manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $backupDirectory "manifest.json") -Encoding UTF8

    if ($Retention -gt 0) {
        $backupSets = @(Get-ChildItem -LiteralPath $outputRootPath -Directory |
            Where-Object { $_.Name -match '^\d{8}_\d{6}$' } |
            Sort-Object Name -Descending)
        $expiredSets = @($backupSets | Select-Object -Skip $Retention)

        foreach ($expiredSet in $expiredSets) {
            $parentPath = [System.IO.Path]::GetFullPath($expiredSet.Parent.FullName)
            if ($parentPath -ne $outputRootPath) {
                throw "Se rechazo eliminar una ruta fuera del directorio de respaldos."
            }
            Remove-Item -LiteralPath $expiredSet.FullName -Recurse -Force
        }
    }

    Write-Host "Respaldo completado: $backupDirectory"
    Write-Output $backupDirectory
}
catch {
    if (Test-Path -LiteralPath $backupDirectory) {
        Remove-Item -LiteralPath $backupDirectory -Recurse -Force
    }
    throw
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
