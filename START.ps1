$ErrorActionPreference = 'Stop'
$appRoot = $PSScriptRoot
if (Test-Path -LiteralPath (Join-Path $appRoot 'data\access.json')) {
    Start-ScheduledTask -TaskName 'SMS SOFUTO Office Server' -ErrorAction Stop
    $ready=$false
    for($i=0;$i -lt 30;$i++){
        try { $health=Invoke-RestMethod 'http://127.0.0.1:3083/health' -TimeoutSec 2;if($health.ok -and $health.authRequired){$ready=$true;break} } catch {}
        Start-Sleep -Milliseconds 500
    }
    if(-not $ready){throw 'Office server is not ready. Run SETUP-OFFICE.bat.'}
    Start-Process 'http://127.0.0.1:3083/'
    exit 0
}
$appPort = if ($env:PORT) { [int]$env:PORT } else { 3082 }
$appUrl = "http://127.0.0.1:$appPort/"
function Test-AppReady {
    try {
        $response = Invoke-WebRequest -Uri $appUrl -UseBasicParsing -TimeoutSec 2
        return $response.StatusCode -eq 200 -and $response.Content.Contains('SMS SOFUTO MANAGEMENT SYSTEM')
    } catch { return $false }
}
try {
    if (-not (Test-AppReady)) {
        $nodePath = Join-Path $appRoot 'runtime\node.exe'
        if (-not (Test-Path -LiteralPath $nodePath)) { $nodePath = (Get-Command node -ErrorAction Stop).Source }
        $logDir = Join-Path $appRoot 'work'
        New-Item -ItemType Directory -Force -Path $logDir | Out-Null
        Start-Process -FilePath $nodePath -ArgumentList 'server.mjs' -WorkingDirectory $appRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir 'server.log') -RedirectStandardError (Join-Path $logDir 'server-error.log') | Out-Null
        $ready = $false
        for ($attempt=0; $attempt -lt 30; $attempt++) {
            if (Test-AppReady) { $ready=$true; break }
            Start-Sleep -Milliseconds 300
        }
        if (-not $ready) { throw "The app could not start. Check work\server-error.log. Port: $appPort" }
    }
    Start-Process $appUrl
    Write-Host "SMS SOFUTO is running at $appUrl"
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
