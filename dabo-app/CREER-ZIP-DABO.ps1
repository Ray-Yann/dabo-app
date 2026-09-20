# DABO - Créateur de ZIP propre
# Ce script crée une archive de travail légère sans modifier le projet.
# Il exclut uniquement les dossiers reconstruisibles, caches, Git/Vercel
# et fichiers d'environnement/secrets.

$ErrorActionPreference = "Stop"

$ProjectRoot = (Get-Location).Path
$ProjectName = Split-Path $ProjectRoot -Leaf
$ParentDir = Split-Path $ProjectRoot -Parent
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ZipPath = Join-Path $ParentDir "$ProjectName-PROPRE-$Timestamp.zip"

$ExcludedDirectories = @(
    "node_modules",
    ".next",
    ".git",
    ".vercel",
    "coverage",
    "out",
    "build",
    ".turbo",
    ".cache"
)

function Should-ExcludeFile {
    param([System.IO.FileInfo]$File)

    $relative = $File.FullName.Substring($ProjectRoot.Length).TrimStart('\','/')
    $parts = $relative -split '[\\/]'

    foreach ($part in $parts) {
        if ($ExcludedDirectories -contains $part) {
            return $true
        }
    }

    $name = $File.Name

    if ($name -like ".env*") { return $true }
    if ($name -like "*.tsbuildinfo") { return $true }
    if ($name -like "npm-debug.log*") { return $true }
    if ($name -like "yarn-debug.log*") { return $true }
    if ($name -like "yarn-error.log*") { return $true }
    if ($name -like "pnpm-debug.log*") { return $true }
    if ($name -like "*.zip") { return $true }

    return $false
}

Write-Host ""
Write-Host "DABO - Creation du ZIP propre" -ForegroundColor Cyan
Write-Host "Projet : $ProjectRoot"
Write-Host ""

$Files = Get-ChildItem -Path $ProjectRoot -Recurse -File -Force |
    Where-Object { -not (Should-ExcludeFile $_) }

if (-not $Files -or $Files.Count -eq 0) {
    throw "Aucun fichier a archiver."
}

$TotalBytes = ($Files | Measure-Object -Property Length -Sum).Sum
$TotalMB = [math]::Round($TotalBytes / 1MB, 2)

Write-Host "Fichiers conserves : $($Files.Count)"
Write-Host "Taille avant compression : $TotalMB MB"
Write-Host ""
Write-Host "Exclus automatiquement :" -ForegroundColor Yellow
Write-Host "  node_modules, .next, .git, .vercel, coverage, out, build, caches"
Write-Host "  .env*, *.tsbuildinfo, logs de debug et anciens ZIP"
Write-Host ""
Write-Host "Creation de l'archive..."

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

if (Test-Path $ZipPath) {
    Remove-Item $ZipPath -Force
}

$zip = [System.IO.Compression.ZipFile]::Open(
    $ZipPath,
    [System.IO.Compression.ZipArchiveMode]::Create
)

try {
    foreach ($file in $Files) {
        $relative = $file.FullName.Substring($ProjectRoot.Length).TrimStart('\','/')
        $entryName = "$ProjectName/$($relative -replace '\\','/')"

        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $zip,
            $file.FullName,
            $entryName,
            [System.IO.Compression.CompressionLevel]::Optimal
        ) | Out-Null
    }
}
finally {
    $zip.Dispose()
}

$ZipSizeMB = [math]::Round((Get-Item $ZipPath).Length / 1MB, 2)

Write-Host ""
Write-Host "SUCCES" -ForegroundColor Green
Write-Host "ZIP cree : $ZipPath"
Write-Host "Taille ZIP : $ZipSizeMB MB"
Write-Host ""
Write-Host "Ton dossier DABO original n'a pas ete modifie." -ForegroundColor Green
Write-Host "Tu peux m'envoyer ce fichier PROPRE a l'avenir."
Write-Host ""
