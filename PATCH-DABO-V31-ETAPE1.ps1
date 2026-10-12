$ErrorActionPreference = 'Stop'
$path = '.\app\app\page.tsx'
if (-not (Test-Path -LiteralPath $path)) { throw "Fichier introuvable : $path. Lancez ce script depuis la racine de dabo-app." }
$content = [System.IO.File]::ReadAllText((Resolve-Path -LiteralPath $path).Path)
$oldShortcut = '    { id: "tasks", label: t("tasks_title"), icon: ListTodo, href: "/app/taches" },'
$newShortcut = '    { id: "tasks", label: t("tasks_title"), icon: ListTodo, href: "/app/taches" },' + "`n" + '    { id: "planning", label: t("calendar_title"), icon: CalendarDays, href: "/app/calendrier" },'
if ($content.Contains('id: "planning", label: t("calendar_title")')) { throw 'Le raccourci Planning existe deja : patch non applique.' }
if (-not $content.Contains($oldShortcut)) { throw 'Point insertion Planning introuvable. Aucun fichier modifie.' }
$content = $content.Replace($oldShortcut, $newShortcut)
$navStart = '      <nav className="dabo-v32-shortcuts" aria-label={t("quick_actions_title")}>'
$heroStart = '      <section className="dabo-v3-hero" aria-label={household.name}>'
$heroEnd = '      </section>'
$startIndex = $content.IndexOf($navStart)
$heroIndex = $content.IndexOf($heroStart)
if ($startIndex -lt 0 -or $heroIndex -lt $startIndex) { throw 'Structure accueil inattendue. Aucun fichier modifie.' }
$endIndex = $content.IndexOf($heroEnd, $heroIndex)
if ($endIndex -lt 0) { throw 'Fin photographie introuvable. Aucun fichier modifie.' }
$endIndex += $heroEnd.Length
$segment = $content.Substring($startIndex, $endIndex - $startIndex)
$navPart = $segment.Substring(0, $segment.IndexOf($heroStart)).TrimEnd()
$heroPart = $segment.Substring($segment.IndexOf($heroStart)).TrimEnd()
$replacement = $heroPart + "`n`n" + $navPart
$content = $content.Substring(0,$startIndex) + $replacement + $content.Substring($endIndex)
[System.IO.File]::WriteAllText((Resolve-Path -LiteralPath $path).Path, $content, [System.Text.UTF8Encoding]::new($false))
Write-Host 'Etape 1 appliquee : photo avant raccourcis, Planning ajoute, Scan conserve.' -ForegroundColor Green
Write-Host 'Verifier maintenant avec npm run verify.'
