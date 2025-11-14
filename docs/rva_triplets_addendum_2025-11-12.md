# RVA Triplets Addendum — 2025-11-12

This addendum complements `docs/rva_triplets.md` with confirmed addresses and additional handlers identified via Ghidra MCP.

Image base and globals:
- Image base: 0x180000000
- Global hardware object (`hw`): 0x18007e840 (RVA 0x7e840)

Confirmed Get triplets:
- Get-LightingProfileIndex: FUN_180011210 @ 0x1800011210 (RVA 0x11210) → writes `*(hw + 0x154)`
- Get-BrightnessLevel: FUN_180014110 @ 0x1800014110 (RVA 0x14110) → writes `*(hw + 0x158)`

Profile Info path:
- init_profile_detail (high-level): FUN_180014630 @ 0x1800014630 (RVA 0x14630)
- GetProfileDetails (low-level): FUN_180012660 @ 0x1800012660 (RVA 0x12660)
- JSON builder (final): FUN_180054210 @ 0x1800054210 (RVA 0x54210)
- Builder helper: FUN_180052800 @ 0x1800052800 (RVA 0x52800)

Set operations (adjacent):
- Set-LightingProfileIndex: FUN_180013650 @ 0x1800013650 (RVA 0x13650) → updates `*(hw + 0x154)`, refreshes details, builds JSON
- Set-BrightnessLevel: FUN_180014290 @ 0x1800014290 (RVA 0x14290) → updates `*(hw + 0x158)`

Dispatcher and inventory:
- Command vector builder: FUN_18003df30 @ 0x180003df30 (RVA 0x3df30)
- Request dispatcher: FUN_18003b670 @ 0x180003b670 (RVA 0x3b670) — xref-confirmed link to builder

Notes:
- The “Get” profile details path may not persist layer vectors at (hw+0x1B0) on some builds; favor the JSON builder when empty.
