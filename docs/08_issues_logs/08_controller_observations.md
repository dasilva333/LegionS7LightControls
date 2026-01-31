# Controller Observations & Limits

## Warm State Requirement
- `Set-BrightnessLevel` (RVA 0x14290) works reliably because it writes directly to `*(hw + 0x158)`; no per-profile buffers are required.
- `Set-LightingProfileIndex` (RVA 0x13650) only works consistently if Lenovo Vantage has already initialized the controller. A cold start (zeroed detail/scratch buffers) often throws inside `init_profile_detail`.
- `Set-ProfileEditState` / `Set-LightingProfileDetails` require the full dispatcher prep (Get-* queries, control acquisition, non-null context blobs). Calling them standalone with zeroed buffers causes Lenovo’s helpers to throw.

## Replay Strategy
- Successful replays piggyback on Lenovo’s live state: capture immediately after entering the customization UI and replay the entire sequence (open edit → set details → close/apply) before Lenovo tears down its buffers.
- To isolate single commands, replay the prep commands (Get-KbdBasicInfo, Get-LightingProfileDetails, Set-LightingProfileIndex) right before the target call so the controller looks the same as it did during capture.
