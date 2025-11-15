# init_profile_detail Notes

Source: `FUN_180014630` (RVA 0x14630) inside `Gaming.AdvancedLighting.dll`.

## Purpose
- Ensures the global firmware controller at `DAT_18007e840` (“FirmwareBaseAnimationManager”) is initialized.
- Loads the current profile details (layers, animations, key lists) into the manager.
- Acquires software control of the keyboard (sets `hw+0x1f8 = 1`, populates `hw+0x220` with the active animation id) when needed.

## Parameters
```
void init_profile_detail(
    longlong manager,        // RCX, points to DAT_18007e840
    uint* detail,            // RDX, profile detail struct
    void* scratch,           // R8  (unused directly here – passed down to helpers)
    char* ctx);              // R9, optional context blob
```
- `detail` points to a structure where `*detail` is the profileId, and offsets +0x10/+0x20 store layer arrays (50-byte records).
- When `*detail == 0`, the function calls `FUN_180011210` (`Get-LightingProfileIndex`) to populate it.

## Flow Overview
1. **Lazy Initialize Global Manager**
   - Uses TLS guard `DAT_18007eae8` and zeroes `DAT_18007e840` on first entry.
   - Calls `FUN_18000f6e0()` and registers `atexit(FUN_18005e6d0)`.

2. **Fetch Current Profile ID (if needed)**
   - Calls `FUN_180011210` (Get-LightingProfileIndex). If it fails, logs error 0x287 and exits.
   - Calls `FUN_180012660` (GetProfileDetails). Failure logs 0x298.

3. **Validate Provided Detail**
   - If `*detail != *(uint *)(manager + 0x154)` (current profile id) it logs 0x28e and aborts.

4. **Iterate Layers**
   - Each layer record is 0x50 bytes: `[layerId, animationConfig, key list...]`.
   - Builds temporary animation objects via `operator_new(0x20)` and `FUN_18001aff0` / `FUN_18001a790`.
   - Loads animation entries via hash table walk (`manager+0x200`/`manager+0x240`) and updates `manager+0x220` with the active animation id.

5. **Acquire Control / Start Screen Sync**
   - If `*(char *)(manager + 0x1f8) == 0`, constructs a small command (0x3c0d007, etc.) and calls `FUN_180029720` to “get control.”
   - On success, it retrieves the animation object from `FUN_18000e830`, calls its vtable (offset +0x10), and sets `*(manager+0x1f8) = 1`.
   - If screen sync is already running, it logs 0x2c6 and skips re-acquiring.

6. **Failure Path**
   - If no matching animation object is found or the control request fails, it releases via `FUN_180014cb0(manager, *detail)` and exits.

## Implications
- The `detail` buffer passed by the caller is only trusted if it already matches the manager’s `_curProfileId`. Otherwise Lenovo re-fetches profile details internally.
- When the controller is “warm,” `manager` already holds valid profile data, so passing zeroed buffers still succeeds.
- On a cold start (no profile loaded), both the arguments and the manager state are empty, so the helper logs an error and returns without acquiring control. This explains why replaying dispatcher calls only works reliably after Lenovo’s UI has initialized this manager.
