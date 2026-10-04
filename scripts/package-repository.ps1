# Create the repository ZIP with repository files at the archive root (no nested parent directory).
# Uses System.IO.Compression directly: Compress-Archive cannot open hidden files (dotfiles may carry the Hidden attribute on
# Windows checkouts), and PowerShell parses `[regex]::Escape($x) + '$'` inside @() as two array elements unless parenthesised.
param([string]$Out = "hcw-azmigrateorchestrator-addon.zip")
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$root = (Get-Location).Path
if (Test-Path $Out) { Remove-Item $Out -Force }
$exclude = @('\.git(\\|/)', 'node_modules', '(\\|/)dist(\\|/)', '\.tsbuildinfo$', '\.local(\\|/)', '(^|\\|/)\.env$', '(^|\\|/)\.env\.(?!example)', '(\\|/)data(\\|/)', '\.tfstate', '\.terraform(\\|/)', '\.log$', '__pycache__', '\.pyc$', ([regex]::Escape($Out) + '$'))
$rx = '(' + ($exclude -join ')|(') + ')'
$files = @(Get-ChildItem -Recurse -File -Force | Where-Object { $_.FullName.Substring($root.Length + 1) -notmatch $rx })
if ($files.Count -eq 0) { throw "no files selected for packaging" }
$leaks = @($files | ForEach-Object { $_.FullName.Substring($root.Length + 1).Replace('\', '/') } | Where-Object { $_ -match '^(\.git/|node_modules/|.*/dist/|\.env$)' })
if ($leaks.Count -gt 0) { throw "excluded path would leak into the archive: $($leaks -join ', ')" }
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open((Join-Path $root $Out), [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($f in $files) {
    $rel = $f.FullName.Substring($root.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $f.FullName, $rel, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
} finally { $zip.Dispose() }
Write-Output "wrote $Out ($([math]::Round((Get-Item $Out).Length / 1MB, 2)) MB, $($files.Count) files)"
