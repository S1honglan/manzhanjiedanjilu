param(
    [string]$LogDir = "..\development-logs"
)

$today = Get-Date -Format "yyyy-MM-dd"
$logPath = Join-Path $LogDir "$today.md"

if (-Not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir | Out-Null
}

if (-Not (Test-Path $logPath)) {
    @"
# 开发日志 - $today

## 已完成事项

- 

## 待办事项

- 

"@ | Set-Content -Path $logPath -Encoding UTF8
    Write-Host "已创建开发日志：$logPath"
} else {
    Write-Host "开发日志已存在：$logPath"
}
