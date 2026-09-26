param([switch]$OpenBrowser)

$ErrorActionPreference = 'Stop'
$previewUrl = 'http://127.0.0.1:8124/sites/012-hindsight/'
$previewRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))

function Test-HindsightPreview {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $previewUrl -TimeoutSec 2
        return $response.StatusCode -eq 200 -and $response.Content -match '<title>Hindsight'
    } catch {
        return $false
    }
}

if (-not (Test-HindsightPreview)) {
    if (Get-NetTCPConnection -LocalPort 8124 -State Listen -ErrorAction SilentlyContinue) {
        throw 'Port 8124 is occupied by another service. It has not been stopped.'
    }
    $pythonCommand = Get-Command pythonw.exe -ErrorAction SilentlyContinue
    if (-not $pythonCommand) { $pythonCommand = Get-Command python.exe -ErrorAction Stop }
    $previewProcess = Start-Process -FilePath $pythonCommand.Source `
        -ArgumentList @('-u', '-m', 'http.server', '8124', '--bind', '127.0.0.1') `
        -WorkingDirectory $previewRoot -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $PSScriptRoot 'preview-output.log') `
        -RedirectStandardError (Join-Path $PSScriptRoot 'preview-error.log')
    $previewReady = $false
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        if (Test-HindsightPreview) { $previewReady = $true; break }
        if ($previewProcess.HasExited) { break }
        Start-Sleep -Milliseconds 250
    }
    if (-not $previewReady) {
        throw 'The preview did not start. See preview-error.log in this directory.'
    }
    Write-Output "Background preview started (PID $($previewProcess.Id))."
}

Write-Output $previewUrl
if ($OpenBrowser) { Start-Process $previewUrl }
