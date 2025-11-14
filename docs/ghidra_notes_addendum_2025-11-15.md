# Ghidra Notes Addendum — 2025-11-15

## Key updates since 11-12

1. **Dispatcher context for `Set-LightingProfileIndex`.**
   * Core path is inside `FUN_18003B670` (RVA `0x18003D360`): after the request dispatcher iterates strings it allocates the std::string at `[rsp+0x40]`, zeroes it via `FUN_18000ECB0`, and passes it along with the detail struct (`[rsp+0x170]`) into `FUN_180013650`.
   * `ctx` (`r9`) is always `NULL`; the worker never dereferences it. The SEH crash occurred because our bridge passed only 8 bytes as the std::string, so `pStringInit` / `pStringDestroy` corrupted the stack.
   * Fix: allocate the full 32-byte `VendorString` (16-byte inline buffer plus size/capacity) before calling the worker and clean it up afterward. `ctx` can remain `NULL` while the string is valid.

2. **Bridge instrumentation.**
   * `SetProfileBridge.cpp` now logs the worker call, builds `VendorString`, and relies on the same `pStringInit` helper the dispatcher uses.
   * After the native call returns the bridge continues by invoking the JSON builder (`FUN_180054210/0x180015EA0`) exactly as the dispatcher does, so we avoid any confusion about `ctx`.

3. **SetBrightness confirmation.**
   * `SetBrightnessBridge.cpp` remains the stable `SetBrightnessLevel` triplet path (RVA `0x180014290`), and the UI sees brightness updates immediately. This file already documents the direct worker path and the success of the bridge.

Next research waypoint: examine the dispatcher’s allocation at `[rsp+0x170]` to understand whether `SetProfileIndex` ever expects data beyond the detail struct (e.g., logging strings or flags); if so, mirror the same struct layout and populate identical zero/flag values before calling the helper.
\n### Dispatcher vtable call (index 3 / FUN_18004e570)\n- Signature confirmed via Ghidra: oid __fastcall(RequestDispatcher*, json* outJson, json* inCommand, json* inPayload, void* ctx); rcx=this, rdx=out, r8=inCommand, r9=inPayload, ctx at [rsp+0x20].\n- The wrapper immediately forwards those objects into FUN_18004df50 ? FUN_18003b670, then destroys the inCommand/inPayload JSONs. Passing arguments in any other order corrupts memory and yields the 0xC0000005 crash we observed.\n- Bridge fix: build json outJson, json commandJson, json payloadJson; call dispatcher(instance, &outJson, &commandJson, &payloadJson, nullptr) and then UTF-8 encode outJson.dump(). ctx may remain NULL.\n
### Dispatcher JSON object requirements
- FUN_18004e570 and its helper FUN_18004df50 treat inCommand, inPayload, and outResult as fully-formed 
lohmann::json instances: they call constructors, pass them through FUN_18003b670, then destroy them (see the loops walking param_3[7] / param_4[7]).
- A json object on x64 is ~64 bytes; attempts to use small fixed buffers (e.g., char[32] with placement new) will corrupt the stack long before the dispatcher even begins processing. The crash we saw is precisely this corruption.
- Safe path: declare real stack json variables (or heap 
ew json) for command/payload/output, populate them, and call dispatcher(instance, &outJson, &commandJson, &payloadJson, nullptr) so the native cleanup logic operates on bona fide objects.
- Command JSON should include the keyword (e.g., {"Command":"Set-LightingProfileDetails"}), while payload JSON is the user profile. The dispatcher fills outJson with the result before returning.
\n### Crash dump 0xC0000005 (Set-LightingProfileDetails)\n- details_setter_crash.dmp shows the fault occurs inside FUN_18003b670 while walking the parsed payload. The dispatcher dereferences pointers inside the JSON array that match the layout we saw earlier, but our payload contains profileId, layers, nimationConfig, etc. As soon as it iterates the layers vector it reads a null pointer, indicating **the payload never got copied into the expected json detail structure**.\n- Reason: Set-LightingProfileDetails expects inPayload to have the same shape the UI sends (includes profileId, layers, and nested color formats). The dispatcher currently expects a json *string* or 
lohmann::json::object_t with certain metadata; feeding the raw file works for query commands but not for this setter. Next step: capture the actual payload Vantage sends (using our dispatcher logger) to mirror its structure byte-for-byte.\n
