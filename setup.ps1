# ============================================================
# PersonaForge — Automated Setup Script (Windows PowerShell)
# ============================================================

Write-Host "🚀 PersonaForge Setup Starting..." -ForegroundColor Cyan
Write-Host ""

# Check if Bun is installed
$bunExists = Get-Command bun -ErrorAction SilentlyContinue

if (-not $bunExists) {
    Write-Host "⚠️  Bun not found. Installing Bun..." -ForegroundColor Yellow
    Write-Host "   (This requires administrator privileges)" -ForegroundColor Gray
    
    try {
        # Install Bun
        powershell -c "irm bun.sh/install.ps1 | iex"
        
        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        Write-Host "✅ Bun installed successfully" -ForegroundColor Green
        Write-Host "   Please restart your terminal and run this script again" -ForegroundColor Yellow
        Write-Host ""
        exit 0
    } catch {
        Write-Host "❌ Failed to install Bun. Please install manually:" -ForegroundColor Red
        Write-Host "   https://bun.sh/docs/installation" -ForegroundColor Gray
        Write-Host ""
        Write-Host "   Or use npm instead of bun for all commands" -ForegroundColor Gray
        exit 1
    }
}

Write-Host "✅ Bun found: $(bun --version)" -ForegroundColor Green
Write-Host ""

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
try {
    bun install
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "   Please create .env from .env.example and add your API keys" -ForegroundColor Yellow
    exit 1
}

# Push database schema
Write-Host "🗄️  Pushing database schema..." -ForegroundColor Cyan
try {
    bun run db:push
    Write-Host "✅ Database schema created" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to push database schema" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Seed database
Write-Host "🌱 Seeding database with sample data..." -ForegroundColor Cyan
Write-Host "   (This generates 1000 users with events and identity signals)" -ForegroundColor Gray
try {
    $env:SEED_SAMPLE_USERS = "true"
    bun run db:seed
    Write-Host "✅ Database seeded successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to seed database" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Run type check
Write-Host "🔍 Running type check..." -ForegroundColor Cyan
try {
    bun run typecheck
    Write-Host "✅ Type check passed" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Type check found issues (non-fatal)" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✨ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To start the development server:" -ForegroundColor White
Write-Host "   bun run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "Then open:" -ForegroundColor White
Write-Host "   http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "To run tests:" -ForegroundColor White
Write-Host "   bun test src/lib/tests/unit" -ForegroundColor Cyan
Write-Host ""
Write-Host "Demo views to showcase:" -ForegroundColor White
Write-Host "   1. Identity Resolution (cross-channel stitching)" -ForegroundColor Gray
Write-Host "   2. User Explorer (consent badges)" -ForegroundColor Gray
Write-Host "   3. Personalization Center (consent-aware content)" -ForegroundColor Gray
Write-Host "   4. Explainability (consent impact statements)" -ForegroundColor Gray
Write-Host "   5. Bandit Optimizer (Thompson Sampling)" -ForegroundColor Gray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
