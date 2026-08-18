Param(
    [string]$Label = "corpus-complete"
)
$ErrorActionPreference = "Stop"

$scriptPath = Join-Path $PSScriptRoot "backup-project.py"
& python $scriptPath --label $Label

