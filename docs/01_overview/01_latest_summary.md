
## 1. Big picture: what Lenovo’s stack looks like

* Vantage is layered:

  1. UI and managed add-ins (`LenovoGamingUserAddin.dll`, `KeyboardContract.dll`, etc.) handle contracts, XML/JSON shapes, and high level UX.
  2. A managed `RequestDispatcher` in the gaming add-in forwards commands across to native code.
  3. The real lighting logic lives in `Gaming.AdvancedLighting.dll`, a native C++ module that talks to HID / ACPI and maintains controller state. 

* The goal of this whole project is to treat `Gaming.AdvancedLighting.dll` as a stable SDK so we can control the keyboard directly without running Vantage, using the same workers and dispatcher it uses internally. 

---

## 2. Your own repo layout and tooling

**Project layout**

* Root has several focused subprojects: `BrightnessController`, `SetProfileProject`, `SetProfileDetailsController`, `ProfileReaderProject`, `ProfileBridgeProject`, plus `docs/`, `.vscode/`, `.output/`. 
* `ProfileReaderProject` contains the reader bridge and a legacy CLI harness, `ProfileBridgeProject` contains the writer bridge and its harness, and `SetProfileDetailsController` / `SetProfileProject` are the newer worker/harness pairs for profile editing and profile index control. 

**Tool inventory**

* Paths are recorded for all the important tools:

  * Vantage add-ins and services under `C:\ProgramData\Lenovo\Vantage\Addins\...` and `C:\Program Files (x86)\Lenovo\VantageService\...`.
  * `Dependencies.exe` under `C:\Users\h4rdc\Downloads\Dependencies_x64_Release\Dependencies.exe`.
  * ILSpyX in a typical user-local install, even though the exact path was not logged. 

That inventory is mainly there so either LLM can always re-open the same binaries with the same tools.

---

## 3. Dispatcher vtable[3] and live traffic (Frida findings)

**Entry point and ABI**

* All lighting commands go through a single virtual function at vtable index 3 of the object returned by `get_instance()`. The method is at RVA `0x4e570` (`FUN_18004e570`). 

* Signature (per Frida captures and revived Ghidra work):

  `void __fastcall dispatcher(RequestDispatcher* this, std::string* outString, std::string* inCommand, std::string* inPayload, void* ctx);`

  * `rcx` = this
  * `rdx` = &outString
  * `r8`  = &inCommand (JSON text wrapped in a std::string)
  * `r9`  = &inPayload (typically `"write_log"` or another tag)
  * `ctx` = optional blob / context pointer (can be null)

* Using `nlohmann::json` objects at the boundary corrupts the stack; we only use json locally to parse/build the string contents before sending them.

**Command JSON shape**

* `inCommand` is a full JSON envelope:

  ```json
  {
      "contract": "Gaming.AdvancedLighting",
      "command": "Set-LightingProfileDetails",
      "payload": "ESCAPED_JSON_STRING_PAYLOAD",
      "targetAddin": null,
      "cancelEvent": "...",
      "clientId": "Consumer",
      "callerPid": 26312
  }
  ```

  The important bit is that `payload` is itself a string that contains escaped JSON. 

* `inPayload` (`R9`) is *not* the profile JSON. It is a short tag such as `"write_log"` or `""`, and must match the captured traffic. Passing the payload JSON here crashes Lenovo’s parser. 

**Responses**

* `outJson` has a consistent envelope with `errorcode`, `errordesc`, `payload`, `percentage`, `type`. For example, `Get-KbdBasicInfo` returns a huge escaped JSON payload that includes supported animations and layouts. 
* `Set-LightingProfileIndex` replies with profile data nested in a doubly escaped JSON `SettingList[ "Data" ]` element. `Set-LightingProfileDetails` replies with a simple success payload. 

So, for dispatcher-level control, the safe pattern is to keep `std::string` objects at the call site:

```cpp
std::string outBuffer;
std::string commandBuffer = /* captured JSON string */;
std::string payloadTag = /* "write_log", "" etc. */;
dispatcher(instance, &outBuffer, &commandBuffer, &payloadTag, ctxPtr);
```

---

