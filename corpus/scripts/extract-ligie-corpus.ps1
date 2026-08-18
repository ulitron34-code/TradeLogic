Param()
$ErrorActionPreference = "Stop"

$corpusLigie = "E:\ADUANA\MVP_Tecnico\corpus\ligie"
$dataDir = "E:\ADUANA\MVP_Tecnico\data\tariff-sources\2026"
$scriptDir = "E:\ADUANA\MVP_Tecnico\scripts"

if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Force -Path $dataDir | Out-Null }

$baseVersion = "SNICE-LIGIE-BASE-2026-04-20"
$sourceUrl = "https://www.snice.gob.mx/cs/avi/snice/ligie.info22.html"

Write-Host "=== Extrayendo LIGIE base (fracciones + NICO) ==="
& python "$scriptDir\extract-ligie-xlsx.py" `
  "$corpusLigie\fracciones_arancelarias_20260420.xlsx" `
  "$dataDir\LIGIE-NICO-2026-04-24.csv" `
  --source-version $baseVersion `
  --source-url $sourceUrl `
  --valid-from "2026-04-20" `
  --base-valid-to "9999-12-31"

Write-Host ""
Write-Host "=== Extrayendo modificaciones Abril 2026 ==="
$modCsv = "$dataDir\MODIFICACIONES-ABRIL2026-LIGIE.csv"
if (Test-Path $modCsv) { Remove-Item $modCsv -Force }
& python "$scriptDir\extract-snice-xlsx.py" `
  "$corpusLigie\modificaciones_abril2026_20260427.xlsx" `
  "$modCsv" `
  --source-version "SNICE-TIGIE-MOD-ABRIL-2026" `
  --source-url "https://www.snice.gob.mx/~oracle/SNICE_DOCS/MODIFICACIONES-ABRIL2026-LIGIE_20260427-20260427.xlsx" `
  --valid-from "2026-04-27"

Write-Host ""
Write-Host "=== Extrayendo NICO standalone ==="
& python "$scriptDir\extract-snice-xlsx.py" `
  "$corpusLigie\nico_20240404.xlsx" `
  "$dataDir\NICO-ABRIL24-LIGIE.csv" `
  --source-version "SNICE-NICO-2024-04" `
  --source-url "https://www.snice.gob.mx/~oracle/SNICE_DOCS/NICO-MARZO24-LIGIE_20240404-20240404.XLSX" `
  --valid-from "2024-04-04"

Write-Host ""
Write-Host "=== Verificando archivos generados ==="
Get-ChildItem $dataDir -Filter "*.csv" | Select-Object Name, @{N="Filas";E={(Get-Content $_.FullName).Count - 1}}, @{N="TamañoKB";E={[math]::Round((Get-Item $_.FullName).Length/1KB,1)}} | Format-Table -AutoSize
