<#
.SYNOPSIS
  KEO BAN SAO LUU TU VPS VE MAY LOCAL (Windows). Chay boi Task Scheduler luc 00:00 moi ngay;
  neu may tat luc do thi tu chay bu khi bat may / dang nhap (xem register_backup_task.ps1).

.DESCRIPTION
  - May local la ben CHU DONG ket noi toi VPS (SSH khoa rieng), VPS khong can biet dia chi may local.
  - Chi tai ban moi (da co thi bo qua): bo CSDL+media moi nhat (cung moc gio) va ban CSDL moi nhat.
  - Moi file: tai ra *.part -> doi chieu sha256 do backup_vps.sh ghi -> kiem tra gzip doc duoc -> moi doi ten.
  - Tuy chon ma hoa ban local bang age (ageRecipient), khoa quyen thu muc chi cho nguoi dung hien tai.
  - Giu keepDays ngay, luon giu it nhat keepMinSets bo moi nhat. Canh bao neu ban moi nhat cu hon staleWarnHours.
  - Idempotent: chay nhieu lan trong ngay khong tai lai. Che do -Scheduled chi chay khi hom nay chua co lan keo thanh cong.

  Cau hinh o NGOAI repo: %USERPROFILE%\.gss-backup\config.json (mau: scripts/pull_backup_local.config.example.json).
  Khong dua dia chi/khoa may chu vao repo.

  Ma thoat: 0 = tot · 1 = loi · 2 = da keo nhung ban moi nhat qua cu · 3 = khong ket noi duoc (se thu lai)
#>
[CmdletBinding()]
param(
    [string]$ConfigPath = $(if ($env:GSS_BACKUP_CONFIG) { $env:GSS_BACKUP_CONFIG } else { Join-Path $env:USERPROFILE '.gss-backup\config.json' }),
    [switch]$Scheduled,   # do Task Scheduler goi: bo qua neu hom nay da keo xong
    [switch]$Force,       # bo qua kiem tra "da keo hom nay"
    [switch]$VerifyOnly   # chi kiem tra cac ban da luu (checksum + gzip), khong ket noi may chu
)

Set-StrictMode -Version 2
$ErrorActionPreference = 'Stop'
$NamePattern = '^(db_\d{8}_\d{4}\.sql\.gz|media_\d{8}_\d{4}\.tar\.gz)$'

function Get-Cfg($cfg, [string]$name, $default) {
    $p = $cfg.PSObject.Properties[$name]
    if ($null -ne $p -and $null -ne $p.Value -and "$($p.Value)" -ne '') { return $p.Value }
    return $default
}

if (-not (Test-Path -LiteralPath $ConfigPath)) {
    Write-Error "Chua co file cau hinh: $ConfigPath (xem scripts/pull_backup_local.config.example.json)"
    exit 1
}
$cfg = Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
$Transport = Get-Cfg $cfg 'transport' 'ssh'
$LocalDir = Get-Cfg $cfg 'localDir' (Join-Path $env:USERPROFILE 'GSS_Backups')
$RemoteDir = Get-Cfg $cfg 'remoteDir' '/home/ubuntu/backups'
$KeepDays = [int](Get-Cfg $cfg 'keepDays' 30)
$KeepMinSets = [int](Get-Cfg $cfg 'keepMinSets' 3)
$StaleWarnHours = [int](Get-Cfg $cfg 'staleWarnHours' 36)
$ConnectTimeout = [int](Get-Cfg $cfg 'connectTimeout' 20)
$AgeRecipient = Get-Cfg $cfg 'ageRecipient' ''
$RemoteBackupCommand = Get-Cfg $cfg 'remoteBackupCommand' ''
$RemoteBackupMaxAgeHours = [int](Get-Cfg $cfg 'remoteBackupMaxAgeHours' 6)
$SshHost = Get-Cfg $cfg 'sshHost' ''
$SshUser = Get-Cfg $cfg 'sshUser' ''
$SshPort = [int](Get-Cfg $cfg 'sshPort' 22)
$ServerUtcOffset = [double](Get-Cfg $cfg 'serverUtcOffsetHours' 0)   # gio tren ten file la gio may chu (VPS thuong la UTC)
$SshKey = Get-Cfg $cfg 'sshKey' (Join-Path $env:USERPROFILE '.ssh\gss_backup')

if ($Transport -notin @('ssh', 'folder')) { Write-Error "transport phai la 'ssh' hoac 'folder'"; exit 1 }
if ($Transport -eq 'ssh' -and (-not $SshHost -or -not $SshUser)) { Write-Error 'Thieu sshHost/sshUser trong cau hinh'; exit 1 }

New-Item -ItemType Directory -Force -Path $LocalDir | Out-Null
$LogFile = Join-Path $LocalDir 'pull.log'
$StateFile = Join-Path $LocalDir 'last_ok.json'
$WarnFile = Join-Path $LocalDir 'CANH_BAO.txt'

