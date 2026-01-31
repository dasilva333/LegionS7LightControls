# Dispatcher Map — 2025-11-12

Image base: 0x180000000

This file summarizes the keyword → handler mapping with evidence (RVA/function) and notable side effects. Where the dispatcher function (FUN_18003b670 @ 0x180003b670) was too large to decompile, we used xrefs to identify calls.

Core globals
- hw (global manager): 0x18007e840 (RVA 0x7e840)
- Control/flags: hw+0x1f8 (host control), hw+0x220 (current animation id), hw+0x150/0x160 (sync thread flags)

Keywords and handlers
- Get-LightingProfileIndex → 0x1800011210 (RVA 0x11210)
  - Triplet; writes *(hw + 0x154)
- Get-BrightnessLevel → 0x1800014110 (RVA 0x14110)
  - Triplet; writes *(hw + 0x158)
- Get-LightingProfileInfo → 0x1800014630 + 0x1800012660 + 0x1800054210
  - init_profile_detail → parse → JSON builder (exact)
- Set-LightingProfileIndex → 0x1800013650 (RVA 0x13650)
  - Updates *(hw + 0x154), then GetProfileDetails + JSON builder
- Set-BrightnessLevel → 0x1800014290 (RVA 0x14290)
  - Updates *(hw + 0x158)
- Set-LightingProfileDetails → parses JSON then writes via 0x1800011380
  - Layer parser 0x1800052620 (layerId, keys, animationConfig)
  - Keys parser 0x180004ff70 (int[])
  - AnimationConfig parser 0x1800051fa0
- Set-ResetLightingProfile → 0x18000138c0 (RVA 0x138c0)
  - Resets profile at index; includes registry reads for ScreenLightingNumber; reparses details and rebuilds JSON when requested
- Get-FirmwareVersion → 0x180002af70 (RVA 0x2af70)

Screen / animation control
- Set-ScreenToKeyboard → 0x1800013eb0 (RVA 0x13eb0)
  - Dispatcher xref: FUN_18003b670 calls at 0x18003c180 (UNCONDITIONAL_CALL)
  - Spawns SyncKbdColorThread 0x1800010850; manages hw+0x150/0x160
  - Stop/release via 0x1800014cb0 (RVA 0x14cb0)
- Switch-AnimationControl → handled in dispatcher
  - Acquire control: init_profile_detail 0x1800014630 (xref in dispatcher at 0x18003d546)
  - Release control: stop_expand_animation 0x1800014cb0
  - Effect: toggle between host control (software) vs device engine (firmware); tied to control flag at hw+0x1f8 and animation id at hw+0x220.
- Set-ProfileEditState → handled in dispatcher
  - Strings: “editing profile animation true/false” referenced in dispatcher blocks
  - Likely toggles editing mode, coordinating with control acquisition

Color callbacks
- Set-StartCurKeysColorCallback / Set-StopCurKeysColorCallback
  - Dispatcher logs: color callback thread begin/enter/end; stop branches
  - Registration helpers:
    - RequestDispatcher::reg_callback → 0x180040910
    - RequestDispatcher::refresh_reg_callback → 0x1800407a0
  - Emitter routine: 0x1800013d80 (RVA 0x13d80)
    - Dispatcher calls at 0x18003c1f6 and 0x18003c746 (UNCONDITIONAL_CALLs)
    - Clears gate (hw+0x160=0), increments counter at hw+0x15c, composes payload from hw+0x1c8.

Device/capability/version
- Get-KbdBasicInfo → 0x180003e840 (RVA 0x3e840)
  - Calls GetSupportedAnimation 0x1800010e60 and KBD info; emits failure on error
- Get-Capability → 0x1800010e60 (RVA 0x10e60) GetSupportedAnimation
- Get-FirmwareVersion → 0x180002af70 (RVA 0x2af70)

Dispatcher support and lifecycle
- RequestDispatcher::LEDCommands (logger) → 0x18000410a0 (RVA 0x410a0)
- AppMonitor_Exit → 0x180003f0f0 (RVA 0x3f0f0) — stops animation, may set profile
- Uninstall/Release exit → 0x1800040210 (RVA 0x40210) — stops threads and releases

Notes
- We avoid direct dispatcher calls in our implementation; instead, we call worker functions directly with SEH guards.
- For JSON profile data, prefer the builder 0x1800054210 after init/parse; or call SetProfileIndex 0x1800013650 with the current id to force JSON emission.
