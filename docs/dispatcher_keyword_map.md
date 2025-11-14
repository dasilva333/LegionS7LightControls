# Dispatcher Keyword → Handler Map

Image base: 0x180000000

This table consolidates known keywords, their dispatcher call targets (when routed through FUN_18003b670), and notable internal calls/side‑effects. Where the dispatcher uses composite helpers, both the composite and underlying workers are listed. For robust external control we still prefer direct worker calls, but this map removes guesswork when matching keywords to handlers.

- Get-LightingProfileIndex
  - Dispatcher: calls 0x1800011210
  - Worker: 0x1800011210 → writes *(hw+0x154)

- Get-BrightnessLevel
  - Dispatcher: calls 0x1800014110
  - Worker: 0x1800014110 → writes *(hw+0x158)

- Set-BrightnessLevel
  - Dispatcher: calls 0x1800014290
  - Worker: 0x1800014290 → updates *(hw+0x158)

- Set-LightingProfileIndex
  - Dispatcher: calls 0x1800013650
  - Worker: 0x1800013650 → updates *(hw+0x154), reparses details, builds JSON

- Set-ResetLightingProfile
  - Dispatcher: calls 0x18000138c0
  - Worker: 0x18000138c0 → resets profile, registry reads (ScreenLightingNumber), optional reparse + JSON

- Get-KbdBasicInfo
  - Dispatcher: calls 0x180003e840
  - Composite: 0x180003e840 → calls GetSupportedAnimation 0x1800010e60 and KBD info; returns JSON or failure

- Get-FirmwareVersion
  - Dispatcher: calls 0x180002af70
  - Worker: 0x180002af70 → version string

- Set-ScreenToKeyboard
  - Dispatcher: calls 0x1800013eb0
  - Worker: 0x1800013eb0 → spawns SyncKbdColorThread 0x1800010850; release via 0x1800014cb0

- Set-StartCurKeysColorCallback / Set-StopCurKeysColorCallback
  - Dispatcher: starts/stops a color callback thread; calls emitter 0x1800013d80 in loop
  - Helpers: reg_callback 0x1800040910; refresh_reg_callback 0x18000407a0; thread entry FUN_180049580 (spawned by 0x18003f460)

- Set-ProfileEditState
  - Dispatcher: toggles edit mode (logs “editing profile animation true/false”); coordinated with control acquisition
  - Underlying: state flag write is in dispatcher; exact field TBD (heavy decompile); behavior documented
  - See docs/profile_edit_state.md:1 for usage and context

- Switch-AnimationControl
  - Dispatcher: acquires/releases control via:
    - Acquire: 0x1800014630 init_profile_detail (sets hw+0x1f8, hw+0x220)
    - Release: 0x1800014cb0 stop_expand_animation (clears control)

- Set-LightingProfileDetails
  - Dispatcher: composite handler 0x180003eec0
    - JSON extraction: 0x180052800 (collects profileId/layers from payload)
    - Apply: 0x1800014630 (prep) → 0x1800011380 (writer)
  - Parsers: layer 0x1800052620; keys 0x180004ff70; animationConfig 0x1800051fa0

- Get-LightingProfileInfo
  - Dispatcher: composite handler (not fully isolated by a single call in harvest)
  - Underlying workers: 0x1800014630 (init) → 0x1800012660 (parse) → 0x1800054210 (builder)
  - Guidance: prefer direct worker path above to return full JSON reliably

Notes
- The dispatcher also logs via RequestDispatcher::LEDCommands (0x18000410a0) and uses support routines like AppMonitor_Exit (0x180003f0f0) and release exit (0x1800040210) for lifecycle.
- For profile writes, see docs/profile_details_parsing.md; for reset defaults, see docs/reset_profile_behavior.md.
