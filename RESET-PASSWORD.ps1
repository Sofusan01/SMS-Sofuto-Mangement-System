$ErrorActionPreference='Stop'
try {
    $nodePath=Join-Path $PSScriptRoot 'runtime\node.exe'
    if (-not (Test-Path -LiteralPath $nodePath)) { $nodePath=(Get-Command node -ErrorAction Stop).Source }
    $env:DATA_DIR=Join-Path $PSScriptRoot 'data'
    if (-not (Test-Path -LiteralPath (Join-Path $env:DATA_DIR 'access.json'))) { throw 'No app password exists. Run SETUP-OFFICE.bat first.' }
    Write-Host 'Reset SMS app password. Employee and attendance data will not be changed.'
    $secret=Read-Host 'New password (12-128 characters)' -AsSecureString
    $confirm=Read-Host 'Repeat new password' -AsSecureString
    $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
    $ptr2=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($confirm)
    try {
        $plain=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
        $again=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr2)
        if ($plain -cne $again) { throw 'Passwords do not match. Nothing was changed.' }
        $payload=@{password=$plain}|ConvertTo-Json -Compress
        $oldEncoding=$OutputEncoding
        try {
            $OutputEncoding=New-Object Text.UTF8Encoding($false)
            $payload | & $nodePath (Join-Path $PSScriptRoot 'setup-password.mjs') --reset
            if ($LASTEXITCODE -ne 0) { throw 'Password reset failed.' }
        } finally { $OutputEncoding=$oldEncoding }
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr2)
        $plain=$null;$again=$null;$payload=$null
    }
    Write-Host 'New password saved.' -ForegroundColor Green
    $health=$null
    try {$health=Invoke-RestMethod 'http://127.0.0.1:3083/health' -TimeoutSec 3}catch{}
    if($health.passwordReload){
        Write-Host 'New password is now active. Previous sessions and login lock were cleared.' -ForegroundColor Green
        Start-Process 'http://127.0.0.1:3083/'
    } else {
        Write-Host 'Restarting the office server to load the password update...'
        & (Join-Path $PSScriptRoot 'UNLOCK-LOGIN.ps1')
    }
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
