# Goals

- Implement server endpoints to match the Python client additions (CFG, pcode, xrefs, string references, function callers/callees, patching, tagging, etc.).
- Improve error handling with HTTP status codes and machine-readable JSON responses.
- Preserve plugin stability with Ghidra’s threading model for program modifications.
- Provide a reproducible build and packaging flow.
- Keep the extension structure compatible with Ghidra’s Extension Manager.

## Out of Scope

- Changing the extension’s base folder structure beyond what’s necessary to update the JAR.
- Rewriting the Python bridge; it’s already updated (`bridge_mcp_ghidra.py`).
- Adding new third-party libraries beyond Gson.

