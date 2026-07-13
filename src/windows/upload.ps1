param (
    [Parameter(Mandatory)][string]$WorkingDirectory,
    [Parameter(Mandatory)][string]$CsvFile,
    [Parameter(Mandatory)][string]$Account,
    [switch]$AutoToken
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Load .env if present
$EnvFile = Join-Path $ScriptDir "..\..\\.env"
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
            [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim())
        }
    }
}

# Get token
if ($AutoToken) {
    Write-Host "🔑 Fetching token via get_token.ps1..."
    $Token = & "$ScriptDir\get_token.ps1"
    if (-not $Token) {
        Write-Error "❌ Failed to get token, exiting"
        exit 1
    }
} else {
    $SecureToken = Read-Host "🔑 Enter Bearer token" -AsSecureString
    $Token = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureToken)
    )
    if (-not $Token) {
        Write-Error "❌ No token entered, exiting"
        exit 1
    }
}

$BaseUrl = "https://ringcx.ringcentral.com/cx/admin/v1/accounts/~/sub-accounts/$Account/accountaudio"

Import-Csv -Path $CsvFile | ForEach-Object {
    $File      = $_.File
    $AudioName = $_.AudioName
    $Locale    = $_.Locale
    $FilePath  = Join-Path $WorkingDirectory $File

    if (-not (Test-Path $FilePath)) {
        Write-Host "❌ $AudioName ($Locale) — file not found: $FilePath" -ForegroundColor Red
        return
    }

    # Build multipart form body
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
            -Uri $BaseUrl `
            -Headers @{
                Authorization = "Bearer $Token"
                Accept        = "application/json"
            } `
            -ContentType "multipart/form-data; boundary=$Boundary" `
            -Body $Body

        Write-Host "✅ $AudioName ($Locale) — uploaded" -ForegroundColor Green
    }
    catch {
        $StatusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "❌ $AudioName ($Locale) — failed ($StatusCode): $_" -ForegroundColor Red
    }
}
