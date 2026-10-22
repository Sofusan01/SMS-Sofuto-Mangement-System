$ErrorActionPreference='Stop'
$appRoot=$PSScriptRoot
$nodePath=Join-Path $appRoot 'runtime\node.exe'
if (-not (Test-Path -LiteralPath $nodePath)) { $nodePath=(Get-Command node -ErrorAction Stop).Source }
if (-not (Test-Path -LiteralPath (Join-Path $appRoot 'data\access.json'))) { throw 'Run SETUP-OFFICE.bat to configure the app password first.' }
$env:HOST='127.0.0.1'
$env:PORT='3083'
$env:OFFICE_MODE='1'
$env:DATA_DIR=Join-Path $appRoot 'data'
$logDir=Join-Path $appRoot 'work'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$mutex=New-Object System.Threading.Mutex($false,'Local\SMS-SOFUTO-OFFICE')
if (-not $mutex.WaitOne(0)) { exit 0 }
try {
    $lastBackup=''
    while ($true) {
        $day=Get-Date -Format 'yyyy-MM-dd'
        if ($lastBackup -ne $day -and (Test-Path -LiteralPath (Join-Path $env:DATA_DIR 'c1conclude.sqlite'))) {
            & $nodePath (Join-Path $appRoot 'backup-db.mjs') >> (Join-Path $logDir 'office-backup.log') 2>&1
            if ($LASTEXITCODE -eq 0) { $lastBackup=$day }
        }
        $child=Start-Process -FilePath $nodePath -ArgumentList ('"'+(Join-Path $appRoot 'server.mjs')+'"') -WorkingDirectory $appRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDir 'office-server.log') -RedirectStandardError (Join-Path $logDir 'office-server-error.log')
        while (-not $child.WaitForExit(30000)) {
            if ((Get-Date -Format 'yyyy-MM-dd') -ne $lastBackup) {
                & $nodePath (Join-Path $appRoot 'backup-db.mjs') >> (Join-Path $logDir 'office-backup.log') 2>&1
                if ($LASTEXITCODE -eq 0) { $lastBackup=Get-Date -Format 'yyyy-MM-dd' }
            }
        }
        # Avoid a restart loop when another process owns the port.
        if ((Get-Content (Join-Path $logDir 'office-server-error.log') -Raw) -match 'EADDRINUSE') { throw 'Port 3083 is occupied. Inspect the existing server before restarting.' }
        Start-Sleep -Seconds 5
    }
} finally { $mutex.ReleaseMutex();$mutex.Dispose() }
