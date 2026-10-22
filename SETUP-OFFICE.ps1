$ErrorActionPreference='Stop'
$appRoot=$PSScriptRoot
$nodePath=Join-Path $appRoot 'runtime\node.exe'
if (-not (Test-Path -LiteralPath $nodePath)) { $nodePath=(Get-Command node -ErrorAction Stop).Source }
$accessFile=Join-Path $appRoot 'data\access.json'
if (-not (Test-Path -LiteralPath $accessFile)) {
    Write-Host 'Create the SMS app password (at least 12 characters). Do not send it in chat.'
    $secret=Read-Host 'App password' -AsSecureString
    $confirm=Read-Host 'Repeat password' -AsSecureString
    $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
    $ptr2=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($confirm)
    try {
        $plain=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
        $again=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr2)
        if ($plain -cne $again) { throw 'Passwords do not match.' }
        $payload=@{password=$plain}|ConvertTo-Json -Compress
        $oldEncoding=$OutputEncoding
        try { $OutputEncoding=New-Object Text.UTF8Encoding($false);$payload | & $nodePath (Join-Path $appRoot 'setup-password.mjs') } finally { $OutputEncoding=$oldEncoding }
        if ($LASTEXITCODE -ne 0) { throw 'Password setup failed.' }
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr2)
        $plain=$null;$again=$null;$payload=$null
    }
}
# Run as the signed-in Windows user, including after future Windows logins.
$taskName='SMS SOFUTO Office Server'
$user=[Security.Principal.WindowsIdentity]::GetCurrent().Name
$action=New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -WindowStyle Hidden -File "'+(Join-Path $appRoot 'OFFICE-SERVER.ps1')+'"') -WorkingDirectory $appRoot
$trigger=New-ScheduledTaskTrigger -AtLogOn -User $user
$principal=New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
$settings=New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
Start-ScheduledTask -TaskName $taskName
$ready=$false
for ($i=0;$i -lt 30;$i++) {
    try { $status=Invoke-RestMethod 'http://127.0.0.1:3083/health' -TimeoutSec 2;if($status.ok -and $status.authRequired -and $status.officeMode){$ready=$true;break} } catch {}
    Start-Sleep -Milliseconds 500
}
if (-not $ready) { throw 'Office server is not ready. Check work\office-server-error.log.' }
Write-Host 'Office server is ready. It requires your app password.'
Start-Process 'http://127.0.0.1:3083/'
Write-Host 'Local office setup complete. Remote access is not configured.'
