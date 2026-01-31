# RVA Triplets and Native Calling Notes

This document captures the “triplet” calling patterns we’ve verified inside `Gaming.AdvancedLighting.dll` and the memory offsets used to read results from the global hardware object.

Target module path (on your system):
- `C:\ProgramData\Lenovo\Vantage\Addins\LenovoGamingUserAddin\1.3.1.34\Gaming.AdvancedLighting.dll`

Global hardware object (Object RVA):
- Object RVA: `0x7E840`
- In code: `hw = base + 0x7E840`

Common result offsets (from `hw`):
- Profile index: `+0x154` (uint32)
- Brightness: `+0x158` (uint32)
- Profile info (expected on “Set”/“init” paths):
  - `+0x1A8` → profileId (uint32)
  - `+0x1B0` → vector of 0x50-byte layer entries (begin/end/cap pointers)

Layer entry (0x50 bytes) important fields we currently scrape:
- `+0x00` → layerId (uint32)
- `+0x18` → animationId (uint32)

## Verified Triplets

1) Get-BrightnessLevel
- Method RVA: `0x14110`
- Object RVA: `0x7E840`
- Result offset: `+0x158`
- Pattern:
  1. Call `(base + 0x14110)(hw)`
  2. Read `*(uint32*)(hw + 0x158)`

2) Get-LightingProfileIndex
- Method RVA: `0x11210`
- Object RVA: `0x7E840`
- Result offset: `+0x154`
- Pattern:
  1. Call `(base + 0x11210)(hw)`
  2. Read `*(uint32*)(hw + 0x154)`

3) Get-LightingProfileInfo (read path)
- High-level worker (init): RVA `0x14630` (aka `init_profile_detail`)
- Low-level parser (fallback): RVA `0x12660` (aka `GetProfileDetails`)
- Expected result layout:
  - `*(uint32*)(hw + 0x1A8)` → profileId
  - Vector at `(hw + 0x1B0)` → begin/end/cap pointers, elements 0x50 bytes each
- Pattern we use today:
  1. Call `(base + 0x14630)(hw, &profileId, nullptr, nullptr)`
  2. Read `actualId = *(uint32*)(hw + 0x1A8)` and vector begin/end at `(hw + 0x1B0)`
  3. If `actualId == 0` or `count == 0`, call `(base + 0x12660)(hw, &profileId, nullptr, nullptr)`
  4. Re-read `actualId` and vector begin/end and parse 0x50-byte entries

Important: On some builds, the “Get” path does not persist profile details into `(hw + 0x1B0)`. In those cases, both reads yield `actualId == 0` and `count == 0`. The robust fallback is to call the DLL’s internal JSON builder function directly and return its result (see `docs/project_overview.md`).

## Base + RVA Cheat Sheet

- `GetProfileIndex` triplet: `base + 0x11210` → writes `*(hw + 0x154)`
- `GetBrightnessLevel` triplet: `base + 0x14110` → writes `*(hw + 0x158)`
- `init_profile_detail` (high-level): `base + 0x14630`
- `GetProfileDetails` (low-level): `base + 0x12660`
- RequestDispatcher (not vtable): `base + 0x3b670`
- JSON builder for profile details (consumer of the structure): function around RVA `0x54210` (see `docs/project_overview.md`)

## Notes On Stability

- Always set the DLL directory before loading to ensure chained native dependencies resolve:
  - `SetDllDirectoryW(L"C:\\ProgramData\\Lenovo\\Vantage\\Addins\\LenovoGamingUserAddin\\1.3.1.34")`
- SEH-guard all calls to internal workers to avoid process termination due to access violations.
- For profile info, if memory isn’t populated by the “Get” path, prefer the internal JSON builder function instead of scraping the `hw` structure.

