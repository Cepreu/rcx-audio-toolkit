param (
    [string]$Command,
    [Parameter(ValueFromRemainingArguments)][string[]]$RestArgs
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Show-Usage {
    Write-Host ""
    Write-Host "Usage: .\rcx-audio.ps1 <command> <working_directory> <csv_file> <account> [-AutoToken]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  upload   Upload audio files from a CSV list"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\rcx-audio.ps1 upload C:\audio files.csv 2114002"
    Write-Host "  .\rcx-audio.ps1 upload C:\audio files.csv 2114002 -AutoToken"
    Write-Host ""
    exit 1
}

if (-not $Command) {
    Write-Host "Error: No command specified." -ForegroundColor Red
    Show-Usage
}

switch ($Command) {
    "upload" {
        # Extract positional args and -AutoToken switch separately
        $AutoToken        = $RestArgs -contains "-AutoToken"
        $PositionalArgs   = $RestArgs | Where-Object { $_ -ne "-AutoToken" }

        if ($PositionalArgs.Count -lt 3) {
            Write-Host "Error: 'upload' requires <working_directory> <csv_file> <account>." -ForegroundColor Red
            Show-Usage
        }

        $WorkingDirectory = $PositionalArgs[0]
        $CsvFile          = $PositionalArgs[1]
        $Account          = $PositionalArgs[2]

        if ($AutoToken) {
            & "$ScriptDir\src\windows\upload.ps1" -WorkingDirectory $WorkingDirectory -CsvFile $CsvFile -Account $Account -AutoToken
        } else {
            & "$ScriptDir\src\windows\upload.ps1" -WorkingDirectory $WorkingDirectory -CsvFile $CsvFile -Account $Account
        }
    }
    default {
        Write-Host "Error: Unknown command '$Command'." -ForegroundColor Red
        Show-Usage
    }
}
