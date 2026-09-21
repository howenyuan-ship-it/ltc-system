# 關閉外部測試通道，收回對外存取
# 用法：先在 cloudflared 視窗按 Ctrl+C，再執行 .\scripts\demo-stop.ps1

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "收回外部存取 (ALLOWED_HOSTS 改回本機)..." -ForegroundColor Cyan
(Get-Content backend\.env) -replace '^ALLOWED_HOSTS=.*', 'ALLOWED_HOSTS=localhost,127.0.0.1,backend' |
    Set-Content backend\.env -Encoding ascii
docker compose up -d --force-recreate backend

Write-Host ""
Write-Host "完成。系統仍在本機執行，http://localhost 可以開。" -ForegroundColor Green
Write-Host "要連系統一起停掉： docker compose down" -ForegroundColor DarkGray
