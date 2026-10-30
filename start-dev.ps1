Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Starting MedConnect Local Development Environment...  " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$root = $PSScriptRoot

if (-not (Test-Path "$root\backend\node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    Start-Process -FilePath "npm.cmd" -ArgumentList "install" -WorkingDirectory "$root\backend" -Wait -NoNewWindow
}

if (-not (Test-Path "$root\frontend\node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    Start-Process -FilePath "npm.cmd" -ArgumentList "install" -WorkingDirectory "$root\frontend" -Wait -NoNewWindow
}

Write-Host "Starting Backend API on Port 5000..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$root\backend`" && npm.cmd start"

Start-Sleep -Seconds 2

Write-Host "Starting Frontend on Port 5173..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$root\frontend`" && npm.cmd run dev"

Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"
