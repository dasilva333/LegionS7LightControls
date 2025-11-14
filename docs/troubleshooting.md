# Troubleshooting 

## Symptoms and Fixes

- DllNotFoundException
  - Ensure SetDllDirectoryW points to the Lenovo add-in folder.
  - Verify all chained dependencies exist next to Gaming.AdvancedLighting.dll.

- Process hangs / apphost locked
  - Ensure CLI harness uses parent/child + timeout; kill lingering FinalHarness(.exe) processes before building.
  - taskkill /F /IM FinalHarness.exe
  - taskkill /F /IM FinalHarness_cli.exe

- unhandled-exception JSON
  - Indicates SEH caught a native exception; inspect %LOCALAPPDATA%\ProfileReader\diag.log.

- Empty profile info (profileId=0, count=0)
  - �Get� path likely doesn�t persist into memory at hw + 0x1B0 on this build.
  - Fix: call internal JSON builder directly.

## Logs

- Diagnostic JSON logged to: %LOCALAPPDATA%\ProfileReader\diag.log

## Quick Verify

- dotnet run --project FinalHarness_cli -- --BrightnessLevel
- dotnet run --project FinalHarness_cli -- --LightingProfileIndex
- dotnet run --project FinalHarness_cli -- --LightingProfileInfo 4

