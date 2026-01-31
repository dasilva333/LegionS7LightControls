# Process Exit, Timeouts, and CLI Harness

We observed that calling into `Gaming.AdvancedLighting.dll` sometimes leaves background/native threads running, which prevents the host process from exiting cleanly. This caused locked apphost EXEs and repeated build/run failures.

## Problems Seen

- `FinalHarness.exe` remained resident (and locked), so `dotnet build` could not overwrite the apphost.
- `Get-Capability` (when routed to dispatcher) or an unstable profile path could cause hangs.
- Manual Ctrl+C didn’t always break the process.

## Mitigations Implemented

1) Native side
- No dispatcher/vtable calls at all.
- Only direct triplets/workers with SEH guards:
  - Brightness: `base + 0x14110`
  - ProfileIndex: `base + 0x11210`
  - ProfileInfo: `base + 0x14630` with fallback to `0x12660`
- Added `SetDllDirectoryW` to the Lenovo add-in folder to resolve chained dependencies.
- For profile info, return debug JSON and log to `%LOCALAPPDATA%\ProfileReader\diag.log`.

2) CLI-only harness (FinalHarness_cli)
- Non-interactive modes:
  - Flags: `--BrightnessLevel`, `--LightingProfileIndex`, `--LightingProfileInfo <id>`
  - Positional: `dotnet run -- <command> <payload>`
- Two layers to guarantee exit:
  - Parent spawns child (`--child`) with a 6-second hard timeout; kills child if needed
  - Child runs `DispatchCommand` on a background thread and prints JSON
- Absolute P/Invoke path to the test-local `ProfileReader.dll` avoids loader confusion
- All output is raw JSON

## Commands (examples)

```
"C:\Program Files\dotnet\dotnet.exe" run --project C:\Users\h4rdc\keyboard-led-project\FinalHarness_cli -- --BrightnessLevel
"C:\Program Files\dotnet\dotnet.exe" run --project C:\Users\h4rdc\keyboard-led-project\FinalHarness_cli -- --LightingProfileIndex
"C:\Program Files\dotnet\dotnet.exe" run --project C:\Users\h4rdc\keyboard-led-project\FinalHarness_cli -- --LightingProfileInfo 4
```

If a call blocks, the parent prints a timeout JSON and exits:

```
{"error":"timeout","command":"Get-LightingProfileInfo"}
```

## Lessons Learned

- Use an isolated CLI project for test runs to avoid apphost lock contention with the interactive harness.
- Force process termination after each run in CLI mode when dealing with third-party DLLs that may spawn unmanaged threads.
- Prefer direct triplets/workers with SEH and JSON returns to ensure stability.

