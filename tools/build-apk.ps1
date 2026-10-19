# Build APK in one command: vite build -> cap sync -> gradle assembleRelease -> copy to releases/
# Usage: npm run apk      (or: powershell -File tools/build-apk.ps1)
param(
    [switch]$DebugBuild
)
$ErrorActionPreference = 'Stop'

$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host '[1/4] vite build...'
npm run build

Write-Host '[2/4] cap sync android...'
npx cap sync android

Write-Host '[3/4] gradle assemble...'
Push-Location (Join-Path $root 'android')
try {
    if (-not $env:JAVA_HOME) {
        $jbr = 'D:\Android Studio\jbr'
        if (Test-Path $jbr) { $env:JAVA_HOME = $jbr }
    }
    if ($DebugBuild) {
        .\gradlew.bat assembleDebug --no-daemon -q
    } else {
        .\gradlew.bat assembleRelease --no-daemon -q
    }
}
finally {
    Pop-Location
}

Write-Host '[4/4] copy output...'
$variant = if ($DebugBuild) { 'debug' } else { 'release' }
$name = if ($DebugBuild) { 'app-debug.apk' } else { 'app-release.apk' }
$outName = if ($DebugBuild) { 'EnglishL-debug.apk' } else { 'EnglishL-release.apk' }

$src = Join-Path $root "android\app\build\outputs\apk\$variant\$name"
$dstDir = Join-Path $root 'releases'
New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
$dst = Join-Path $dstDir $outName
Copy-Item $src $dst -Force

$size = [math]::Round((Get-Item $dst).Length / 1MB, 1)
$hash = (Get-FileHash $dst -Algorithm SHA256).Hash
Write-Host ''
Write-Host "DONE: $dst ($size MB)"
Write-Host "SHA256: $hash"