function Write-Log([string]$msg, [string]$level = 'INFO') {
    $line = '[{0}] {1} {2}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $level, $msg
    Write-Host $line
    try {
        if ((Test-Path -LiteralPath $LogFile) -and (Get-Item -LiteralPath $LogFile).Length -gt 2MB) {
            Move-Item -Force -LiteralPath $LogFile -Destination "$LogFile.1"
        }
        Add-Content -LiteralPath $LogFile -Value $line -Encoding UTF8
    } catch { }
}

# Thu muc chi cho nguoi dung hien tai (ban sao luu chua du lieu cong ty, ca nhan, chung tu)
function Protect-LocalDir {
    $marker = Join-Path $LocalDir '.acl_set'
    if (Test-Path -LiteralPath $marker) { return }
    & icacls.exe $LocalDir /inheritance:r /grant:r "$($env:USERNAME):(OI)(CI)F" | Out-Null
    if ($LASTEXITCODE -eq 0) { Set-Content -LiteralPath $marker -Value (Get-Date -Format o) }
    else { Write-Log 'Khong dat duoc quyen rieng cho thu muc sao luu (icacls)' 'WARN' }
}

function Get-SshArgs {
    $a = @('-o', 'BatchMode=yes', '-o', "ConnectTimeout=$ConnectTimeout", '-o', 'StrictHostKeyChecking=yes',
           '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=4')
    if (Test-Path -LiteralPath $SshKey) { $a += @('-i', $SshKey, '-o', 'IdentitiesOnly=yes') }
    return $a
}
function Find-Tool([string]$exe) {
    $win = Join-Path $env:SystemRoot "System32\OpenSSH\$exe.exe"
    if (Test-Path -LiteralPath $win) { return $win }
    $c = Get-Command $exe -ErrorAction SilentlyContinue
    if ($c) { return $c.Source }
    throw "Khong tim thay $exe (bat tinh nang OpenSSH Client cua Windows)"
}

# --- truy cap nguon (ssh hoac thu muc) ---
function Get-RemoteNames {
    if ($Transport -eq 'folder') {
        return @(Get-ChildItem -LiteralPath $RemoteDir -File | ForEach-Object { $_.Name })
    }
    $out = & (Find-Tool 'ssh') @(Get-SshArgs) -p $SshPort "$SshUser@$SshHost" "ls -1 '$RemoteDir'"
    if ($LASTEXITCODE -ne 0) { throw "ssh ls that bai (ma $LASTEXITCODE)" }
    return @($out)
}
function Get-RemoteText([string]$name) {
    if ($Transport -eq 'folder') {
        $p = Join-Path $RemoteDir $name
        if (Test-Path -LiteralPath $p) { return (Get-Content -LiteralPath $p -Raw) } else { return $null }
    }
    $out = & (Find-Tool 'ssh') @(Get-SshArgs) -p $SshPort "$SshUser@$SshHost" "cat '$RemoteDir/$name'"
    if ($LASTEXITCODE -ne 0) { return $null }
    return ($out -join "`n")
}
function Copy-Remote([string]$name, [string]$dest) {
    if ($Transport -eq 'folder') { Copy-Item -LiteralPath (Join-Path $RemoteDir $name) -Destination $dest -Force; return }
    & (Find-Tool 'scp') @(Get-SshArgs) -O -P $SshPort -q "${SshUser}@${SshHost}:$RemoteDir/$name" $dest
    if ($LASTEXITCODE -ne 0) { throw "scp that bai cho $name (ma $LASTEXITCODE)" }
}

