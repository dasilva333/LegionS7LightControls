# Key Index Mapping (Profile JSON `keys`)

The `keys` array emitted by the JSON builder is a list of hardware `keyId`s that belong to the active layer. Each `keyId` maps directly to a row in the layout table that `funcGetKeyBoardLayoutInfo` produces when the hardware object is refreshed (`call 0x14630` as shown in `docs/test-harness.md`).

## Observed key IDs (profile 4 layer)

```
1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,
22,23,24,25,26,27,28,29,30,31,32,33,34,
38,39,40,41,56,64,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,
85,88,89,90,91,92,93,95,
104,106,109,110,111,112,113,114,115,116,117,118,119,
121,123,124,127,128,130,131,
135,136,141,142,144,146,
150,151,152,154,155,156,157,159,161,163,165,167
```

These appear in sorted order, covering contiguous regions of the keyboard (top row, alphanumeric row, arrow/numpad clusters, etc.). Understanding the physical key name requires cross-referencing each `keyId` with the layout table because the JSON builder emits indexes, not text labels.

## Mapping strategy

1. **Refresh the layout table:** run `call 0x14630` (init) and immediately `funcGetKeyBoardLayoutInfo` (the workhorse logs print repeatedly in the harness). Use `dump` to capture the table stored near `hw + 0x100/0x120` after the call.
2. **Parse the entries:** each entry is a fixed-size structure (several `uint32`/`uint64` fields followed by metadata). The first element in each entry is the `keyId` used in the JSON `keys` array, and consecutive entries are stored in memory contiguously.
3. **Match against friendly names:** the layout table also contains row/column hints and, in some cases, pointers to `wchar_t` strings (observed values like `0xA5F0...` in the dumps). By reading from those pointers you can recover human-readable labels (e.g., `Esc`, `F1`, `A`, `LeftArrow`).
4. **Document mapping:** once a `keyId` ↔ `keyName` mapping exists, use it to annotate the JSON builder output or to build user-friendly summaries.

## Quick ranges (tentative)

| `keyId` range | Likely physical region |
|--------------:|----------------------|
| 1-20          | Top-left cluster (Esc + function row around F1–F12) |
| 22-34         | Number row and surrounding symbols (1–0, -, =) |
| 38-41         | Right-side navigation keys (PrintScreen block) |
| 56,64,66-81   | Main alphanumeric / modifier islands (letters, Tab, Caps, Shift) |
| 85,88-95      | Arrow keys / navigation block (Home, End, PgUp, PgDn) |
| 104-119       | Numeric keypad / macro rows |
| 121-136       | Media/editing keys near top or right edge |
| 141-167       | Additional zones such as macro keys, numpad extras, or secondary layout islands |

> **Note:** the ranges above are inferred from the sorted `keys` output; confirm them by unloading the layout table and examining the row/column metadata produced by `funcGetKeyBoardLayoutInfo` (hit `dump` and follow the pointer trails). Once the mapping is locked in, store it here so each future JSON output can be rendered with friendly names instead of raw indexes.
