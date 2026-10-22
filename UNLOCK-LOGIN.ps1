$ErrorActionPreference='Stop'
try {
    $taskName='SMS SOFUTO Office Server'
    $serverPath=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'server.mjs'))
    $wrapperPath=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'OFFICE-SERVER.ps1'))
    $task=Get-ScheduledTask -TaskName $taskName -ErrorAction Stop
    # Verify that this is the task belonging to this checkout before touching it.
    $matchingAction=@($task.Actions | Where-Object { $_.Arguments -and $_.Arguments.Contains($wrapperPath) })
    if($matchingAction.Count -ne 1){throw 'The scheduled task belongs to another folder. No process was stopped.'}
    # Identify only the exact server script started by OFFICE-SERVER.ps1.
    $pattern='(?:^|\s)"'+[regex]::Escape($serverPath)+'"(?:\s|$)'
    $unquoted='(?:^|\s)'+[regex]::Escape($serverPath)+'(?:\s|$)'
    $servers=@(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -match $pattern -or $_.CommandLine -match $unquoted })
    Stop-ScheduledTask -TaskName $taskName
    Start-Sleep -Seconds 2
    foreach($server in $servers){
        $current=Get-CimInstance Win32_Process -Filter ("ProcessId = "+$server.ProcessId) -ErrorAction SilentlyContinue
        if($current -and ($current.CommandLine -match $pattern -or $current.CommandLine -match $unquoted)){
            Stop-Process -Id $current.ProcessId -ErrorAction Stop
        }
    }
    Start-ScheduledTask -TaskName $taskName
    $ready=$false
    for($i=0;$i -lt 30;$i++){
        try {$health=Invoke-RestMethod 'http://127.0.0.1:3083/health' -TimeoutSec 2;if($health.ok -and $health.authRequired -and $health.officeMode -and $health.passwordReload){$ready=$true;break}}catch{}
        Start-Sleep -Milliseconds 500
    }
    if(-not $ready){throw 'Server did not become ready. Check work\office-server-error.log.'}
    Write-Host 'SMS restarted. Login lock and previous sessions were cleared. Use your latest password.' -ForegroundColor Green
    Start-Process 'http://127.0.0.1:3083/'
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host 'If access is denied, run UNLOCK-LOGIN.bat as administrator on the office computer.'
    exit 1
}
