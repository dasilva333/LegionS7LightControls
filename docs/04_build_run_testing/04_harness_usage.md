# Harness Usage (CLI)

## Flags
- --BrightnessLevel
- --LightingProfileIndex
- --LightingProfileInfo 4

## Positional
- dotnet run -- <command> <payload>
- Example:
  - dotnet run -- Get-LightingProfileInfo {"profileId":4}

## Return Codes
- 0: success
- 1: native returned false
- 2: exception constructing/running harness
- 3: timeout killed child process

All output is raw JSON on stdout. For profile info, a debug block may be included for diagnostics; logs are written to %LOCALAPPDATA%\ProfileReader\diag.log.
