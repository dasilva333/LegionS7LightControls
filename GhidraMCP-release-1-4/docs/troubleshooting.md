# Troubleshooting

Use these checks when an extension doesn’t appear in Ghidra or routes don’t respond as expected.

## Extension Not Listed in Plugins

- Zip structure: verify entries use forward slashes and include directory entries.
  - Must be:
    - `GhidraMCP/`
    - `GhidraMCP/extension.properties`
    - `GhidraMCP/Module.manifest`
    - `GhidraMCP/lib/GhidraMCP.jar`
- No extra files: do not ship `GhidraMCP/lib/GhidraMCP/` subtree or `GhidraMCP.jar.bak`.
- Installer path error: manually copy the folder `GhidraMCP` to `C:\Users\<you>\AppData\Roaming\ghidra\ghidra_<ver>_PUBLIC\Extensions\`.
- `.uninstalled` markers: rename `extension.properties.uninstalled` → `extension.properties` and similarly for `Module.manifest`.

## Module.manifest Warnings on 11.4.x

- “Invalid line encountered: GHIDRA_MODULE_NAME=…” — seen on both the original and rebuilt extension; benign. Plugin still loads.

## Jar Loads but Routes Fail

- Launch in debug mode to see server logs:
  - Edit `ghidraRun.bat`: change `bg jdk` → `debug jdk` and re-run.
- Confirm startup messages:
  - `GhidraMCPPlugin loading…`, `… loaded!`, `HTTP server started on port 8080`.
- Use MCP tools (not raw HTTP) to validate routes (list methods, cfg, pcode, types, search).

## Gson

- Not required. We return text and small JSON strings manually.
- If you want to keep Gson available for testing:
  - Place `gson-2.9.0.jar` in `GhidraMCP\lib\`.

## Common Pitfalls

- Packaging nested content under `lib/GhidraMCP/` — remove it.
- Renaming the extension folder (e.g., using `GhidraMCPv2`) — avoid name changes unless absolutely necessary.
- Building against the wrong Ghidra install — ensure `javac` classpath points at your actual Ghidra directory.

