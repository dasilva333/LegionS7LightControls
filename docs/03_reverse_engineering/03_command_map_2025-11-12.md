# Command Map Deep Dive — 2025-11-12

Image base: 0x180000000

Global hardware object (`hw`): 0x18007e840 (RVA 0x7e840)
- Offsets: +0x154 current profile id; +0x158 brightness; +0x1f8 screen-sync flag; +0x150 thread stop flag; +0x160 thread gate flag; +0x220 current animation id

Get/Set Basics (confirmed)
- Get-LightingProfileIndex → 0x1800011210 (RVA 0x11210)
  - Writes `*(uint*)(hw + 0x154)`
- Get-BrightnessLevel → 0x1800014110 (RVA 0x14110)
  - Writes `*(uint*)(hw + 0x158)`
- Set-LightingProfileIndex → 0x1800013650 (RVA 0x13650)
  - Updates `*(uint*)(hw + 0x154)`, refreshes details, builds JSON
- Set-BrightnessLevel → 0x1800014290 (RVA 0x14290)
  - Updates `*(uint*)(hw + 0x158)`

Profile Info (read/build)
- init_profile_detail → 0x1800014630 (RVA 0x14630)
- GetProfileDetails → 0x1800012660 (RVA 0x12660)
- JSON builder (final) → 0x1800054210 (RVA 0x54210)
  - Helper: 0x1800052800 (RVA 0x52800)

Screen To Keyboard (color sync)
- Set-ScreenToKeyboard (handler) → 0x1800013eb0 (RVA 0x13eb0)
  - Behavior: stops current animation, sets flags and spawns sync thread.
  - Sets `*(char*)(hw + 0x160) = 1` (gate on), `*(char*)(hw + 0x150) = 1` then thread clears it.
  - Creates `_beginthreadex` worker pointing to SyncKbdColorThread.
  - Dispatcher logs: "Set-ScreenToKeyboard Success/Failed".
- SyncKbdColorThread → 0x1800010850 (RVA 0x10850)
  - Loop runs while `*(char*)(hw + 0x150) == 0`.
  - If `*(char*)(hw + 0x160) == 0`, the loop idles until set.
  - Periodically calls `FUN_180010af0` (color push) and logs start/stop.
- Stop/release control helper → 0x1800014cb0 (RVA 0x14cb0)
  - Calls animation_obj->stop(), clears `*(hw + 0x220)` and sets `*(char*)(hw + 0x1f8) = 0`.
  - Logs "sync_expand_animation release control".

Switch-AnimationControl (toggle control)
- Command string at 0x1800691c0; dispatcher mapped, handler not isolated by string xref.
- Observed control flow:
  - Acquisition: occurs during `init_profile_detail` (0x14630), logs "get control" and sets `*(char*)(hw + 0x1f8) = 1` after getting animation obj.
  - Release: via `stop_expand_animation` (0x14cb0), logs "release control" and clears `*(char*)(hw + 0x1f8)`.
- Likely behavior: toggles between software control vs firmware control by invoking acquire (init_profile_detail → get control) and release (stop_expand_animation) paths above. In software control, host threads (expand/sync) drive per-frame colors; in firmware control, the device uses its onboard animation engine according to active profile.

Device/Capability/Version
- Get-KbdBasicInfo → 0x180003e840 (RVA 0x3e840)
  - Calls GetSupportedAnimation then queries keyboard info; on failure returns "GetKBD_information Failed!".
  - Uses GetKbdLanguage (0x1800029aa0) to augment output.
- Get-Capability → backed by GetSupportedAnimation 0x1800010e60 (RVA 0x10e60)
  - Populates supported animations; used by KbdBasicInfo and likely direct capability queries.
- Get-FirmwareVersion → 0x180002af70 (RVA 0x2af70)
  - Returns version string (major.minor) via internal helpers.

Color callbacks
- Set-StartCurKeysColorCallback / Set-StopCurKeysColorCallback
  - Strings present; dispatcher references confirmed.
  - Registration/refresh helpers:
    - RequestDispatcher::reg_callback → 0x180040910 (logs and invokes a write_log sink)
    - RequestDispatcher::refresh_reg_callback → 0x1800407a0
  - Dispatcher messages: "color callback thread begin/enter/end", and StopGetKeyColorCallback branches (no-need vs set-profile), indicating a dedicated thread lifecycle.
  - Expected behavior: register/unregister app callbacks to receive current key colors while sync/animation is running; exact handler blocks live inside dispatcher 0x3b670.
  - Emitter routine: 0x1800013d80 (RVA 0x13d80)
    - Clears hw+0x160 gate (sets 0), increments a counter at hw+0x15c, builds a JSON-like string from state at hw+0x1c8, and writes it to the provided buffer. This is likely the per-iteration callback payload generator used by the callback thread.

Profile Edit State
- Set-ProfileEditState → handled in dispatcher (strings at 0x180068ec0/0x180068f70)
  - Toggles editing mode: logs "editing profile animation true/false" from dispatcher blocks
  - Effect: signals the animation manager to enter/exit edit mode while host control is active; interacts with control acquisition (hw+0x1f8) and may gate updates.

Dispatcher and keywords
- Command vector builder → 0x180003df30 (RVA 0x3df30)
- Request dispatcher → 0x180003b670 (RVA 0x3b670) (confirmed via xrefs)
  - Contains references to Set-ScreenToKeyboard success/fail strings; calls 0x13eb0 to start sync.

Notes
- For robust Profile JSON: prefer builder 0x54210 after init/parse; or call SetProfileIndex with current id (0x13650) to force JSON emission.
- ScreenToKeyboard can run a persistent thread; ensure proper stop/release via 0x14cb0 before switching control modes.
Profile Details (write)
- Set-LightingProfileDetails → dispatcher parses JSON then commits via writer 0x1800011380
  - JSON contract: layer objects include `layerId` (int), `keys` (int[]), `animationConfig` (object with animationId, speed, clockwise, direction, colorType, colorSize, colorList, transition)
  - Parsers: layer 0x1800052620; keys 0x180004ff70; animationConfig 0x1800051fa0
  - See docs/profile_details_parsing.md:1 for details
Profile Reset
- Set-ResetLightingProfile → 0x18000138c0 (RVA 0x138c0)
  - Resets the specified profile; if requested, reparses details and rebuilds JSON. Performs registry reads under Vantage AddinData to adapt behavior.
  - Defaults: no hand-built full JSON; reset delegates to firmware. When no layers are present, parsers may inject a minimal default layer template (all zeros for animation and empty keys/colors). See docs/reset_profile_behavior.md:1
