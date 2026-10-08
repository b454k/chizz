# A full copy of the live analytics database, as SQL that can be loaded back into D1.
#
#   powershell -ExecutionPolicy Bypass -File tools\backup-analytics.ps1 [-Dir <folder>] [-Keep 12]
#
# Run monthly by a Windows scheduled task ("chizz analytics backup"); see docs/DEPLOY.md.
# Needs `npx wrangler login` on this account. The backups hold every player's drawings,
# so the folder stays outside the repo.
#
# Runs from the backup folder, not the project: inside the project wrangler would read
# wrangler.jsonc and its placeholder id. Outside it, wrangler finds the database by name.

param(
  [string]$Dir = (Join-Path ([Environment]::GetFolderPath("MyDocuments")) "chizz-backups"),
  [int]$Keep = 12
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force $Dir | Out-Null
Set-Location $Dir

$file = "chizz-analytics-$(Get-Date -Format yyyy-MM-dd).sql"
$log = Join-Path $Dir "backup.log"

& npx -y wrangler@latest d1 export chizz-analytics --remote --output $file *> "$log.last"
$ok = $LASTEXITCODE -eq 0 -and (Test-Path $file) -and (Get-Item $file).Length -gt 0
Add-Content $log ("{0}  {1}  {2}" -f (Get-Date -Format s), $(if ($ok) { "ok    " } else { "FAILED" }), $file)
if (-not $ok) { exit 1 }

# The newest $Keep backups stay; older ones go.
Get-ChildItem $Dir -Filter "chizz-analytics-*.sql" | Sort-Object Name -Descending |
  Select-Object -Skip $Keep | Remove-Item
