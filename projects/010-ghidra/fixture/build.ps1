param(
    [string]$Compiler = 'cl',
    [string]$Dumpbin = 'dumpbin'
)

$ErrorActionPreference = 'Stop'
$fixtureDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$source = Join-Path $fixtureDir 'frame_gate.c'
$object = Join-Path $fixtureDir 'frame_gate.obj'
$report = Join-Path $fixtureDir 'dumpbin-report.txt'
$verifySource = Join-Path $fixtureDir 'verify.c'
$buildDir = Join-Path $fixtureDir 'build'
$verifyObject = Join-Path $buildDir 'verify.obj'
$verifyExe = Join-Path $buildDir 'verify.exe'
New-Item -ItemType Directory -Path $buildDir -Force | Out-Null

& $Compiler /nologo /c /Od /GS- /Fo"$object" "$source"
if ($LASTEXITCODE -ne 0) { throw 'Compilation failed.' }

@(
    '=== HEADERS ==='
    (& $Dumpbin /nologo /headers "$object")
    '=== SYMBOLS ==='
    (& $Dumpbin /nologo /symbols "$object")
    '=== RAW DATA ==='
    (& $Dumpbin /nologo /rawdata "$object")
    '=== DISASSEMBLY ==='
    (& $Dumpbin /nologo /disasm "$object")
) | ForEach-Object { $_.Replace($fixtureDir + '\', '') } | Set-Content -LiteralPath $report -Encoding UTF8
if ($LASTEXITCODE -ne 0) { throw 'Binary inspection failed.' }

& $Compiler /nologo /c /Od /GS- /Fo"$verifyObject" "$verifySource"
if ($LASTEXITCODE -ne 0) { throw 'Verification harness compilation failed.' }

& link /nologo /nodefaultlib /subsystem:console /entry:main /out:"$verifyExe" "$verifyObject" "$object"
if ($LASTEXITCODE -ne 0) { throw 'Verification harness linking failed.' }

& $verifyExe
if ($LASTEXITCODE -ne 0) { throw "Verification failed with exit code $LASTEXITCODE." }

@(
    '=== CASE VERIFICATION ==='
    'verify.exe exit code: 0 (all four assertions passed)'
    'valid -> 3; short header -> -1; wrong magic -> -2; length overflow -> -3'
) | Add-Content -LiteralPath $report -Encoding UTF8

Write-Output "Built: $object"
Write-Output "Evidence: $report"
Write-Output 'Verified: four sample inputs passed.'
