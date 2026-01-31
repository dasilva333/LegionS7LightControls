# Dispatcher Unconditional Calls — 2025-11-12

Dispatcher function: FUN_18003b670 @ 0x180003b670 (image base 0x180000000)

This list captures unconditional calls within the dispatcher and the likely command they serve. Offsets shown are the call sites inside the dispatcher.

- 0x18003d334 → 0x1800011210 (Get-LightingProfileIndex)
- 0x18003d788 → 0x1800014110 (Get-BrightnessLevel)
- 0x18003d82d → 0x1800014290 (Set-BrightnessLevel)
- 0x18003d453 → 0x1800013650 (Set-LightingProfileIndex)
- 0x18003d668 → 0x18000138c0 (ResetProfileIndex / Set-ResetLightingProfile)
- 0x18003d1a9 → 0x180003e840 (Get-KbdBasicInfo)
- 0x18003d546 → 0x1800014630 (init_profile_detail — acquire control; used by Switch-AnimationControl & profile flows)
- 0x18003d978 → 0x180002af70 (Get-FirmwareVersion)
- 0x18003c180 → 0x1800013eb0 (Set-ScreenToKeyboard — starts sync thread)
- 0x18003c1f6 → 0x1800013d80 (Color callback emitter — thread payload)
- 0x18003c746 → 0x1800013d80 (Color callback emitter — thread payload)

Notes
- Set-ProfileEditState: dispatcher logs “editing profile animation true/false” in nearby blocks; flag write occurs inside dispatcher (exact field TBD), coordinated with control acquisition/release.
- Set-LightingProfileDetails: handled through JSON parsing then writer 0x1800011380; the dispatcher front end is composed of layer/keys/animConfig parsing before committing via the writer.
