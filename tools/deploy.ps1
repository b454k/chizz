# Deploy chizz to production (chizz.party).
#
#   powershell -ExecutionPolicy Bypass -File tools\deploy.ps1          # deploy
#   powershell -ExecutionPolicy Bypass -File tools\deploy.ps1 -DryRun  # only find the ids
#
# The real KV and D1 ids are never committed (see CLAUDE.md), so this looks them up on the
# Cloudflare account by name -- the GAMES namespace and the chizz-analytics database -- puts
# them into wrangler.jsonc for the deploy, and puts the placeholders back afterwards, also
# when the deploy fails. Needs `npx wrangler login` once.

param([switch]$DryRun)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

function Json-From($text) {
  $s = ($text | Out-String)
  ConvertFrom-Json $s.Substring($s.IndexOf("["))
}

node tools/check-day-epoch.js
if ($LASTEXITCODE -ne 0) { throw "the daily clock check failed; not deploying" }

$kv = (Json-From (npx -y wrangler@latest kv namespace list) | Where-Object { $_.title -eq "GAMES" }).id
$d1 = (Json-From (npx -y wrangler@latest d1 list --json) | Where-Object { $_.name -eq "chizz-analytics" }).uuid
if (-not $kv -or -not $d1) { throw "could not find the GAMES namespace or the chizz-analytics database; is wrangler logged in?" }
"found the KV namespace and the D1 database"
if ($DryRun) { return }

try {
  (Get-Content wrangler.jsonc) -replace 'PUT_YOUR_KV_NAMESPACE_ID_HERE', $kv `
                               -replace 'PUT_YOUR_D1_DATABASE_ID_HERE', $d1 | Set-Content wrangler.jsonc
  npx -y wrangler@latest pages deploy --branch production --commit-dirty=true
  if ($LASTEXITCODE -ne 0) { throw "deploy failed" }
} finally {
  git checkout wrangler.jsonc
}
