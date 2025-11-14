# Builder Strategy for Profile Info 

When the �Get� path does not persist profile details into (hw + 0x1B0), the robust approach is to call the DLL�s internal JSON builder function directly.

## Candidate function
- RVA near 0x54210 (based on references from `FUN_180054210` and string tables for `profileId`, `layers`, `animationConfig`, etc.)
- This builder reads the in-memory structures populated by init_profile_detail / low-level parser and emits the final JSON object.

## Plan
1) Identify the builder function prototype by decompilation and call graph (Ghidra MCP).
2) Determine calling convention (likely non-virtual, `__fastcall` / `__cdecl`-like depending on compilation) and parameter packing.
3) Construct inputs from the `hw`-backed structures or via the intermediate objects used by `init_profile_detail`.
4) Call the builder and dump the JSON via Nlohmann JSON�s dump() into UTF-16 outBuffer.

## Advantages
- Insulates us from memory persistence differences across builds (i.e., if `(hw + 0x1B0)` isn�t populated).
- Produces consistent, complete JSON as seen by the UI code paths.

## Testing
- Compare JSON produced by the builder against memory-scraped JSON when available.
- Add CLI harness runs for regression.

