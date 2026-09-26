param([string]$Compiler = 'gcc')

$ErrorActionPreference = 'Stop'
$demoDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$source = Join-Path $demoDir 'game_save.c'
$exe = Join-Path $demoDir 'game_save.exe'
$report = Join-Path $demoDir 'run-report.txt'
$compilerPath = (Get-Command $Compiler -ErrorAction Stop).Source
$env:PATH = (Split-Path -Parent $compilerPath) + ';' + $env:PATH
$objdump = Join-Path (Split-Path -Parent $compilerPath) 'objdump.exe'

& $compilerPath -std=c11 -O0 -fno-inline -Wall -Wextra -o $exe $source
if ($LASTEXITCODE -ne 0) { throw 'Game client compilation failed.' }
$sha256 = (Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash.ToLowerInvariant()

[byte[]]$valid = @(0x47,0x53,0x56,0x31,0x01,0x05,0x07,0x10,0x27,0x00,0x00,0x6a)
[byte[]]$badChecksum = @(0x47,0x53,0x56,0x31,0x01,0x05,0x07,0x10,0x27,0x00,0x00,0x00)
[byte[]]$badVersion = @(0x47,0x53,0x56,0x31,0x02,0x05,0x07,0x10,0x27,0x00,0x00,0x6a)
[System.IO.File]::WriteAllBytes((Join-Path $demoDir 'valid.sav'), $valid)
[System.IO.File]::WriteAllBytes((Join-Path $demoDir 'bad-checksum.sav'), $badChecksum)
[System.IO.File]::WriteAllBytes((Join-Path $demoDir 'bad-version.sav'), $badVersion)

$lines = @(
    'GAME SAVE DEMO / actual compiled executable results'
    'Build: MinGW-w64 GCC, -std=c11 -O0 -fno-inline'
    "EXE SHA-256: $sha256"
    'Format: GSV1 | version 01 | payload length 05 | level 07 | score 10000 little-endian | XOR checksum 6A'
    ''
)
foreach ($name in @('valid.sav','bad-checksum.sav','bad-version.sav')) {
    $path = Join-Path $demoDir $name
    $output = & $exe $path 2>&1
    $exit = $LASTEXITCODE
    $lines += "=== $name ==="
    $lines += "bytes: $([System.BitConverter]::ToString([System.IO.File]::ReadAllBytes($path)).Replace('-', ' '))"
    $lines += "stdout: $output"
    $lines += "exit code: $exit"
    if ($name -ne 'bad-version.sav') { $lines += '' }
}
$lines | Set-Content -LiteralPath $report -Encoding UTF8
if (-not ($lines -contains 'exit code: 0') -or -not ($lines -contains 'exit code: 6') -or -not ($lines -contains 'exit code: 5')) {
    throw 'Observed exit codes did not match the documented examples.'
}
if (Test-Path -LiteralPath $objdump) {
    @(
        'GAME SAVE DEMO / compiler-level binary evidence'
        "EXE SHA-256: $sha256"
        '=== PE FORMAT AND SYMBOLS ==='
        (& $objdump -t $exe | Select-String 'inspect_save| main$' | ForEach-Object { $_.Line })
        '=== inspect_save DISASSEMBLY ==='
        (& $objdump -d --disassemble=inspect_save $exe | ForEach-Object { $_.Replace($demoDir + '\', '').TrimEnd() })
    ) | Set-Content -LiteralPath (Join-Path $demoDir 'binary-inspection.txt') -Encoding UTF8
}
Write-Output "Built: $exe"
Write-Output "Verified cases: $report"
