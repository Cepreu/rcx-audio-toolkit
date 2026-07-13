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

$ClientId     = $env:RINGCENTRAL_CLIENT_ID
$ClientSecret = $env:RINGCENTRAL_CLIENT_SECRET
$Jwt          = $env:RINGCENTRAL_JWT

if (-not $ClientId -or -not $ClientSecret -or -not $Jwt) {
    Write-Error "❌ Missing required environment variables: RINGCENTRAL_CLIENT_ID, RINGCENTRAL_CLIENT_SECRET, RINGCENTRAL_JWT"
    exit 1
}

# Step 1: RingCentral platform token
$BasicAuth = [Convert]::ToBase64String(
    [System.Text.Encoding]::UTF8.GetBytes("${ClientId}:${ClientSecret}")
)

$RcResponse = Invoke-RestMethod `
    -Method Post `
    -Uri "https://platform.ringcentral.com/restapi/oauth/token" `
    -Headers @{ Authorization = "Basic $BasicAuth" } `
    -ContentType "application/x-www-form-urlencoded" `
    -Body "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=$Jwt"

$RcToken = $RcResponse.access_token

if (-not $RcToken) {
    Write-Error "❌ Failed to get RingCentral token"
    exit 1
}
Write-Host "✅ RingCentral token received" -ForegroundColor Green

# Step 2: RingCX token exchange
$RcxResponse = Invoke-RestMethod `
    -Method Post `
    -Uri "https://engage.ringcentral.com/api/auth/login/rc/accesstoken" `
    -ContentType "application/x-www-form-urlencoded" `
    -Headers @{ Accept = "application/json" } `
    -Body "rcTokenType=Bearer&rcAccessToken=$RcToken"

$RcxToken = $RcxResponse.accessToken

if (-not $RcxToken) {
    Write-Error "❌ Failed to get RingCX token"
    exit 1
}
Write-Host "✅ RingCX token received" -ForegroundColor Green

return $RcxToken
