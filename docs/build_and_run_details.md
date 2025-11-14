# Build & Run Details

This note records the exact commands we run when rebuilding `SetDetailsBridge` and exercising the worker harness. It also points to `hook_lighting.js`, the Frida hook that confirms the dispatcher schema and payload structure you captured.

## Step-by-step compile + deployment

```powershell
cd C:\Users\h4rdc\keyboard-led-project\SetProfileDetailsController\SetDetailsBridge
call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
cl /LD /DUNICODE /D_UNICODE SetDetailsBridge.cpp /EHsc Ole32.lib
copy SetDetailsBridge.dll ..\SetDetailsTest /y
```

> The above commands set up the x64 toolchain, compile the bridge into `SetDetailsBridge.dll`, and copy it into the test project so the supervisor harness loads the fresh binary.

## Running the worker harness (supervisor + child)

```powershell
cd C:\Users\h4rdc\keyboard-led-project\SetProfileDetailsController\SetDetailsTest
"C:\Program Files\dotnet\dotnet.exe" run -- --child
```

This direct run bypasses the supervisor loop and lets you see the worker output and crash logs in real time. The supervisor variant uses the same `dotnet.exe` path but wraps the run call and monitors for timeouts.

## Frida hook reference

Your `hook_lighting.js` script (also in this repo) attaches to `Gaming.AdvancedLighting.dll`, calls `get_instance()`, and hooks vtable entry `[3]` (`FUN_18004e570`). It logs the actual `inCommand`, `inPayload`, and `outJson` strings the UI sends. Use it to verify that the JSON structure your bridge builds matches the live traffic—especially the fact that the `payload` field is an escaped JSON string, which is the subtle detail causing the earlier crash.

Save those logs alongside the DIFF when you rerun the hook so we always know what “real” traffic looks like when we reproduce the same payload later.
