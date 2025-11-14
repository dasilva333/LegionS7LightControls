# Ghidra Notes

## Addresses of Interest (RVA)
- RequestDispatcher: 0x3b670 (not vtable)
- GetProfileIndex triplet: 0x11210
- GetBrightnessLevel triplet: 0x14110
- init_profile_detail (high-level): 0x14630
- GetProfileDetails (low-level): 0x12660
- JSON builder for profile: ~0x54210 (based on string references and call sites)

## Strings / Keywords
- Commands discovered include:
  - Get-KbdBasicInfo, Get-Capability, Get-FirmwareVersion
  - Get/Set-LightingProfileInfo, Get/Set-LightingProfileIndex
  - Set-LightingProfileDetails, Set-ResetLightingProfile
  - Get/Set-BrightnessLevel
  - Switch-AnimationControl, Set-ProfileEditState, Set-ScreenToKeyboard
  - Set-StartCurKeysColorCallback, Set-StopCurKeysColorCallback

- JSON keys from Nlohmann JSON usage:
  - profileId, layers, layerId, keys, animationConfig, animationId, speed, clockwise, direction, colorType, colorSize, colorList, transition

## Tips
- Trace from string references to find high-level command handlers.
- Confirm triplets by observing where functions write into the global hardware object (hw = base + 0x7E840).
- When scrambling JSON layout from code: search for nlohmann::json at(), [] and ranges.