function Get-Stamp([string]$name) {
    if ($name -match '_(\d{8}_\d{4})\.') {
        return [datetime]::ParseExact($Matches[1], 'yyyyMMdd_HHmm', [Globalization.CultureInfo]::InvariantCulture)
    }
    return $null
}
function Get-AgeHours([string]$name) {
    $utc = [datetime]::SpecifyKind((Get-Stamp $name).AddHours(-$ServerUtcOffset), [DateTimeKind]::Utc)
    return ((Get-Date).ToUniversalTime() - $utc).TotalHours
}
function Test-GzipFile([string]$path) {
    $fs = [IO.File]::OpenRead($path)
    try {
        $gz = New-Object IO.Compression.GZipStream($fs, [IO.Compression.CompressionMode]::Decompress)
        try { $gz.CopyTo([IO.Stream]::Null) } finally { $gz.Dispose() }
        return $true
    } catch { return $false } finally { $fs.Dispose() }
}
function Get-Sha([string]$path) { (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant() }

# --- chi kiem tra cac ban da luu ---
if ($VerifyOnly) {
    $bad = 0
    foreach ($f in Get-ChildItem -LiteralPath $LocalDir -File | Where-Object { $_.Name -match $NamePattern }) {
        $shaFile = "$($f.FullName).sha256"
        $ok = Test-GzipFile $f.FullName
        if ($ok -and (Test-Path -LiteralPath $shaFile)) {
            $want = ((Get-Content -LiteralPath $shaFile -Raw) -split '\s+')[0].ToLowerInvariant()
            $ok = ($want -eq (Get-Sha $f.FullName))
        }
        Write-Log ('{0}: {1}' -f $f.Name, $(if ($ok) { 'dat' } else { 'HONG' })) $(if ($ok) { 'INFO' } else { 'ERROR' })
        if (-not $ok) { $bad++ }
    }
    foreach ($f in Get-ChildItem -LiteralPath $LocalDir -File -Filter '*.age') { Write-Log "$($f.Name): da ma hoa age (giai ma bang age -d de kiem tra)" }
    if ($bad -gt 0) { exit 1 } else { exit 0 }
}

# --- tranh chay trung ---
$mutex = New-Object Threading.Mutex($false, 'Global\GSS_BACKUP_PULL')
if (-not $mutex.WaitOne(0)) { Write-Log 'Dang co lan keo khac chay -> bo qua'; exit 0 }
try {
    Protect-LocalDir

    if ($Scheduled -and -not $Force -and (Test-Path -LiteralPath $StateFile)) {
        $last = [datetime]((Get-Content -LiteralPath $StateFile -Raw | ConvertFrom-Json).time)
        if ($last -ge (Get-Date).Date) { Write-Log "Hom nay da keo xong luc $($last.ToString('HH:mm')) -> bo qua"; exit 0 }
    }

    Write-Log "Bat dau keo ban sao luu ($Transport)"
    try { $names = Get-RemoteNames }
    catch {
        Write-Log "Khong ket noi duoc nguon sao luu (may chu/mang tat?): $($_.Exception.Message). Se thu lai o lan chay sau." 'WARN'
        exit 3
    }
    $names = @($names | Where-Object { $_ -match $NamePattern })

    # Ban CSDL tren may chu qua cu -> yeu cau tao ban moi (neu co cau hinh)
    if ($Transport -eq 'ssh' -and $RemoteBackupCommand) {
        $newestDb = $names | Where-Object { $_ -like 'db_*' } | Sort-Object -Descending | Select-Object -First 1
        $age = if ($newestDb) { (Get-AgeHours $newestDb) } else { [double]::MaxValue }
        if ($age -gt $RemoteBackupMaxAgeHours) {
            Write-Log "Ban moi nhat tren may chu cu $([math]::Round([math]::Min($age, 99999),1)) gio -> yeu cau tao ban moi"
            & (Find-Tool 'ssh') @(Get-SshArgs) -p $SshPort "$SshUser@$SshHost" $RemoteBackupCommand
            if ($LASTEXITCODE -ne 0) { Write-Log "Lenh tao ban sao luu tren may chu tra ma $LASTEXITCODE" 'WARN' }
            else { $names = @((Get-RemoteNames) | Where-Object { $_ -match $NamePattern }) }
        }
    }
    if ($names.Count -eq 0) { Write-Log 'Nguon khong co ban sao luu nao' 'ERROR'; exit 1 }

    $dbs = @($names | Where-Object { $_ -like 'db_*' } | Sort-Object -Descending)
    $media = @($names | Where-Object { $_ -like 'media_*' } | Sort-Object -Descending)
    $want = New-Object Collections.Generic.List[string]
    if ($media.Count -gt 0) {
        $m = $media[0]; $want.Add($m)
        $pairDb = $m -replace '^media_', 'db_' -replace '\.tar\.gz$', '.sql.gz'
        if ($dbs -contains $pairDb) { $want.Add($pairDb) }
    }
    if ($dbs.Count -gt 0 -and -not $want.Contains($dbs[0])) { $want.Add($dbs[0]) }

    $pulled = New-Object Collections.Generic.List[string]
    foreach ($name in $want) {
        $final = Join-Path $LocalDir $name
        if ((Test-Path -LiteralPath $final) -or (Test-Path -LiteralPath "$final.age")) { Write-Log "$name da co -> bo qua"; $pulled.Add($name); continue }
        $part = "$final.part"
        Remove-Item -LiteralPath $part -Force -ErrorAction SilentlyContinue
        Write-Log "Tai $name"
        Copy-Remote $name $part
        $shaText = Get-RemoteText "$name.sha256"
        if (-not $shaText -and $Transport -eq 'ssh') {
            # Ban cu khong co .sha256: nho may chu tinh ngay (van phat hien loi khi truyen, khong phat hien hong tu truoc)
            Write-Log "$name chua co .sha256 tren may chu -> dung sha256sum tinh tai cho" 'WARN'
            $shaText = (& (Find-Tool 'ssh') @(Get-SshArgs) -p $SshPort "$SshUser@$SshHost" "sha256sum '$RemoteDir/$name'") -join ' '
        }
        if (-not $shaText) {
            Remove-Item -LiteralPath $part -Force -ErrorAction SilentlyContinue
            throw "$name khong lay duoc checksum tu may chu -> khong chap nhan ban chua doi chieu"
        }
        $wantSha = ($shaText.Trim() -split '\s+')[0].ToLowerInvariant()
        if ($wantSha -ne (Get-Sha $part)) {
            Remove-Item -LiteralPath $part -Force -ErrorAction SilentlyContinue
            throw "Sai checksum sau khi tai $name (file hong khi truyen) -> da xoa ban tai do"
        }
        if (-not (Test-GzipFile $part)) {
            Remove-Item -LiteralPath $part -Force -ErrorAction SilentlyContinue
            throw "$name khong giai nen duoc"
        }
        Move-Item -LiteralPath $part -Destination $final
        Set-Content -LiteralPath "$final.sha256" -Value "$wantSha  $name" -Encoding ASCII
        if ($AgeRecipient) {
            $age = Get-Command age -ErrorAction SilentlyContinue
            if (-not $age) { Write-Log 'Da dat ageRecipient nhung chua co age.exe -> giu ban chua ma hoa' 'WARN' }
            else {
                & $age.Source -r $AgeRecipient -o "$final.age" $final
                if ($LASTEXITCODE -eq 0) { Remove-Item -LiteralPath $final -Force; Write-Log "$name da ma hoa age" }
                else { Write-Log "Ma hoa age that bai cho $name -> giu ban chua ma hoa" 'WARN' }
            }
        }
        Write-Log ('Xong {0} ({1:N1} MB, sha256 khop)' -f $name, ((Get-Item -LiteralPath $(if (Test-Path -LiteralPath $final) { $final } else { "$final.age" })).Length / 1MB))
        $pulled.Add($name)
    }

    # Don ban cu: qua keepDays ngay VA khong nam trong keepMinSets bo moi nhat moi loai
    $local = @(Get-ChildItem -LiteralPath $LocalDir -File | Where-Object { $_.Name -match '^(db|media)_\d{8}_\d{4}\.(sql|tar)\.gz(\.age)?$' })
    # Bo CSDL di cung bo media con giu thi khong xoa (de khoi phuc duoc tron bo)
    $keepStamps = @($local | Where-Object { $_.Name -like 'media_*' } | Sort-Object Name -Descending | Select-Object -First $KeepMinSets |
        ForEach-Object { (Get-Stamp $_.Name).ToString('yyyyMMdd_HHmm') })
    foreach ($kind in @('db_', 'media_')) {
        $set = @($local | Where-Object { $_.Name -like "$kind*" } | Sort-Object Name -Descending)
        $set | Select-Object -Skip $KeepMinSets | Where-Object {
            ((Get-AgeHours $_.Name) / 24 -gt $KeepDays) -and ($keepStamps -notcontains (Get-Stamp $_.Name).ToString('yyyyMMdd_HHmm'))
        } | ForEach-Object {
            Remove-Item -LiteralPath $_.FullName -Force
            Remove-Item -LiteralPath "$($_.FullName -replace '\.age$','').sha256" -Force -ErrorAction SilentlyContinue
            Write-Log "Xoa ban cu $($_.Name)"
        }
    }

    $newest = Get-ChildItem -LiteralPath $LocalDir -File | Where-Object { $_.Name -match '^db_\d{8}_\d{4}\.sql\.gz(\.age)?$' } | Sort-Object Name -Descending | Select-Object -First 1
    @{ time = (Get-Date).ToString('o'); files = @($pulled) } | ConvertTo-Json | Set-Content -LiteralPath $StateFile -Encoding UTF8
    $newestAge = (Get-AgeHours $newest.Name)
    if ($newestAge -gt $StaleWarnHours) {
        $msg = "Ban CSDL moi nhat tren may local da $([math]::Round($newestAge,1)) gio tuoi (>$StaleWarnHours gio): kiem tra cron sao luu tren VPS."
        Set-Content -LiteralPath $WarnFile -Value $msg -Encoding UTF8
        Write-Log $msg 'WARN'
        exit 2
    }
    Remove-Item -LiteralPath $WarnFile -Force -ErrorAction SilentlyContinue
    Write-Log "Hoan tat. Ban CSDL moi nhat: $($newest.Name)"
    exit 0
} catch {
    Write-Log "LOI: $($_.Exception.Message)" 'ERROR'
    exit 1
} finally {
    $mutex.ReleaseMutex() | Out-Null
}
