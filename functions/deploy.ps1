# Cloud Functions 部署脚本 (PowerShell)
# 用于快速部署 Cloud Functions

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cloud Functions 部署脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 步骤 1: 检查 Firebase CLI
Write-Host "步骤 1: 检查 Firebase CLI..." -ForegroundColor Yellow
try {
    $firebaseVersion = firebase --version
    Write-Host "✅ Firebase CLI 已安装: $firebaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Firebase CLI 未安装" -ForegroundColor Red
    Write-Host "请运行: npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# 步骤 2: 检查登录状态
Write-Host "步骤 2: 检查 Firebase 登录状态..." -ForegroundColor Yellow
try {
    $projects = firebase projects:list 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 已登录 Firebase" -ForegroundColor Green
    } else {
        Write-Host "❌ 未登录或认证已过期" -ForegroundColor Red
        Write-Host "正在尝试登录..." -ForegroundColor Yellow
        firebase login
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ 登录失败" -ForegroundColor Red
            exit 1
        }
    }
} catch {
    Write-Host "❌ 无法检查登录状态" -ForegroundColor Red
    Write-Host "请手动运行: firebase login" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# 步骤 3: 选择项目
Write-Host "步骤 3: 选择 Firebase 项目..." -ForegroundColor Yellow
firebase use jcigar-c0e54
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 无法选择项目" -ForegroundColor Red
    Write-Host "请确认项目 ID 正确" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ 已选择项目: jcigar-c0e54" -ForegroundColor Green

Write-Host ""

# 步骤 4: 构建代码
Write-Host "步骤 4: 构建 TypeScript 代码..." -ForegroundColor Yellow
Set-Location functions
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 构建失败" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 代码构建成功" -ForegroundColor Green

Write-Host ""

# 步骤 5: 部署函数
Write-Host "步骤 5: 部署 Cloud Functions..." -ForegroundColor Yellow
Write-Host "这可能需要几分钟时间..." -ForegroundColor Gray
Set-Location ..
firebase deploy --only functions
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 部署失败" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ 部署完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "部署的函数:" -ForegroundColor Cyan
Write-Host "  - sendNotification (HTTP Callable)" -ForegroundColor White
Write-Host "  - onReloadVerified (Firestore Trigger)" -ForegroundColor White
Write-Host "  - sendEventReminders (Scheduled)" -ForegroundColor White
Write-Host ""
Write-Host "下一步:" -ForegroundColor Yellow
Write-Host "  1. 访问 Firebase Console 查看函数: https://console.firebase.google.com/project/jcigar-c0e54/functions" -ForegroundColor White
Write-Host "  2. 测试推送通知功能" -ForegroundColor White
Write-Host "  3. 查看部署指南: functions/DEPLOYMENT.md" -ForegroundColor White

