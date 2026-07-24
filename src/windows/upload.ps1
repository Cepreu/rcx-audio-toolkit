param (
    [string]$WorkingDirectory,
    [string]$CsvFile,
    [string]$Account,
    [switch]$AutoToken
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not $WorkingDirectory -or -not $CsvFile -or -not $Account) {
    Write-Host "Usage: .\rcx-audio.ps1 upload <working_directory> <csv_file> <account> [-AutoToken]" -ForegroundColor Red
    exit 1
}

# Load .env if present
$EnvFile = Join-Path $ScriptDir "..\..\\.env"
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
            [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim())
        }
    }
}

# -- Token management ---------------------------------------------------------

function Refresh-Token {
    if ($AutoToken) {
        Write-Host "[REFRESH] Token expired - refreshing via get_token.ps1..." -ForegroundColor Yellow
        $script:Token = & "$ScriptDir\get_token.ps1"
        if (-not $script:Token) {
            Write-Host "[ERROR] Failed to refresh token, exiting" -ForegroundColor Red
            exit 1
        }
        Write-Host "[OK] Token refreshed" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Token expired. Re-enter Bearer token:" -ForegroundColor Yellow
        $SecureToken = Read-Host "Enter Bearer token" -AsSecureString
        $script:Token = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureToken)
        )
        if (-not $script:Token) {
            Write-Host "[ERROR] No token entered, exiting" -ForegroundColor Red
            exit 1
        }
    }
}

# Initial token fetch
if ($AutoToken) {
    Write-Host "[AUTH] Fetching token via get_token.ps1..."
    $Token = & "$ScriptDir\get_token.ps1"
    if (-not $Token) {
        Write-Host "[ERROR] Failed to get token, exiting" -ForegroundColor Red
        exit 1
    }
} else {
    $SecureToken = Read-Host "Enter Bearer token" -AsSecureString
    $Token = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureToken)
    )
    if (-not $Token) {
        Write-Host "[ERROR] No token entered, exiting" -ForegroundColor Red
        exit 1
    }
}

# Validate token before starting batch
Write-Host "[AUTH] Validating token..."
try {
    $null = Invoke-RestMethod `
        -Method Get `
        -Uri "https://ringcx.ringcentral.com/cx/admin/v1/accounts/~/sub-accounts/$Account/accountaudio" `
        -Headers @{ Authorization = "Bearer $Token"; Accept = "application/json" }
} catch {
    $ValidationCode = $_.Exception.Response.StatusCode.value__
    if ($ValidationCode -eq 401 -or -not $ValidationCode) {
        Write-Host "[WARN] Token invalid after fetch - refreshing before starting batch..." -ForegroundColor Yellow
        Refresh-Token
    }
}

# -- Upload helper -------------------------------------------------------------

function Invoke-Upload {
    param (
        [string]$FilePath,
        [string]$AudioName,
        [string]$Locale,
        [string]$File
    )

    $Boundary  = [System.Guid]::NewGuid().ToString()
    $FileBytes = [System.IO.File]::ReadAllBytes($FilePath)
    $Encoding  = [System.Text.Encoding]::UTF8

    $BodyLines = @(
        "--$Boundary",
        'Content-Disposition: form-data; name="accountId"',
        "",
        $Account,
        "--$Boundary",
        'Content-Disposition: form-data; name="audioName"',
        "",
        $AudioName,
        "--$Boundary",
        'Content-Disposition: form-data; name="locale"',
        "",
        $Locale,
        "--$Boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"$File`"",
        "Content-Type: audio/wav",
        ""
    )

    $BodyStart = $Encoding.GetBytes(($BodyLines -join "`r`n") + "`r`n")
    $BodyEnd   = $Encoding.GetBytes("`r`n--$Boundary--`r`n")
    $Body      = $BodyStart + $FileBytes + $BodyEnd

    try {
        $null = Invoke-RestMethod `
            -Method Post `
            -Uri "https://ringcx.ringcentral.com/cx/admin/v1/accounts/~/sub-accounts/$Account/accountaudio" `
            -Headers @{
                Authorization = "Bearer $script:Token"
                Accept        = "application/json"
            } `
            -ContentType "multipart/form-data; boundary=$Boundary" `
            -Body $Body
        return 201
    } catch {
        $StatusCode = $_.Exception.Response.StatusCode.value__
        if (-not $StatusCode) { $StatusCode = 0 }
        return $StatusCode
    }
}

# -- Upload loop --------------------------------------------------------------

$FirstUpload = $true

Import-Csv -Path $CsvFile | ForEach-Object {
    $File      = $_.File
    $AudioName = $_.AudioName
    $Locale    = $_.Locale
    $FilePath  = Join-Path $WorkingDirectory $File

    if (-not (Test-Path $FilePath)) {
        Write-Host "[ERROR] $AudioName ($Locale) - file not found: $FilePath" -ForegroundColor Red
        return
    }

    $StatusCode = Invoke-Upload -FilePath $FilePath -AudioName $AudioName -Locale $Locale -File $File

    # On 401 or 0 (connection failure), refresh token once and retry
    if ($StatusCode -eq 401 -or $StatusCode -eq 0) {
        Write-Host "[WARN] $AudioName ($Locale) - $StatusCode received, refreshing token and retrying..." -ForegroundColor Yellow
        Refresh-Token
        $StatusCode = Invoke-Upload -FilePath $FilePath -AudioName $AudioName -Locale $Locale -File $File
    }

    if ($StatusCode -eq 201) {
        Write-Host "[OK] $AudioName ($Locale) - uploaded" -ForegroundColor Green
        # TEST ONLY: sleep 6 minutes after first upload to trigger token expiry
        if ($FirstUpload) {
            $FirstUpload = $false
            Write-Host "[TEST] Sleeping 6 minutes to trigger token expiry..." -ForegroundColor Cyan
            Start-Sleep -Seconds 360
            Write-Host "[TEST] Sleep done, continuing batch..." -ForegroundColor Cyan
        }
    } else {
        Write-Host "[ERROR] $AudioName ($Locale) - failed ($StatusCode)" -ForegroundColor Red
    }
}
