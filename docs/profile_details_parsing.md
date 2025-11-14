# Profile Details Parsing (Set-LightingProfileDetails)

Image base: 0x180000000

This note maps the JSON→structure parsing functions the DLL uses when handling `Set-LightingProfileDetails` and documents expected keys and types.

## High-level flow

- Dispatcher receives the `Set-LightingProfileDetails` command and parses payload JSON into an internal detail structure.
- Writer applies the detail to runtime state/caches:
  - SetProfileDetails writer: FUN_180011380 @ 0x1800011380 (RVA 0x11380)
    - Sets `*(uint*)(hw+0x1A8) = profileId` and copies the layer vector into `hw+0x1B0`-backed structures.
    - Builds per-layer working sets and logs.

## JSON parsing (layer object and animationConfig)

- Layer parser: FUN_180052620 @ 0x1800052620 (RVA 0x52620)
  - Keys parsed at the layer level:
    - `layerId` (int)
    - `keys` (int[]), parsed via keys parser (see below)
    - `animationConfig` (object), parsed by the animationConfig parser (see below)

- Keys parser (int array): FUN_18004ff70 @ 0x180004ff70 (RVA 0x4ff70)
  - Validates the value is an array; materializes into an internal vector of ints.
  - Used by the layer parser for the `keys` field.

- AnimationConfig parser: FUN_180051fa0 @ 0x1800051fa0 (RVA 0x51fa0)
  - Reads keys and writes numeric fields into the target layer entry:
    - `animationId` (int)
    - `speed` (int)
    - `clockwise` (int)
    - `direction` (int)
    - `colorType` (int)
    - `colorSize` (int)
    - `colorList` (array of {r,g,b}) — validated to be an array; parsed via FUN_180050390
    - `transition` (int)

- Builder counterpart (for JSON emission):
  - FUN_180052950 @ 0x1800052950 (RVA 0x52950) — constructs `animationConfig` JSON from a layer entry
  - Higher-level profile JSON builder: FUN_180054210 @ 0x1800054210 (RVA 0x54210)

## Layer vector and builders

- Each layer entry is 0x50 bytes. Known fields used by builders/readers include:
  - +0x00: layerId (uint32)
  - +0x18: animationId (uint32)
  - Additional fields are populated by the animationConfig parser above; color keys and list data are materialized into vectors that the builder consumes.

- Layer builder: FUN_180053e50 @ 0x1800053e50 (RVA 0x53e50)
  - Emits a single layer object with `layerId`, `keys` and `animationConfig`.
  - Keys builder used internally: FUN_18004f0b0 @ 0x180004f0b0 (RVA 0x4f0b0)

## Notes

- SetProfileDetails writer 0x11380 consumes an already-parsed detail structure. External callers should provide JSON payload to the dispatcher (or a bridge function that uses these parsers) rather than attempting to build internal memory layouts directly.
- Keys are lower camel case as confirmed by .rdata strings.

## JSON builder confirmation

- Verified sequence for reading: `init_profile_detail(0x1800014630)` → `BuildPrep` (`0x1800054210`) → `JsonWrite` (`0x1800015ea0`).
- `BuildPrep` primes the writer with the detail structure created by the init call; `JsonWrite` renders the result into a vendor `std::string` whose length lives at `+0x10` and whose buffer is inline up to 15 bytes.
- The bridge now logs this path (`BuildPrep(0x180054210)` followed by `JsonWrite(0x180015ea0)`) and dumps `last.json` to `%LOCALAPPDATA%\ProfileBridge` so you can confirm the output without re-running the bridge.

### Sample JSON emitted by the builder

```
{"layers":[{"animationConfig":{"animationId":7,"clockwise":0,"colorList":[],"colorSize":0,"colorType":1,"direction":0,"speed":3,"transition":0},"keys":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,22,23,24,25,26,27,28,29,30,31,32,33,34,38,39,40,41,56,64,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,85,88,89,90,91,92,93,95,104,106,109,110,111,112,113,114,115,116,117,118,119,121,123,124,127,128,130,131,135,136,141,142,144,146,150,151,152,154,155,156,157,159,161,163,165,167],"layerId":1}],"profileId":4}
```

The `keys` array is the list of hardware key indexes that participate in the layer; each entry maps directly to a `KeyBoardLayoutInfo` record produced by `funcGetKeyBoardLayoutInfo`.
