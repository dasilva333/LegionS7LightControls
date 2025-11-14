# Failed Attempts via vftable / get_instance

This document records the initial (incorrect) attempts to call the request dispatcher via a vtable obtained from `get_instance`, and how we disproved that path.

## Hypothesis

- Call exported `get_instance` to obtain an object whose vtable contains the `RequestDispatcher` (RVA `0x3b670`). Then, call a slot (we guessed index 3) with JSON-like parameters.

## Evidence Collected

1) `get_instance` export exists and returns an address.
2) We built a “Debug-VTable” diagnostic that:
   - Computes `expectedDispatcher = base + 0x3b670`
   - Prints the first 16 vtable entries and checks for a match
   - Result: `matchIndex = -1`. Slot 3 was NULL.

3) Disassembly/decompilation:
   - The function at `0x18003df30` builds a vector of command strings but is not a vtable target.
   - Logging strings show `RequestDispatcher::LEDCommands` messages, but no vtable binding aligns with `get_instance`’s return.

4) Runtime behavior:
   - Attempting to call `pVftable[3]` yielded `dispatcher-null-slot3` in our diagnostics.
   - Therefore, `get_instance` does not return an instance whose vtable includes `RequestDispatcher`.

## Conclusion

- `RequestDispatcher` (RVA `0x3b670`) is not a vtable function for the object returned by `get_instance`.
- The correct approach is to call internal worker functions directly (triplets) or call the non-virtual dispatcher by absolute address with the correct ABI (fragile), or better yet, call the internal JSON builder function for profile info.

## What Worked Instead

- Direct triplets:
  - `base + 0x11210` → `*(hw + 0x154)` (profile index)
  - `base + 0x14110` → `*(hw + 0x158)` (brightness)
- High-level worker for profile info:
  - `base + 0x14630` then read `(hw + 0x1A8)` and `(hw + 0x1B0)`
- Low-level fallback:
  - `base + 0x12660` then re-read
- If memory isn’t populated on “Get”: call internal JSON builder function directly.

