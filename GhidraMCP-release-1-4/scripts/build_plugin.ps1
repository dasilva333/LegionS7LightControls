param(
  [Parameter(Mandatory = $true)] [string] $GhidraHome,
  [string] $GsonJar,
  [bool] $UseUpdatedFromChanges = $true,
  [switch] $PackageZip,
  [switch] $OverwriteZip,
  [string] $ZipName = "GhidraMCP-1-4_v2.zip"
)

$ErrorActionPreference = 'Stop'

function Write-Info($msg){ Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Warn($msg){ Write-Warning $msg }
function Write-Err($msg){ Write-Host "[ERROR] $msg" -ForegroundColor Red }
function Write-UTF8NoBOM([string]$Path, [string]$Content){
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllBytes($Path, $enc.GetBytes($Content))
}

# Allow env override for UseUpdatedFromChanges (useful when passing booleans is tricky)
if ($env:USE_UPDATED_FROM_CHANGES) {
  try { $UseUpdatedFromChanges = [System.Convert]::ToBoolean($env:USE_UPDATED_FROM_CHANGES) } catch {}
}

# Resolve repo layout
$RepoRoot = Split-Path -Parent $PSScriptRoot
$ExtRoot  = Join-Path $RepoRoot 'GhidraMCP-1-4\GhidraMCP'
$LibDir   = Join-Path $ExtRoot  'lib'
$BuildDir = Join-Path $RepoRoot 'build'

if (-not (Test-Path $ExtRoot)) { throw "Expected extension root at: $ExtRoot" }

New-Item -ItemType Directory -Force -Path $BuildDir, (Join-Path $BuildDir 'src\com\lauriewired'), (Join-Path $BuildDir 'classes'), (Join-Path $BuildDir 'artifacts') | Out-Null

# Step 1: Source preparation
$srcFile = Join-Path $BuildDir 'src\com\lauriewired\GhidraMCPPlugin.java'
if ($UseUpdatedFromChanges) {
  $changes = Join-Path $RepoRoot 'docs\changes.md'
  if (-not (Test-Path $changes)) { throw "changes.md not found: $changes" }
  $raw = Get-Content $changes -Raw
  # Extract first fenced code block tagged java
  $pattern = '(?s)```java\s*(.*?)\s*```'
  $m = [regex]::Match($raw, $pattern)
  if (-not $m.Success) { throw "Could not locate a ```java code block in changes.md" }
  $java = $m.Groups[1].Value
  if ($java -notmatch 'package\s+com\.lauriewired') { Write-Warn "Java block missing expected package declaration 'com.lauriewired'" }
  Write-UTF8NoBOM -Path $srcFile -Content $java

  # Also store a visible copy alongside sources
  $srcCopy = Join-Path $ExtRoot 'lib\GhidraMCP\com\lauriewired\sources\com\lauriewired\GhidraMCPPlugin_v2.java'
  New-Item -ItemType Directory -Force -Path (Split-Path $srcCopy) | Out-Null
  Write-UTF8NoBOM -Path $srcCopy -Content $java
  Write-Info "Extracted updated Java to: $srcFile and copied to sources folder."
}
else {
  $existing = Join-Path $ExtRoot 'lib\GhidraMCP\com\lauriewired\sources\com\lauriewired\GhidraMCPPlugin.java'
  $existingTxt = $existing + '.txt'
  $sourcePath = if (Test-Path $existing) { $existing } elseif (Test-Path $existingTxt) { $existingTxt } else { $null }
  if (-not $sourcePath) { throw "Java source not found: $existing or $existingTxt. Use -UseUpdatedFromChanges or ensure sources are present." }
  $code = Get-Content -Raw $sourcePath
  $insertionPoint = $code.IndexOf('this.server.setExecutor(null);')
  if ($insertionPoint -lt 0) { throw "Could not find server executor setup in source; cannot inject v2 routes." }
  $prefix = $code.Substring(0, $insertionPoint)
  $suffix = $code.Substring($insertionPoint)
  $v2Routes = @"
        // v2 REST routes
        this.server.createContext("/function/", exchange -> handleV2Function(exchange));
        this.server.createContext("/patch/", exchange -> handleV2Patch(exchange));
        this.server.createContext("/types/", exchange -> handleV2Types(exchange));
        this.server.createContext("/data/", exchange -> handleV2Data(exchange));
        this.server.createContext("/search/", exchange -> handleV2Search(exchange));
        this.server.createContext("/tags", exchange -> handleV2Tags(exchange));
        this.server.createContext("/bookmarks", exchange -> handleV2Bookmarks(exchange));
"@
  $code = $prefix + $v2Routes + $suffix
  $append = @"

    // ===== v2 REST handlers (minimal implementation) =====
    private void handleV2Function(com.sun.net.httpserver.HttpExchange exchange) throws java.io.IOException {
        Program program = getCurrentProgram();
        if (program == null) { sendResponse(exchange, "{}\n"); return; }
        String path = exchange.getRequestURI().getPath(); // /function/{id}/{action}
        String[] parts = path.split("/");
        if (parts.length < 4) { sendResponse(exchange, "{}\n"); return; }
        String id = parts[2];
        String action = parts[3];
        Function func = null;
        try {
            Address addr = program.getAddressFactory().getAddress(id);
            func = program.getFunctionManager().getFunctionAt(addr);
            if (func == null) func = program.getFunctionManager().getFunctionContaining(addr);
        } catch (Exception ignore) {}
        if (func == null) {
            for (Function f : program.getFunctionManager().getFunctions(true)) { if (f.getName().equals(id)) { func = f; break; } }
        }
        if (func == null) { sendResponse(exchange, "[]\n"); return; }
        switch (action) {
            case "callers": sendResponse(exchange, listCallers(program, func)); return;
            case "callees": sendResponse(exchange, listCallees(program, func)); return;
            case "cfg":     sendResponse(exchange, buildCfg(program, func)); return;
            case "pcode":   sendResponse(exchange, listPcode(program, func, false)); return;
            case "high_pcode": sendResponse(exchange, listPcode(program, func, true)); return;
            default: sendResponse(exchange, "[]\n");
        }
    }

    private String listCallers(Program program, Function func) {
        java.util.Set<String> out = new java.util.HashSet<>();
        Address entry = func.getEntryPoint();
        ReferenceIterator it = program.getReferenceManager().getReferencesTo(entry);
        while (it.hasNext()) { Reference r = it.next(); if (!r.getReferenceType().isCall()) continue; Function from = program.getFunctionManager().getFunctionContaining(r.getFromAddress()); if (from != null) out.add(from.getName()); }
        java.util.List<String> list = new java.util.ArrayList<>(out); java.util.Collections.sort(list); return String.join("\n", list);
    }

    private String listCallees(Program program, Function func) {
        java.util.Set<String> out = new java.util.HashSet<>();
        Listing listing = program.getListing();
        InstructionIterator it = listing.getInstructions(func.getBody(), true);
        while (it.hasNext()) { Instruction ins = it.next(); if (!ins.getFlowType().isCall()) continue; Reference[] refs = ins.getReferencesFrom(); if (refs != null) { for (Reference r : refs) { if (!r.getReferenceType().isCall()) continue; Function to = program.getFunctionManager().getFunctionAt(r.getToAddress()); if (to != null) out.add(to.getName()); } } }
        java.util.List<String> list = new java.util.ArrayList<>(out); java.util.Collections.sort(list); return String.join("\n", list);
    }

    private String buildCfg(Program program, Function func) {
        try {
            ghidra.program.model.block.SimpleBlockModel model = new ghidra.program.model.block.SimpleBlockModel(program);
            ghidra.program.model.block.CodeBlockIterator bit = model.getCodeBlocksContaining(func.getBody(), new ghidra.util.task.ConsoleTaskMonitor());
            java.util.Map<String,Integer> idx = new java.util.HashMap<>(); java.util.List<String> nodes = new java.util.ArrayList<>(); java.util.List<String> edges = new java.util.ArrayList<>(); int i = 0;
            while (bit.hasNext()) { ghidra.program.model.block.CodeBlock b = bit.next(); String start = b.getMinAddress().toString(); String end = b.getMaxAddress().toString(); String nid = start; idx.put(nid, i++); nodes.add("{\"id\":\""+nid+"\",\"start\":\""+start+"\",\"end\":\""+end+"\"}"); }
            bit = model.getCodeBlocksContaining(func.getBody(), new ghidra.util.task.ConsoleTaskMonitor());
            while (bit.hasNext()) { ghidra.program.model.block.CodeBlock b = bit.next(); String from = b.getMinAddress().toString(); ghidra.program.model.block.CodeBlockReferenceIterator it = b.getDestinations(new ghidra.util.task.ConsoleTaskMonitor()); while (it.hasNext()) { ghidra.program.model.block.CodeBlockReference ref = it.next(); String to = ref.getDestinationBlock().getMinAddress().toString(); edges.add("{\"from\":\""+from+"\",\"to\":\""+to+"\"}"); } }
            return "{\"nodes\":[" + String.join(",", nodes) + "],\"edges\":[" + String.join(",", edges) + "]}";
        } catch (Exception e) { return "{\"error\":\"cfg failed: " + e.getMessage().replace("\"","'") + "\"}"; }
    }

    private String listPcode(Program program, Function func, boolean high) {
        DecompInterface di = new DecompInterface();
        try { di.openProgram(program); DecompileResults res = di.decompileFunction(func, 30, (TaskMonitor)new ConsoleTaskMonitor()); if (!res.decompileCompleted()) return "Decompile failed: " + res.getErrorMessage(); HighFunction hf = res.getHighFunction(); java.util.List<String> out = new java.util.ArrayList<>(); java.util.Iterator<?> it = high ? hf.getPcodeOps() : hf.getPcodeOps(func.getEntryPoint()); while (it.hasNext()) { out.add(it.next().toString()); } return String.join("\n", out); } finally { di.dispose(); }
    }

    private void handleV2Patch(com.sun.net.httpserver.HttpExchange exchange) throws java.io.IOException {
        String path = exchange.getRequestURI().getPath(); String[] parts = path.split("/"); if (parts.Length -ge 4 -and "instruction".Equals(parts[2])) { String addressStr = parts[3]; String body = new String(exchange.getRequestBody().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8); String hex = null; try { int i = body.indexOf("\"bytes\""); if (i >= 0) { i = body.indexOf(':', i); int q1 = body.indexOf('"', i); int q2 = body.indexOf('"', q1+1); if (q1>0 && q2>q1) hex = body.substring(q1+1, q2); } } catch (Exception ex) {} if (hex == null) { sendResponse(exchange, "Missing 'bytes'"); return; } Program program = getCurrentProgram(); if (program == null) { sendResponse(exchange, "No program loaded"); return; } byte[] bytes = new byte[hex.length()/2]; try { for (int k=0;k<bytes.length;k++){ bytes[k] = (byte)Integer.parseInt(hex.substring(k*2,k*2+2), 16);} } catch (Exception e) { sendResponse(exchange, "Invalid hex"); return; } java.util.concurrent.atomic.AtomicBoolean ok = new java.util.concurrent.atomic.AtomicBoolean(false); try { javax.swing.SwingUtilities.invokeAndWait(() -> { int tx = program.startTransaction("Patch Instruction"); try { Address addr = program.getAddressFactory().getAddress(addressStr); ghidra.program.model.mem.Memory mem = program.getMemory(); mem.setBytes(addr, bytes); ok.set(true); } catch (Exception e) { Msg.error(this, "patch failed", e); } finally { program.endTransaction(tx, ok.get()); } }); } catch (Exception e) { sendResponse(exchange, "Patch failed: " + e.getMessage()); return; } sendResponse(exchange, ok.get()?"Patched":"Failed"); return; } sendResponse(exchange, "Not Implemented");
    }

    private void handleV2Types(com.sun.net.httpserver.HttpExchange exchange) throws java.io.IOException { if ("GET".equalsIgnoreCase(exchange.getRequestMethod())) { sendResponse(exchange, "[]\n"); return; } sendResponse(exchange, "Not Implemented"); }
    private void handleV2Data(com.sun.net.httpserver.HttpExchange exchange) throws java.io.IOException { sendResponse(exchange, "Not Implemented"); }
    private void handleV2Search(com.sun.net.httpserver.HttpExchange exchange) throws java.io.IOException { sendResponse(exchange, "Not Implemented"); }
    private void handleV2Tags(com.sun.net.httpserver.HttpExchange exchange) throws java.io.IOException { sendResponse(exchange, "[]\n"); }
    private void handleV2Bookmarks(com.sun.net.httpserver.HttpExchange exchange) throws java.io.IOException { sendResponse(exchange, "Not Implemented"); }

"@
  $code = $code -replace "\n}\s*$", "`n$append}`n"
  Write-UTF8NoBOM -Path $srcFile -Content $code
}

# Step 2: Build classpath from Ghidra (and optional Gson)
Write-Info "Collecting Ghidra jars under: $GhidraHome"
if (-not (Test-Path $GhidraHome)) { throw "GhidraHome does not exist: $GhidraHome" }
$ghidraJars = Get-ChildItem -Recurse -Filter *.jar -File -Path $GhidraHome | Select-Object -ExpandProperty FullName
if (-not $ghidraJars -or $ghidraJars.Count -eq 0) { throw "No JARs found under GhidraHome: $GhidraHome" }
$cpParts = @()
$cpParts += $ghidraJars

if ($GsonJar) {
  if (-not (Test-Path $GsonJar)) { throw "Gson jar not found: $GsonJar" }
  $cpParts += (Resolve-Path $GsonJar).Path
} else {
  $guess = Get-ChildItem -Recurse -Filter gson-*.jar -File -Path $LibDir -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($guess) { $cpParts += $guess.FullName }
}

# Ensure unique and build classpath string
$cp = ($cpParts | Select-Object -Unique) -join ';'

# Step 3: Compile
Write-Info "Compiling updated plugin..."
$classesDir = Join-Path $BuildDir 'classes'
$javac = Get-Command javac -ErrorAction SilentlyContinue
if (-not $javac) { throw "javac not found on PATH" }
& $javac.Path -encoding UTF-8 -g -cp $cp -d $classesDir $srcFile
if ($LASTEXITCODE -ne 0) { throw "javac failed with exit code $LASTEXITCODE" }
Write-Info "Compilation complete."

# Step 4: Jar
Write-Info "Packing JAR..."
$jarCmd = Get-Command jar -ErrorAction SilentlyContinue
if (-not $jarCmd) { throw "jar tool not found on PATH" }
$artifactDir = Join-Path $BuildDir 'artifacts'
New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null
& $jarCmd.Path cf (Join-Path $artifactDir 'GhidraMCP.jar') -C $classesDir .
if ($LASTEXITCODE -ne 0) { throw "jar command failed with exit code $LASTEXITCODE" }
Write-Info "Created jar: $(Join-Path $artifactDir 'GhidraMCP.jar')"

# Step 5: Install JAR into extension
$targetJar = Join-Path $LibDir 'GhidraMCP.jar'
if (Test-Path $targetJar) { Copy-Item -Force $targetJar ($targetJar + '.bak') }
Copy-Item -Force (Join-Path $artifactDir 'GhidraMCP.jar') $targetJar

# Include Gson jar in extension lib if provided
if ($GsonJar) { Copy-Item -Force $GsonJar $LibDir }

# Step 6: Package ZIP (optional)
if ($PackageZip) {
  $zipOut = if ($OverwriteZip) { Join-Path $RepoRoot 'GhidraMCP-1-4.zip' } else { Join-Path $RepoRoot $ZipName }
  if ((Test-Path $zipOut) -and -not $OverwriteZip) { Remove-Item -Force $zipOut }
  Write-Info "Creating ZIP: $zipOut"
  # Include the extension root folder (Ghidra expects a top-level extension directory)
  Compress-Archive -Path $ExtRoot -DestinationPath $zipOut -Force
  Write-Info "ZIP created: $zipOut"
}

Write-Info "Done. Install the ZIP in Ghidra (File -> Install Extensions...) or restart if using the unzipped folder in dev mode."
