$ErrorActionPreference = 'Stop'
$cssPath = Join-Path (Get-Location) 'app/globals.css'
$pagePath = Join-Path (Get-Location) 'app/app/page.tsx'
if (-not (Test-Path $cssPath) -or -not (Test-Path $pagePath)) { throw 'Executez depuis la racine du projet DABO.' }
$css = [System.IO.File]::ReadAllText($cssPath)
$page = [System.IO.File]::ReadAllText($pagePath)
if (-not $css.Contains('.dabo-v32-shortcuts{') -or -not $page.Contains('pendingShoppingPreview')) { throw 'Version V3.2 attendue introuvable : aucun changement.' }
if ($css.Contains('/* Maison Vivante V3.3 — mobile refinements */')) { Write-Host 'V3.3 deja installee.'; exit 0 }
$addition = @'

/* Maison Vivante V3.3 — mobile refinements */
/* A discreet right-edge fade signals additional horizontal shortcuts on narrow screens. */
@media (max-width: 999px) {
  .dabo-v32-shortcuts {
    -webkit-mask-image: linear-gradient(to right, #000 0%, #000 calc(100% - 22px), transparent 100%);
    mask-image: linear-gradient(to right, #000 0%, #000 calc(100% - 22px), transparent 100%);
    padding-right: 18px;
  }
}
/* Compact only the mobile editorial lists; preserve comfortable touch targets. */
@media (max-width: 520px) {
  .dabo-v3-panel { padding: 12px 16px 5px; }
  .dabo-v3-section-heading { padding-bottom: 6px; }
  .dabo-v3-line, .dabo-v3-list > button { min-height: 60px; padding-block: 9px; gap: 12px; }
  .dabo-v3-section-heading h2, .dabo-v3-panel > h2 { font-size: clamp(23px, 5vw, 27px); }
}
'@
[System.IO.File]::WriteAllText($cssPath, $css + $addition, [System.Text.UTF8Encoding]::new($false))
Write-Host 'V3.3 appliquee : indicateur de defilement et densite mobile. Aucun fichier Closed Loop modifie.'
