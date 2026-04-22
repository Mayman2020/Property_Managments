[CmdletBinding()]
param(
    [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'
$DefaultPort = 4500

$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$ProjectRoot = $ScriptDir
$WorkspaceRoot = Split-Path -Parent $ProjectRoot
$RuntimeStateFile = Join-Path $WorkspaceRoot ".runtime\launcher-state.json"
$RuntimeConfigJs = Join-Path $ProjectRoot "src\assets\runtime-config.js"

function Write-Step {
    param([string]$Message, [string]$Color = "Cyan")
    $ts = Get-Date -Format "HH:mm:ss"
    Write-Host "[$ts] " -NoNewline
    Write-Host $Message -ForegroundColor $Color
}
function Write-Success { param([string]$Message) Write-Step $Message "Green" }
function Write-Warn { param([string]$Message) Write-Step $Message "Yellow" }
function Write-Err { param([string]$Message) Write-Step $Message "Red" }
function Write-Info { param([string]$Message) Write-Step $Message "Gray" }

function Get-ProcessOnPort {
    param([int]$Port)
    try {
        $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($conn) {
            $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
            return @{ Process = $proc; Connection = $conn }
        }
    } catch { }
    try {
        $line = netstat -ano 2>$null | Select-String ":\$Port\s+.*LISTENING" | Select-Object -First 1
        if ($line) {
            $parts = ($line -split '\s+')
            $pidVal = $parts[-1]
            if ($pidVal -match '^\d+$') {
                $proc = Get-Process -Id $pidVal -ErrorAction SilentlyContinue
                if ($proc) { return @{ Process = $proc } }
            }
        }
    } catch { }
    return $null
}

function Ensure-FixedPortAvailable {
    param([int]$Port)
    $found = Get-ProcessOnPort -Port $Port
    if (-not $found) {
        Write-Info "Port $Port is free."
        return
    }

    $proc = $found.Process
    $pidVal = $proc.Id
    $procName = $proc.ProcessName
    if ($procName -like "*node*") {
        Write-Warn "Port $Port is used by node (PID $pidVal). Stopping it to keep fixed port policy."
        Stop-Process -Id $pidVal -Force -ErrorAction Stop
        Start-Sleep -Seconds 2
        if (Get-ProcessOnPort -Port $Port) {
            throw "Failed to free fixed port $Port."
        }
        Write-Success "Freed port $Port."
        return
    }

    throw "Port $Port is occupied by $procName (PID $pidVal). Please stop it manually to run frontend on fixed port $Port."
}

Set-Location $ProjectRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Err "Node.js is not installed or not in PATH."
    exit 1
}

$nodeVersion = (& node -v).TrimStart("v")
$major = [int]($nodeVersion.Split(".")[0])

# Angular 17 is most stable on Node 18/20. Node 22 can trigger Vite/CLI runtime issues.
if (($major -ne 18) -and ($major -ne 20)) {
    Write-Warn "Detected Node.js v$nodeVersion. Recommended runtime for Angular 17 is Node 18 or 20."
    $nvmCommand = Get-Command nvm -ErrorAction SilentlyContinue
    if ($nvmCommand) {
        Write-Step "Trying to switch Node.js to v20 using nvm..." "Yellow"
        nvm use 20 | Out-Host
        $nodeVersion = (& node -v).TrimStart("v")
        $major = [int]($nodeVersion.Split(".")[0])
    }
}
if (($major -ne 18) -and ($major -ne 20)) {
    Write-Warn "Continuing with Node.js v$nodeVersion, but if Vite errors continue install/use Node 20 (recommended)."
}
Write-Info "Using Node.js v$nodeVersion"

# Ensure Angular CLI does not prompt for analytics and stays non-interactive.
$env:NG_CLI_ANALYTICS = "false"
$env:CI = "true"

# Hotfix for Angular 17 + Vite overlay text patch mismatch on some Windows setups.
# Prevents: "Failed to update Vite client error overlay text."
function Apply-AngularViteOverlayHotfix {
    $pluginFile = Join-Path $ProjectRoot "node_modules\@angular-devkit\build-angular\src\tools\vite\angular-memory-plugin.js"
    if (-not (Test-Path $pluginFile)) {
        Write-Warn "Angular memory plugin file not found; skipping Vite overlay hotfix."
        return
    }

    $content = Get-Content -Path $pluginFile -Raw
    if ($content -notmatch "Failed to update Vite client error overlay text") {
        return
    }
    if ($content -match "return originalContents;") {
        Write-Info "Vite overlay hotfix already applied."
        return
    }

    $old = "(0, node_assert_1.default)(originalContents !== updatedContents, 'Failed to update Vite client error overlay text.');"
    $new = @"
if (originalContents === updatedContents) {
        return originalContents;
    }
"@

    if ($content.Contains($old)) {
        $patched = $content.Replace($old, $new.TrimEnd())
        $patched | Set-Content -Path $pluginFile -Encoding UTF8
        Write-Info "Applied Angular Vite overlay hotfix."
    } else {
        Write-Warn "Could not patch exact assert line in angular-memory-plugin.js. Consider reinstalling deps with Node 20."
    }
}

if (-not $SkipInstall -and -not (Test-Path (Join-Path $ProjectRoot "node_modules"))) {
    Write-Step "Installing dependencies..." "Cyan"
    & npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Err "npm install failed."
        exit $LASTEXITCODE
    }
    Write-Success "Dependencies installed."
} elseif (-not $SkipInstall) {
    Write-Info "node_modules found. Skipping npm install."
}

Apply-AngularViteOverlayHotfix

$servePort = $DefaultPort
Ensure-FixedPortAvailable -Port $servePort

$backendApiUrl = "http://localhost:8080/api/v1"
$backendFileUrl = "http://localhost:8080/api/v1/files"
if (Test-Path $RuntimeStateFile) {
    try {
        $runtimeState = Get-Content -Path $RuntimeStateFile -Raw | ConvertFrom-Json
        if ($runtimeState.backendBaseUrl) { $backendApiUrl = [string]$runtimeState.backendBaseUrl }
        if ($runtimeState.backendFileBaseUrl) { $backendFileUrl = [string]$runtimeState.backendFileBaseUrl }
    } catch {
        Write-Warn "Runtime state file found but unreadable: $RuntimeStateFile"
    }
} else {
    Write-Warn "Runtime state file not found. Falling back to default backend http://localhost:8080."
}

$runtimeJsContent = @"
window.__PM_API_URL__ = '$backendApiUrl';
window.__PM_FILE_URL__ = '$backendFileUrl';
"@
$runtimeJsContent | Set-Content -Path $RuntimeConfigJs -Encoding UTF8
Write-Info "Backend API target: $backendApiUrl"
Write-Info "Runtime frontend config: $RuntimeConfigJs"

Write-Step "Starting frontend (ng serve)..." "Cyan"
Write-Info "  URL: http://localhost:$servePort"
Write-Info "  Stop with Ctrl+C"
Write-Host ""

& npx ng serve --project property-managments --port=$servePort
$exitCode = $LASTEXITCODE

Write-Host ""
if ($exitCode -eq 0) {
    Write-Success "Frontend stopped normally."
} else {
    Write-Err "Frontend exited with failure (exit code $exitCode)."
}
exit $exitCode
