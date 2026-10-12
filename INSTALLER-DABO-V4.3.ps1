$ErrorActionPreference = "Stop"
$root = (Get-Location).Path
if (-not (Test-Path (Join-Path $root "package.json")) -or -not (Test-Path (Join-Path $root "supabase/migrations/2026-10-07-closed-loop-v4-plan-materialization.sql"))) {
  throw "Executez ce script depuis la racine du depot DABO."
}
$source = Split-Path -Parent $MyInvocation.MyCommand.Path
$items = @(
  "supabase/migrations/2026-10-08-closed-loop-v4-3-privilege-hardening.sql",
  "tests/closed-loop-v4-3-privilege-hardening.test.ts"
)
foreach ($item in $items) {
  $dest = Join-Path $root $item
  if (Test-Path $dest) { throw "Le fichier existe deja : $item. Installation annulee." }
}
foreach ($item in $items) {
  $dest = Join-Path $root $item
  Copy-Item -LiteralPath (Join-Path $source $item) -Destination $dest
  Write-Host "Ajoute : $item"
}
Write-Host "V4.3 installee. Executez npm run verify avant tout commit."
