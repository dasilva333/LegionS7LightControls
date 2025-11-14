# Native Bridge API and ABI Notes 

This file documents the C++ bridge�s exported functions, calling conventions, buffer semantics, error handling and DLL resolution strategy.

## Exports

1) bool __cdecl DispatchCommand(const wchar_t* command, const wchar_t* payload, wchar_t* outBuffer, int outBufferChars)
- Input:
  - command: UTF-16 keyword (e.g., "Get-BrightnessLevel", "Get-LightingProfileIndex", "Get-LightingProfileInfo").
  - payload: UTF-16 JSON string (UTF-8 encoded data is accepted after conversion internally). For Get-LightingProfileInfo, payload may contain {"profileId": N}.
  - outBuffer: UTF-16 output buffer (caller-allocated).
  - outBufferChars: size in wchar_t units (including space for null terminator).
- Output:
  - Returns true/false; always prints JSON into outBuffer. On failure returns a small JSON error string, never crashes.

Buffer rules:
- The bridge converts internal UTF-8 JSON to UTF-16 via MultiByteToWideChar; it validates the required length and sets ERROR_INSUFFICIENT_BUFFER if too small.

Error handling:
- All internal native calls are SEH-guarded. Instead of process termination, the bridge returns JSON errors like {"error":"seh-�"}.

2) const wchar_t* __cdecl GetProfileInfoJson(int profileId)
- Returns: a CoTaskMemAlloc-allocated UTF-16 string containing JSON. Caller frees via CoTaskMemFree (or let marshaling handle it if mapped to string in C#). This export is optional in the current flow; the dispatcher path is preferred for diagnostics.

## Calling Convention and Marshaling
- All exported functions are extern "C", __cdecl.
- Use StringBuilder for DispatchCommand (unicode) and pass capacity in characters.
- For GetProfileInfoJson, use a string P/Invoke with CharSet.Unicode in C#. (Caller ensures freeing; we typically let .NET marshaller free via CoTaskMemFree.)

## Dependency Resolution
- Before LoadLibraryW on the Lenovo add-in, SetDllDirectoryW is called pointing at:
  - C:\\ProgramData\\Lenovo\\Vantage\\Addins\\LenovoGamingUserAddin\\1.3.1.34
- This ensures chained native dependencies in that folder are resolvable. Without this, DllNotFoundException can occur even when the target DLL is present.

## Commands Supported in DispatchCommand
- Get-BrightnessLevel ? uses triplet RVA 0x14110; reads hw+0x158
- Get-LightingProfileIndex ? uses triplet RVA 0x11210; reads hw+0x154
- Get-LightingProfileInfo ? calls high-level RVA 0x14630; if empty, fallback RVA 0x12660; reads hw+0x1A8 + hw+0x1B0; returns JSON with debug block and logs to %LOCALAPPDATA%\ProfileReader\diag.log
- Get-Capability ? stubbed (returns empty list) to avoid dispatcher.

## JSON Conventions
- Keys are lower camel case (e.g., profileId, layers, layerId, animationId). This aligns with string constants found in the binary and Nlohmann JSON usage.

## Runtimes Notes
- Avoid relying on the public dispatcher (RVA 0x3b670) or vtable: it is not in the vtable returned by get_instance.
- When "Get" does not persist details into (hw + 0x1B0), prefer the internal JSON builder function rather than scraping memory.
