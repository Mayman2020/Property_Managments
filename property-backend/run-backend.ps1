[CmdletBinding()]
param(
    [string]$Profile = "",
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$DefaultPort = 8080
$PortRangeEnd = 8090
$ExpectedProcess = "java"
$ContextPath = "/api/v1"

$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$ProjectRoot = $ScriptDir
$MvnwPath = Join-Path $ProjectRoot "mvnw.cmd"
$SecretsFile = Join-Path $ProjectRoot "run-backend.secrets.ps1"
$WorkspaceRoot = Split-Path -Parent $ProjectRoot
$RuntimeDir = Join-Path $WorkspaceRoot ".runtime"
$RuntimeStateFile = Join-Path $RuntimeDir "launcher-state.json"

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

# Optional local secret file, kept outside git.
if ((-not $env:DB_PASS -or $env:DB_PASS.Trim() -eq "") -and (Test-Path $SecretsFile)) {
    Write-Info "Loading local secrets: $SecretsFile"
    . $SecretsFile
}
if (-not $env:DB_PASS -or $env:DB_PASS.Trim() -eq "") {
    Write-Warn "DB_PASS is not set. Using app default chain (DB_PASS/SPRING_DATASOURCE_PASSWORD/DB_PASSWORD), default value is 'admin'."
    Write-Info "  Tip: create run-backend.secrets.ps1 and set `$env:DB_PASS = 'your-postgres-password'"
}

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

function Stop-ProcessOnPort {
    param([int]$Port, [string]$ExpectedName)
    $found = Get-ProcessOnPort -Port $Port
    if (-not $found) {
        Write-Info "Port $Port is free."
        return $true
    }
    $proc = $found.Process
    $pidVal = $proc.Id
    $procName = $proc.ProcessName
    $match = $procName -like "*$ExpectedName*"
    if (-not $match) {
        Write-Warn "Port $Port is used by $procName (PID $pidVal), not $ExpectedName. Not killing for safety."
        return $false
    }
    Write-Step "Port $Port is used by $procName (PID $pidVal) -> stopping process..." "Yellow"
    try {
        Stop-Process -Id $pidVal -Force -ErrorAction Stop
    } catch {
        Write-Err "Failed to stop process: $_"
        return $false
    }
    Start-Sleep -Seconds 2
    if (Get-ProcessOnPort -Port $Port) {
        Write-Err "Process stopped but port $Port is still in use."
        return $false
    }
    Write-Success "Process stopped successfully."
    return $true
}

function Find-FreePort {
    param([int]$StartPort, [int]$EndPort)
    foreach ($candidate in $StartPort..$EndPort) {
        $occupied = Get-ProcessOnPort -Port $candidate
        if (-not $occupied) {
            return $candidate
        }
    }
    return $null
}

$JavaCandidates = @(
    $env:JAVA_HOME,
    "D:\Progs\Progs Work\jdk_17_new_java",
    "C:\Program Files\Java\jdk-17",
    "C:\Program Files\Eclipse Adoptium\jdk-17*",
    "C:\Program Files\Microsoft\jdk-17*"
)
$ResolvedJavaHome = $null
foreach ($candidate in $JavaCandidates) {
    if (-not $candidate) { continue }
    $path = if ($candidate -match '\*') { (Get-Item $candidate -ErrorAction SilentlyContinue | Select-Object -First 1).FullName } else { $candidate }
    if ($path -and (Test-Path $path) -and (Test-Path (Join-Path $path "bin\java.exe"))) {
        $ResolvedJavaHome = $path
        break
    }
}
if (-not $ResolvedJavaHome) {
    Write-Err "JAVA_HOME not found. Set JAVA_HOME or install JDK 17."
    exit 1
}
$env:JAVA_HOME = $ResolvedJavaHome
$env:Path = "$($env:JAVA_HOME)\bin;$env:Path"
Write-Step "Java configured" "Cyan"
$prevErr = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
& java -version 2>&1 | ForEach-Object { Write-Info "  $_" }
$ErrorActionPreference = $prevErr

if (-not (Test-Path $MvnwPath)) {
    Write-Err "Maven wrapper not found: $MvnwPath"
    exit 1
}
Set-Location $ProjectRoot

$pgPort = 5432
try {
    $pgListen = Get-NetTCPConnection -LocalPort $pgPort -State Listen -ErrorAction SilentlyContinue
    if (-not $pgListen) {
        Write-Warn "PostgreSQL does not appear to be listening on port $pgPort."
    }
} catch { }

Write-Step "Checking port $DefaultPort..." "Cyan"
$SelectedPort = $DefaultPort
$portState = Get-ProcessOnPort -Port $DefaultPort
if ($portState) {
    $portProc = $portState.Process
    if ($portProc -and ($portProc.ProcessName -like "*$ExpectedProcess*")) {
        if (-not (Stop-ProcessOnPort -Port $DefaultPort -ExpectedName $ExpectedProcess)) {
            exit 1
        }
    } else {
        Write-Warn "Port $DefaultPort is used by $($portProc.ProcessName) (PID $($portProc.Id))."
        $fallbackPort = Find-FreePort -StartPort ($DefaultPort + 1) -EndPort $PortRangeEnd
        if (-not $fallbackPort) {
            Write-Err "No free backend port found in range $($DefaultPort + 1)-$PortRangeEnd."
            exit 1
        }
        $SelectedPort = $fallbackPort
        Write-Warn "Switching backend to port $SelectedPort."
    }
} else {
    Write-Info "Port $DefaultPort is free."
}

if (-not $SkipBuild) {
    Write-Step "Maven build started..." "Cyan"
    & $MvnwPath clean install -U
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Maven build FAILED."
        exit $LASTEXITCODE
    }
    Write-Success "Maven build finished successfully."
} else {
    Write-Info "Skipping build (-SkipBuild)."
}

if ($Profile) {
    $env:SPRING_PROFILES_ACTIVE = $Profile
    Write-Step "Starting backend (profile: $Profile)..." "Cyan"
} else {
    if (Test-Path Env:SPRING_PROFILES_ACTIVE) { Remove-Item Env:SPRING_PROFILES_ACTIVE }
    Write-Step "Starting backend (default profile)..." "Cyan"
}
$BaseUrl = "http://localhost:$SelectedPort$ContextPath"
Write-Info "  Server: $BaseUrl"
Write-Info "  DB URL default: jdbc:postgresql://localhost:5432/postgres?currentSchema=property_mgmt"
Write-Info "  Stop with Ctrl+C"
Write-Host ""

if (-not (Test-Path $RuntimeDir)) {
    New-Item -ItemType Directory -Path $RuntimeDir | Out-Null
}
$runtimeState = @{
    backendPort = $SelectedPort
    backendBaseUrl = $BaseUrl
    backendFileBaseUrl = "http://localhost:$SelectedPort/api/v1/files"
    updatedAt = (Get-Date).ToString("o")
}
$runtimeState | ConvertTo-Json | Set-Content -Path $RuntimeStateFile -Encoding UTF8
Write-Info "  Runtime state file: $RuntimeStateFile"

$runArgs = @("spring-boot:run")
if ($Profile) { $runArgs += "-Dspring-boot.run.profiles=$Profile" }
$runArgs += "-Dspring-boot.run.arguments=--server.port=$SelectedPort --file.base-url=http://localhost:$SelectedPort"

& $MvnwPath @runArgs
$exitCode = $LASTEXITCODE

Write-Host ""
if ($exitCode -eq 0) {
    Write-Success "Backend stopped normally."
} else {
    Write-Err "Backend exited with failure (exit code $exitCode)."
}
exit $exitCode
