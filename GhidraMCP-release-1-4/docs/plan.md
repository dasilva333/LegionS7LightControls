# GhidraMCP 1.4 – Update Plan

This document outlines the work to update the GhidraMCP extension to support the new API implemented by the Python client (`bridge_mcp_ghidra.py`).

## Objectives

- Integrate server-side logic for new endpoints into `GhidraMCPPlugin.java`.
- Build a new `GhidraMCP.jar` from the updated Java source.
- Package a new extension ZIP mirroring `GhidraMCP-1-4.zip` with the updated JAR.
- Keep documentation in `docs/` and provide a self-contained build script.

## Sources

- Original server source: `GhidraMCP-1-4/GhidraMCP/lib/GhidraMCP/com/lauriewired/sources/com/lauriewired/GhidraMCPPlugin.java.txt`
- Changes spec + full updated source: `docs/changes.md` (contains the updated Java inside a ```java code block).

## Approach

1. Extract the updated Java code block from `docs/changes.md` into a build workspace.
2. Compile against the local Ghidra installation (provided via `-GhidraHome`).
3. Optionally include `gson-*.jar` on the classpath if the updated code uses Gson.
4. Build `GhidraMCP.jar` from compiled classes.
5. Replace the JAR in `GhidraMCP-1-4/GhidraMCP/lib/`.
6. Package a new ZIP (`GhidraMCP-1-4-updated.zip`) from `GhidraMCP-1-4/`.

## Notes

- The build is JDK-based (no Gradle/Maven fetch). It expects a local Ghidra install providing the needed Ghidra jars.
- Gson is required by the updated source. Place `gson-*.jar` into `GhidraMCP-1-4/GhidraMCP/lib/` or provide `-GsonJar` to the build script.

