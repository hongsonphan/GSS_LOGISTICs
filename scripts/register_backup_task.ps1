<#
.SYNOPSIS
  Dang ky tac vu Windows "GSS Pull Backup": keo ban sao luu tu VPS ve may nay luc 00:00 moi ngay.
  Neu may tat luc 00:00 thi chay bu ngay khi bat may (StartWhenAvailable) hoac khi dang nhap;
  neu mat mang thi thu lai moi gio. Script keo la idempotent nen chay nhieu lan khong tai lai.

  Chay (khong can quyen Admin, chay duoi tai khoan hien tai, khong luu mat khau):
    powershell -ExecutionPolicy Bypass -File scripts\register_backup_task.ps1
  Go bo:  ... -Unregister      Chay thu ngay: ... -RunNow
#>
[CmdletBinding()]
param(
    [string]$At = '00:00',
    [string]$ConfigPath = '',
    [switch]$Unregister,
    [switch]$RunNow
)
$ErrorActionPreference = 'Stop'
$TaskName = 'GSS Pull Backup'

if ($Unregister) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Da go tac vu '$TaskName'"; exit 0
}

$script = Join-Path $PSScriptRoot 'pull_backup_local.ps1'
if (-not (Test-Path -LiteralPath $script)) { throw "Khong thay $script" }
$args = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`" -Scheduled"
if ($ConfigPath) { $args += " -ConfigPath `"$ConfigPath`"" }
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $args

# 1) 00:00 hang ngay, lap moi gio trong ngay de thu lai khi mat mang (script tu bo qua neu hom nay da keo xong)
$daily = New-ScheduledTaskTrigger -Daily -At $At
$rep = New-ScheduledTaskTrigger -Once -At $At -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration (New-TimeSpan -Hours 23)
$daily.Repetition = $rep.Repetition
# 2) Moi lan dang nhap (may tat luc 00:00 -> bat len la keo bu)
$logon = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$logon.Delay = 'PT2M'

$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -WakeToRun `
    -ExecutionTimeLimit (New-TimeSpan -Hours 3) -MultipleInstances IgnoreNew `
    -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 15)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger @($daily, $logon) -Settings $settings -Principal $principal `
    -Description 'Keo ban sao luu GSS tu VPS ve may local luc 00:00; chay bu khi bat may' -Force | Out-Null
Write-Host "Da dang ky '$TaskName': $At hang ngay (thu lai moi gio), va khi dang nhap. Log: <localDir>\pull.log"
if ($RunNow) { Start-ScheduledTask -TaskName $TaskName; Write-Host 'Da chay thu.' }
