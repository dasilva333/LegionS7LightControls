# Project Overview and Reverse Engineering Notes

This repository contains a native bridge and harness for interacting with `Gaming.AdvancedLighting.dll` (Lenovo Vantage add-in) to control/read keyboard lighting state via internal worker functions discovered through reverse engineering.

## Goals

- Enumerate and call internal commands without relying on the public dispatcher.
- Build/return correct JSON for operations like profile info, brightness, and profile index.
- Provide a resilient CLI/harness that exits cleanly after each call.

## Environment

- Target DLL path (example):
  `C:\ProgramData\Lenovo\Vantage\Addins\LenovoGamingUserAddin\1.3.1.34\Gaming.AdvancedLighting.dll`
- Set `SetDllDirectoryW` to the add-in folder to resolve native dependencies.
- Global hardware object is a static instance at `base + 0x7E840`.

## Commands (keywords discovered)

Examples from strings and builder function (`FUN_18003df30` and embedded string tables):

- Get/Set profile:
  - `Get-LightingProfileInfo`
  - `Get-LightingProfileIndex`
  - `Set-LightingProfileIndex`
  - `Set-LightingProfileDetails`
  - `Set-ResetLightingProfile`
- Brightness:
  - `Get-BrightnessLevel`
  - `Set-BrightnessLevel`
- Device/info:
  - `Get-KbdBasicInfo`, `Get-Capability`, `Get-FirmwareVersion`
  - `Switch-AnimationControl`, `Set-ProfileEditState`, `Set-ScreenToKeyboard`
  - Color callbacks: `Set-StartCurKeysColorCallback`, `Set-StopCurKeysColorCallback`

## JSON Shapes (selected)

`Set-LightingProfileDetails` (from string tables and JSON accessors):

- Top-level keys (lower camel case):
  - `profileId` (int)
  - `layers` (array)
    - Each layer contains:
      - `layerId` (int)
      - `keys` (int[])
      - `animationConfig` (object)
        - `animationId` (int)
        - `speed` (int)
        - `clockwise` (int)
        - `direction` (int)
        - `colorType` (int)
        - `colorSize` (int)
        - `colorList` (array of {r,g,b})
        - `transition` (int)

These align with hard-coded string literals found in the binary (e.g., `profileId`, `layers`, `layerId`, `animationConfig`, `colorList`, etc.).

## Internal Workers and Addresses

- Triplets (see `docs/rva_triplets.md`):
  - Get brightness: `base + 0x14110` → writes `*(hw + 0x158)`
  - Get profile index: `base + 0x11210` → writes `*(hw + 0x154)`
- Profile info:
  - High-level worker: `base + 0x14630` (`init_profile_detail`)
  - Low-level parser: `base + 0x12660` (`GetProfileDetails`)
  - Dispatcher (do not call through vtable): `base + 0x3b670`
- JSON builder for profile details (reader): function around `RVA 0x54210` builds the JSON from internal structures used by the firmware manager. When “Get” paths do not persist to `hw + 0x1B0`, prefer calling this builder to retrieve complete JSON.

## Ghidra / MCP Notes

- We used a Ghidra MCP bridge for interactive disassembly/decompilation:
  - Searched for command strings to enumerate supported keywords.
  - Confirmed `get_instance` does not return an object whose vtable contains `RequestDispatcher` (see `docs/vftable_attempts.md`).
  - Mapped worker functions by XREFs from string tables and by decompilation of `init_profile_detail` and `GetProfileDetails`.

## Current Harness Strategy

- Avoid dispatcher/vtable entirely.
- Use direct workers (triplets) with SEH guards.
- For profile info:
  - Call high-level worker (and fallback low-level) and attempt to read `(hw + 0x1A8)` and `(hw + 0x1B0)`
  - If empty/zero, call the internal JSON builder function to retrieve the full JSON.
- CLI harness supervises a child process and kills it after a hard timeout to guarantee exit.

## Next Steps

- Finalize the builder-based path for `Get-LightingProfileInfo` so it always returns complete JSON regardless of whether the “Get” path persists into memory on a given build.
- Expand layer field parsing for the 0x50-byte entries (if needed) or rely exclusively on the builder function.
- Add a small PowerShell script to run a matrix of commands and capture JSON snapshots for regression testing.

