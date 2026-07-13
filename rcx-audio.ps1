param (
    [Parameter(Mandatory)][string]$Command,
    [Parameter(ValueFromRemainingArguments)][string[]]$Args
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Show-Usage {
    Write-Host "Usage: .\rcx-audio.ps1 <command> <working_directory> <csv_file> <account> [-AutoToken]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  upload   Upload audio files from a CSV list"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\rcx-audio.ps1 upload C:\audio files.csv 2114002"
    Write-Host "  .\rcx-audio.ps1 upload C:\audio files.csv 2114002 -AutoToken"
    exit 1
}

switch ($Command) {
    "upload" {
        & "$ScriptDir\src\windows\upload.ps1" @Args
    }
    default {
        Write-Host "❌ Unknown command: $Command" -ForegroundColor Red
        Show-Usage
    }
}
