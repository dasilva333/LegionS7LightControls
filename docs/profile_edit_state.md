# Profile Edit State (Set-ProfileEditState)

Image base: 0x180000000

This note explains the dispatcher-managed "editing profile animation" mode toggled by the `Set-ProfileEditState` keyword, how it fits with control acquisition, and what to expect when enabled.

## Handler and evidence

- Keyword: `Set-ProfileEditState`
- Dispatcher: handled inside FUN_18003b670 (RequestDispatcher), with logs:
  - "editing profile animation true" @ 0x180068ec0 (xref in dispatcher at 0x18003d088)
  - "editing profile animation false" @ 0x180068f70 (xref in dispatcher at 0x18003cf7e)
- No separate callee is invoked for this toggle; the dispatcher implements it inline.

## Behavior

- When set to true:
  - The firmware animation manager enters an "edit" mode: host control (software) remains in charge, and UI/edit flows can apply changes to profile/layers without firmware contention.
  - Intended to be used with control acquisition (see `init_profile_detail` 0x1800014630).

- When set to false:
  - Edit mode is turned off; the system returns to normal update flows. Combined with `stop_expand_animation` (0x1800014cb0) this returns control to firmware.

## Internal state

- The boolean flag write for edit mode is performed inside the dispatcher branch via a helper call (not a direct global store in the adjacent basic blocks). Behavior is confirmed by dispatcher logs and surrounding calls.
- Related state:
  - Control flag: host control acquired via `init_profile_detail` (0x1800014630) and released via `stop_expand_animation` (0x1800014cb0).
  - Screen-sync and animation control flags live near manager fields around +0x150/+0x160/+0x1f8; edit mode is coordinated with these flows.

### Dispatcher branch details (addresses)

- False branch (log off):
  - 18003cf7e: `LEA RCX,[0x180068f70]` ("editing profile animation false")
  - 18003cf85: `CALL 0x18000a340` (logger)
  - Flow continues through string/builder helpers (e.g., `0x180004360`, `0x18003b2a0`, `0x18003dea0`).

- True branch (log on):
  - 18003d088: `LEA RCX,[0x180068ec0]` ("editing profile animation true")
  - 18003d08f: `CALL 0x18000a340` (logger)
  - 18003d100: `MOVZX EDX, byte ptr [RSP+0x190]` (boolean parameter)
  - 18003d108: `LEA RCX,[RSP+0x198]`
  - 18003d110: `CALL 0x180017280` (local buffer op)
  - 18003d11d: `MOV RCX, qword ptr [RSP+0x1c0]` (context pointer)
  - 18003d125: `CALL qword ptr [0x18005f2f8]` (indirect API applying the toggle)

Note: The indirect call at `[0x18005f2f8]` is a shared slot used across multiple internal helpers; the edit toggle is applied via this callee rather than a direct global store in the dispatcher.

## Suggested usage

- To edit a profile in-place without leaving firmware in charge:
  1) Acquire control: call `init_profile_detail` (0x1800014630) for the target profile.
  2) Toggle edit on: `Set-ProfileEditState` = true (dispatcher).
  3) Apply changes (e.g., `Set-LightingProfileDetails`).
  4) Toggle edit off: `Set-ProfileEditState` = false.
  5) Optionally release control: call `stop_expand_animation` (0x1800014cb0) to hand back to firmware.

Notes
- If interacting only via direct workers (without dispatcher), edit mode is generally unnecessary; you can write details and rebuild JSON safely under host control. The dispatcher toggle is useful to mirror UI behavior or when relying on dispatcher-driven flows.
