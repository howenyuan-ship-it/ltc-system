# 開啟外部測試通道
# 用法：在專案根目錄執行 .\scripts\demo-start.ps1

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "[1/3] 啟動容器..." -ForegroundColor Cyan
docker compose up -d

Write-Host "[2/3] 開放外部 Host (ALLOWED_HOSTS=*)..." -ForegroundColor Cyan
(Get-Content backend\.env) -replace '^ALLOWED_HOSTS=.*', 'ALLOWED_HOSTS=*' |
    Set-Content backend\.env -Encoding ascii
docker compose up -d --force-recreate backend

Write-Host ""
Write-Host "[3/3] 開通道中，下面會印出網址，把它發給測試者" -ForegroundColor Green
Write-Host "      這個視窗要一直開著，按 Ctrl+C 結束通道" -ForegroundColor Yellow
Write-Host "      結束後記得執行 .\scripts\demo-stop.ps1 收回外部存取" -ForegroundColor Yellow
Write-Host ""

cloudflared tunnel --url http://localhost:80
