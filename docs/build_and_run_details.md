# Build & Run Details

This note records the commands we run when rebuilding SetDetailsBridge, exercising the worker harness, and capturing dispatcher traffic. hook_lighting.js is the Frida hook that confirms the vtable[3] schema.

## Step-by-step compile + deployment

`powershell
cd C:\Users\h4rdc\keyboard-led-project\SetProfileDetailsController\SetDetailsBridge
call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
cl /LD /DUNICODE /D_UNICODE SetDetailsBridge.cpp /EHsc Ole32.lib
copy SetDetailsBridge.dll ..\SetDetailsTest /y
`

## Running the worker harness (timestamp replay)

`powershell
cd C:\Users\h4rdc\keyboard-led-project\SetProfileDetailsController\SetDetailsTest
"C:\Program Files\dotnet\dotnet.exe" run -- 1763152028894
`

Replace 1763152028894 with the captured timestamp you want to replay.

## Frida hook reference

hook_lighting.js attaches to Gaming.AdvancedLighting.dll, calls get_instance(), and hooks vtable[3]. It logs:

- inCommand: std::string with the full contract JSON
- inPayload: std::string logging tag (e.g., "write_log")
- outJson: result JSON

These logs land under %LOCALAPPDATA%\Temp\traffic and feed the replay bridge.
