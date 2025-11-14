# Build & Package

This doc captures the working, no-Maven build pipeline and the rules that make Ghidra accept the extension. Use it to reproduce the build, modify source, and package a zip Ghidra will install.

## Prerequisites

- Windows PowerShell 5.1 or PowerShell 7+
- JDK 17+ on `PATH` (`javac`, `jar`)
- Ghidra installation path (e.g., `C:\Users\h4rdc\Downloads\ghidra_11.4.2_PUBLIC_20250826\ghidra_11.4.2_PUBLIC`)

## Clean Build From Source (preferred, no Maven)

Steps shown using a fresh clone (`repo_src_clean`) and a minimal javac/jar pipeline. This mirrors the official structure and works out-of-the-box.

1) Compile the plugin jar
   - Build classpath from your Ghidra install (all jars).
   - Compile `repo_src_clean\src\main\java\com\lauriewired\GhidraMCPPlugin.java` to a classes dir.
   - Create `GhidraMCP.jar` from the classes.

2) Stage the extension folder (do NOT add extra files)
   - Top-level folder: `GhidraMCP\`
   - Required files under it:
     - `GhidraMCP\extension.properties` (from repo, unmodified)
     - `GhidraMCP\Module.manifest` (from repo, unmodified)
     - `GhidraMCP\lib\GhidraMCP.jar` (your compiled jar)
   - Optional: `GhidraMCP\lib\gson-2.9.0.jar` if your code uses Gson.

3) Zip with forward slashes and explicit directory entries
   - Zip MUST contain a single top-level folder `GhidraMCP/` with the three items above.
   - Avoid nested trees like `GhidraMCP/lib/GhidraMCP/...` or backup jars; those break loading.

4) Install
   - Ghidra → `File` → `Install Extensions…` → select your zip → restart.
   - If the installer complains about creating paths or the zip is “hidden”, re-zip ensuring directory entries exist and names use `/`.
   - Manual install (fallback): copy the folder `GhidraMCP` directly to `C:\Users\<you>\AppData\Roaming\ghidra\ghidra_<ver>_PUBLIC\Extensions\`.

## Modifying Source (additive v2)

- Work from clean source (the official repo) to minimize risk.
- Add v2 endpoints under new contexts (`/function/`, `/types`, `/type/`, `/patch/`, `/data/`, `/search/`).
- Do NOT change existing endpoints or response shapes.
- Prefer text/plain responses; only craft small JSON by hand where needed (e.g., CFG, type definition). Gson is optional.
- Rebuild `GhidraMCP.jar`, replace it under `GhidraMCP\lib\`, and repackage the zip.

## Debugging & Logs

- Launch in debug mode to get verbose logs:
  - Edit `ghidraRun.bat` and replace `bg jdk` with `debug jdk`.
  - Console shows startup logs, including plugin start and HTTP server port.
- Known benign warning on 11.4.x:
  - “Invalid line encountered: GHIDRA_MODULE_NAME=…” from `Module.manifest` — the original extension emits this too and still loads.

## Packaging Rules (critical)

- Zip structure:
  - `GhidraMCP/`
  - `GhidraMCP/extension.properties`
  - `GhidraMCP/Module.manifest`
  - `GhidraMCP/lib/GhidraMCP.jar`
  - `[optional] GhidraMCP/lib/gson-2.9.0.jar`
- Do not include `GhidraMCP/lib/GhidraMCP/` subtree or `.bak` jars.
- If the installed folder shows `.uninstalled` suffixes on properties/manifest, Ghidra will ignore the extension until you rename them back.

## Script Option (optional)

- `scripts\build_plugin.ps1` can compile and package using `-GhidraHome` and optionally extract Java from `docs\changes.md`.
- For precise, controlled builds, the manual javac/jar + zip steps above are recommended.
