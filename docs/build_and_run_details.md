# Build & Run Details

This note records the commands we run when rebuilding SetDetailsBridge, exercising the worker harness, and capturing dispatcher traffic. hook_lighting.js is the Frida hook that confirms the vtable[3] schema.

## Step-by-step compile + deployment

`powershell
cd C:\Users\h4rdc\keyboard-led-project\SetProfileDetailsController\SetDetailsBridge
cmd /c "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat" ^>nul && ^
    cl /nologo /std:c++17 /LD SetDetailsBridge.cpp /EHsc dbghelp.lib
copy SetDetailsBridge.dll ..\SetDetailsTest /y
`

Notes:

* `dbghelp.lib` is required so the bridge can emit crash dumps if Lenovo's DLL faults.
* The build uses `/std:c++17` because the bridge relies on modern STL helpers (json.hpp, std::vector, etc.).
* Always copy the fresh DLL into `SetDetailsTest` before running the worker harness.

## Running the worker harness (timestamp replay)

`powershell
cd C:\Users\h4rdc\keyboard-led-project\SetProfileDetailsController\SetDetailsTest
"C:\Program Files\dotnet\dotnet.exe" run -- 1763158850008 1763158855461 1763158857167
`

*Pass the timestamps in the exact order they were captured.* The bridge now replays each dispatcher call verbatim (command JSON, payload tag, and context blob), so a full edit looks like:

1. Any preparatory call (e.g., `Get-ProfileEditState`) if the capture shows one.
2. `Set-ProfileEditState` (open)
3. `Set-LightingProfileDetails`
4. `Set-ProfileEditState` (close/apply)

You can add more timestamps to the command line if Lenovo injected additional prep traffic (e.g., `Set-LightingProfileIndex`). The worker simply streams them through in sequence.

## Frida hook reference

hook_lighting.js attaches to Gaming.AdvancedLighting.dll, calls get_instance(), and hooks vtable[3]. It logs:

- inCommand: std::string with the full contract JSON
- inPayload: std::string logging tag (e.g., "write_log"), captured separately as `inbound_payload_<ts>.json`
- context: optional std::string blob (now saved as `inbound_context_<ts>.json`)
- outJson: result JSON

These logs land under %LOCALAPPDATA%\Temp\traffic and feed the replay bridge.