## 4. Dispatcher replay harness

* Frida hook `hook_lighting.js` logs every dispatcher call into per-argument files under `%LOCALAPPDATA%\Temp\traffic`, one timestamp per call. 

* For each timestamp `<ts>` you get:

  * `inbound_command_<ts>.binary` and `.json` for the contract JSON.
  * `inbound_payload_<ts>.binary` and `.json` for the logging tag.
  * `inbound_context_<ts>.binary` / `.json` if a context blob exists.
  * `outbound_result_<ts>.json` for the response. 

* The SetProfileDetails controller’s test harness (`SetDetailsTest`) takes a list of timestamps and replays them all, in order, through `SetDetailsBridge.dll`:

  ````powershell
  cd C:\Users\h4rdc\keyboard-led-project\SetProfileDetailsController\SetDetailsTest
  "C:\Program Files\dotnet\dotnet.exe" run -- 1763158850008 1763158855461 1763158857167
  ``` :contentReference[oaicite:14]{index=14}  

  ````

* Typical sequence for profile editing:

  1. Optional: any `Get-*` commands.
  2. `Set-ProfileEditState` (enter edit mode).
  3. `Set-LightingProfileDetails` (send new layer/effect).
  4. `Set-ProfileEditState` with empty payload (commit and exit). 

If replay crashes near `rbx+0x38`, it usually means a preparatory call was dropped and the internal edit context was never opened. 

---

## 5. Profile JSON parsing and builders

**Set-LightingProfileDetails flow**

* Handler `SetProfileDetails` worker is at `0x1800011380` (RVA `0x11380`). It:

  * Writes `profileId` into `*(hw+0x1A8)`.
  * Copies the parsed layer vector into structures behind `hw+0x1B0`.
  * Builds per-layer working state and logs. 

**Parsers**

* `Layer` parser `FUN_180052620` parses `layerId`, `keys`, and `animationConfig` for each layer.
* `Keys` parser `FUN_18004ff70` validates an array and materializes it into an internal int vector.
* `AnimationConfig` parser `FUN_180051fa0` parses animation parameters and color list. 

**Builders**

* Builder side mirrors the parsers:

  * `FUN_180052950` builds `animationConfig` JSON.
  * `FUN_180053e50` builds each layer object, using `FUN_18004f0b0` to build the `keys` array.
  * `FUN_180054210` builds the full profile JSON from the detail vector. 

* Practical usage pattern for reading a profile:

  1. Call `init_profile_detail` at `0x1800014630`.
  2. Call `GetProfileDetails` at `0x1800012660`.
  3. Call profile JSON builder at `0x1800054210`. 

This yields the complete JSON without relying on cached vectors at `hw+0x1B0`.

---

## 6. Profile index and brightness workers

From the Ghidra addendums:

* Addresses of interest (RVAs from image base `0x180000000`): 

  * `GetProfileIndex` triplet: `0x11210`, writes `*(hw+0x154)`.
  * `GetBrightnessLevel` triplet: `0x14110`, writes `*(hw+0x158)`.
  * `SetProfileIndex` worker: `0x13650`, updates `*(hw+0x154)` and calls `GetProfileDetails` + JSON builder.
  * `SetBrightnessLevel` worker: `0x14290`, updates `*(hw+0x158)`.
  * `init_profile_detail`: `0x14630`.
  * `GetProfileDetails`: `0x12660`.
  * Final profile JSON builder: `0x54210`.

**SetBrightness**

* A dedicated bridge (`SetBrightnessBridge.dll`) calls the worker at `0x14290` directly:

  `pSetBrightness(hw, new_brightness_value)`

* This is fully validated: it updates brightness in hardware and the Vantage UI, and `GetBrightnessLevel` triplet reports the new value from `*(hw+0x158)`. 

**SetProfileIndex**

* Direct calls into the worker at `0x13650` originally crashed with SEH 0xC0000005. Investigation showed:

  * The function actually expects a `VendorString` structure (32 bytes) in addition to the `hw` pointer and profile id parameters.
  * The dispatcher allocates this at `[rsp+0x40]`, zeroes it with `FUN_18000ECB0`, and passes that plus the detail struct and a null ctx into `FUN_180013650`. 
  * Your bridge was only passing an 8-byte placeholder, so `string` init/teardown corrupted the stack.

* Fix:

  * Allocate a full 32-byte `VendorString` (16-byte inline buffer + size/capacity).
  * Use the same init/destroy helpers the dispatcher uses.
  * Keep `ctx` as `NULL`, since the worker does not dereference it in this flow. 

* There is also the "same-ID SetProfileIndex" trick:

  * Read current profile via `GetProfileIndex` (`0x11210`).
  * Call `SetProfileIndex` with the same id.
  * Internally it sees "no change", but calls `GetProfileDetails` + JSON builder and returns the active profile JSON inside the response. 

---

## 7. Build & run routine for the SetDetails bridge

* `SetDetailsBridge.dll` is built from `SetDetailsBridge.cpp` with MSVC, C++17, and `dbghelp.lib` so it can emit crash dumps when Lenovo’s DLL faults. 
* Standard build command (via `vcvars64.bat`) and copy step move the DLL into `SetDetailsTest` before running the harness. 
* The worker harness always takes timestamps and replays that sequence through the dispatcher bridge, so the exact sequence from live Frida traffic is what the DLL sees. 

---

## 8. Where this leaves us for debugging

So far, the docs say:

* Dispatcher-level control is fully mapped. We know the ABI, the exact command shapes, and how to replay real traffic safely.
* Brightness control through the worker at `0x14290` is stable and confirmed.
* Profile details are best handled by sending proper `Set-ProfileEditState` + `Set-LightingProfileDetails` sequences to the dispatcher, using the parsing/builder map as ground truth for JSON structure.
* Direct profile index changes through `SetProfileIndex` need a correctly constructed `VendorString` and a correctly shaped detail struct; `ctx` is null in the successful path.

When we come back to your latest disassembly at `0x00007FFB2462EE50` and the helper at `0x00007FFB24677218`, we can interpret them against this model as:

* A prologue for one of the worker or dispatcher helper routines that sets up a `VendorString`/detail struct on the stack, then calls the worker, likely along the lines described in the Ghidra addendums.
* The jmp at `0x24677218` looks like part of a small wrapper that either recurses for string destruction or dispatches into the same init/destroy helpers discussed in the SetProfileIndex fix.


Nice, this batch really fills in the missing pieces. Here’s the contextual summary for this set of docs.

---

## Big-picture synthesis

Across these files you now have:

* A clean **RVA map** for all the important workers and builders (Get/Set brightness, profile index, profile details, ScreenToKeyboard, JSON builders, dispatcher).
* A **formal JSON schema** for lighting profiles, plus an animation-ID cheat sheet and analysis of concrete examples like `always_dark_red.json` and `aurora_sync.json`.
* A **control-modes model** that explains firmware vs software control, `hw` flags, and how ScreenToKeyboard and `colorType` values relate to host-driven rendering.
* A **key index mapping strategy** so JSON `keys[]` indices can be turned into physical key names using the layout table from `funcGetKeyBoardLayoutInfo`.
* A solid **builder strategy** for profile JSON that treats the 0x54210 family as the single source of truth, independent of whether `(hw+0x1B0)` is populated.
* A **CLI harness workflow** to safely exercise “triplets” (GetFirmwareVersion, GetKbdBasicInfo, GetSupportedAnimation, etc.) against the real hardware object. 
* **Dispatcher / Frida docs** that lock in the vtable index, the `RequestDispatcher` signature, and the exact JSON envelope sent over the in-process API.

Together, this batch basically defines a full, documented API surface: schema, transport, helpers, and control model.

---

## File-by-file context

### `lighting_profile_schema.md`

* Defines TypeScript-style interfaces for `Color`, `AnimationConfig`, `Layer`, and `Profile`, which match the JSON emitted/accepted by `Set-LightingProfileDetails`. 
* Includes an animation-ID cheat sheet with inferred behaviors and UI names, plus detailed analysis of `always_dark_red.json` (`animationId: 11`, `colorType: 2` = static solid) and `aurora_sync.json` (`animationId: 1005`, `colorType: 0`, empty `colorList` = screen-driven). 
* Concludes that Lenovo uses a proprietary sequential key index, so all key mapping has to be discovered empirically. 

### `control_modes.md`

* Describes the **firmware vs software** control split and how the DLL signals it through `hw` fields: `+0x1f8` (control-acquired), `+0x220` (current animation id), `+0x150/0x160` (ScreenToKeyboard stop/gate flags). 
* Maps ScreenToKeyboard: start handler at 0x13eb0, SyncKbdColorThread at 0x10850, release at 0x14cb0, and the “Switch-AnimationControl” command that toggles between firmware and host control. 
* Ties `colorType 0/1` to host-driven modes and `colorType 2` to firmware static profiles, and sketches a path to a custom host loop that acquires control, pushes per-frame colors, then releases control cleanly.

### `rva_map_2025-11-12.md`

* Gives a compact map of all major functions with image base and segments. 
* Identifies the global `hw` object and key offsets for profile index (+0x154), brightness (+0x158), and profile info (+0x1A8 / +0x1B0). 
* Groups operations into triplets: GetProfileIndex (0x11210), GetBrightnessLevel (0x14110), SetProfileIndex (0x13650), SetBrightnessLevel (0x14290), Set-LightingProfileDetails writer and parsers, ScreenToKeyboard start and sync thread, and the dispatcher / command-vector functions. 

### `ghidra_notes_addendum_2025-11-12.md` and `ghidra_notes_addendum_2025-11-15.md`

* 11-12 addendum nails down the addresses for dispatcher, JSON builder (0x54210), builder helper (0x52800), Get/Set workers, and ScreenToKeyboard handlers. 
* 11-15 addendum documents the debugging around `Set-LightingProfileIndex`: the SEH crash cause (passing a too-small “VendorString”), the fix (allocating a full 32-byte string struct like the dispatcher does), and confirmation that `ctx` can be null. 
* Also spells out the dispatcher vtable method signature and warns that all three `nlohmann::json` parameters must be real objects, not ad-hoc buffers, or the stack will corrupt. 

### `builder_strategy.md`

* Argues that when `(hw + 0x1B0)` is not reliably filled, the safest method is to call the internal JSON builder at ~0x54210 directly after `init_profile_detail` / parser, then dump via the vendor string.
* Outlines a plan: decompile to confirm the prototype, determine calling convention, construct inputs from the `hw`-backed structs, then compare builder JSON to memory-scraped JSON to validate. 

### `key_index_mapping.md`

* Explains that `keys[]` in the profile JSON is a list of hardware `keyId`s that must be matched to a separate layout table populated by `funcGetKeyBoardLayoutInfo` after calling 0x14630. 
* Describes how each layout entry starts with `keyId` and may include row/column metadata and pointers to Unicode labels, and gives a strategy for building a full `keyId ↔ keyName` map. 
* Provides tentative ranges mapping groups of keyIds to physical keyboard regions. 

### `frida_live_traffic_analysis.md`

* Documents hooks on the dispatcher vtable method (`index 3`, RVA 0x4e570) and defines the outer `inCommand` JSON schema, including `contract`, `command`, `payload`, `clientId`, etc.
* Shows live captured examples for `Get-KbdBasicInfo`, `Get-LightingProfileIndex`, `Set-LightingProfileIndex`, `Set-LightingProfileDetails` (clear profile, set static color), and `Set-ProfileEditState`.
* Emphasizes that `payload` is always an escaped JSON string (or simple string) nested inside the outer command JSON, which is critical for any bridge that wants to drive the dispatcher instead of calling workers manually.

### `test-harness.md`

* Describes the `.NET` “Hardware Object Memory Inspector” CLI with `call <rva>` and `dump <offset> [size]` commands. 
* Walks through how to dump the vector at `hw + 0x1B0` (begin/end/capacity pointers) and follow the `begin` pointer to raw layer structures (50 bytes each). 
* Then pivots to a “triplet hunter” plan for calling workers like `GetFirmwareVersion`, `GetKbdBasicInfo`, and `GetSupportedAnimation` using the harness, with suggested `dump` calls to search for changed memory. 

---
 
