# Reset Profile Behavior

Image base: 0x180000000

This note explains how the DLL handles profile reset requests, what JSON is returned afterward, and where default values come from when no layer data exists.

## Command and flow

- Command keyword: `Set-ResetLightingProfile`
- Dispatcher handler: 0x18000138c0 (FUN_1800138c0)
- Sequence (simplified):
  1) Stops current expand/animation control (calls 0x1800014cb0).
  2) Issues a lower-level "ResetProfile" operation via the interface call builder (FUN_180029720).
  3) Depending on parameters, either:
     - Sleep briefly, call `GetProfileDetails` (0x1800012660) to re-parse details for the target profile, then build and return full JSON via 0x1800054210, or
     - Return a minimal status without reparsing.
  4) Interacts with registry value `ScreenLightingNumber` under `SOFTWARE\\Lenovo\\VantageService\\AddinData\\LenovoGamingAddin` to adjust behavior; posts a keep-alive/session event.

## Where "default" profile comes from

- No manual construction of a full default profile is performed inside the manager for reset. Instead, reset is delegated to the lower-level interface/firmware, and then the manager re-reads details and emits JSON.
- When there is no layer data to parse for a profile, internal parsers inject a placeholder default entry via a hard-coded string:
  - `"layerid=0 animation=0 speed=0 clockwise=0 direction=0 colortype=0 transition=0 colors=0 keys=0"`
  - This placeholder is used by parsing routines (e.g., 0x1800011380 writer path, 0x1800012660 details parser) as a minimal, zero-valued layer template.

## JSON after reset

- After a reset + reparse, the JSON returned is what the firmware/device exposes for the profile at that moment.
- If no layers are present, the builder will reflect whatever minimal structures the parsers produced (potentially a single zero-valued layer if the placeholder path was used).

## Notes and implications

- Consumers should not hardcode a default profile JSON; instead, request JSON after reset to capture the device’s authoritative state.
- The presence of the placeholder template indicates the DLL can produce a minimal profile when incoming/internal structures are empty, but real defaults are device/firmware-defined.
