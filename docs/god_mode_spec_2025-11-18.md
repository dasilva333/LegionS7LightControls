# Technical Specification: Direct Hardware Control ("God Mode")

**Date:** November 18, 2025
**Status:** CONFIRMED / WORKING
**Target Module:** `Gaming.AdvancedLighting.dll` (Image Base: `0x180000000`)

## 1. Executive Summary

"God Mode" is a method for achieving real-time, low-latency, per-key RGB control over the device hardware. Unlike previous methods that relied on high-level profile switching (JSON parsing) or screen capture hooks, this method utilizes a **Primitive Injection Strategy**.

By intercepting the lowest-level HID Write function immediately before it hands data to the Windows driver, we achieve absolute control over the lighting output with zero overhead. The host application (Lenovo Vantage) is utilized purely as a "carrier signal" to keep the device handle open and the render loop active.

## 2. The Injection Point (The "Primitive")

The control bottleneck is a specific un-exported function within `Gaming.AdvancedLighting.dll`. This function is responsible for sending the final formatted byte buffer to the USB HID driver.

*   **Function RVA:** **`0x209B0`**
*   **Signature (Reverse Engineered):**
    ```cpp
    void PrimitiveHidWrite(void* context, void* unknown, BufferInfoStruct* bufferInfo);
    ```
*   **Frida Hook Signature:**
    *   `args[2]` (RDX/R8): Pointer to a `BufferInfoStruct`.

### Buffer Access Logic
To access the raw HID report data, the hook must perform a double-dereference on `args[2]`:

1.  **`bufferInfoPtr = args[2]`**: The pointer to the structure passed to the function.
2.  **`dataPtr = bufferInfoPtr.readPointer()`**: The first 8 bytes of this structure contain the pointer to the actual 960-byte data payload.

## 3. Protocol Specification

The hardware expects a fixed-size **960-byte** HID output report.

| Segment | Offset (Decimal) | Size | Value / Description |
| :--- | :--- | :--- | :--- |
| **Header** | 0 | 1 byte | `0x07` (Report ID) |
| | 1 | 1 byte | `0xA1` (Command Signature: Set Color) |
| | 2 | 1 byte | `0xC0` (Variable/Flag) |
| | 3 | 1 byte | `0x03` (Protocol Version/Type) |
| **Payload** | 4 - 959 | 956 bytes | Sequence of **Key Color Blocks** |

### Key Color Block Format
The Payload consists of repeating **5-byte blocks**. Each block controls a specific LED zone or Key.

| Offset (Relative to Block) | Field | Type | Description |
| :--- | :--- | :--- | :--- |
| +0 | **Key ID** | `uint16_le` | 2-byte Little Endian Integer. Unique ID for the key/zone. |
| +2 | **Red** | `uint8` | 0-255 Brightness |
| +3 | **Green** | `uint8` | 0-255 Brightness |
| +4 | **Blue** | `uint8` | 0-255 Brightness |

**Total Capacity:** `(960 - 4) / 5 = 191` possible key definitions per frame.

### Multi-Zone Behavior
The hardware utilizes a "sparse" update logic. The buffer does not map 1:1 to physical positions. Instead, it is a list of `ID -> Color` instructions.
*   **ID 0x0000:** Indicates an empty slot or end-of-list. The iterator must check for `KeyID != 0`.
*   **LED Zones:** Single physical keys may be represented by multiple Key IDs (multi-zone lighting), or a single Key ID may map to a cluster of LEDs. The injection strategy blindly iterates provided IDs, ensuring all active zones are painted.

## 4. Implementation Architecture

The solution uses a **Parasitic Override** architecture. We do not create the connection to the keyboard; we hijack the existing one.

### Component A: The Host (Lenovo Vantage)
*   **Role:** Device Manager & Heartbeat Generator.
*   **State:** Must be set to **"Aurora Sync" (Screen Sync)** mode.
    *   *Why:* In this mode, the DLL runs a tight thread loop (~60fps) that constantly calls the Primitive function (`0x209B0`) to update the keyboard.
    *   *Effect:* This provides a continuous stream of valid, formatted buffers with valid Key IDs. We do not need to allocate memory or enumerate keys; the Host does it for us.

### Component B: The Controller (Node.js + Frida)
*   **Role:** Logic & State Management.
*   **Mechanism:**
    1.  Attaches to `LenovoVantage-(LenovoGamingUserAddin).exe`.
    2.  Injects the specialized hook script.
    3.  Maintains the internal "Virtual State" (e.g., the current frame of an animation).
*   **Execution Flow:**
    1.  **`onEnter(0x209B0)`**: Intercept the call.
    2.  **Validation**: Check `dataPtr[0] == 0x07` and `dataPtr[1] == 0xA1` to ensure we are hijacking a lighting packet and not a control packet.
    3.  **Injection**: Iterate through the buffer (Offset 4 to 960). For every valid `KeyID`, overwrite the R, G, B bytes with the desired data from the Virtual State.
    4.  **Release**: Allow the function to proceed. The driver sends *our* data, unaware it was modified.

## 5. Data Flow Diagram

```
[ Lenovo Vantage ]    [ Node.js Controller ]
       |                        |
(Generates Frame)          (Calculates Effect)
       |                        |
       v                        v
[ Memory Buffer ] <---- [ Overwrite RGB ]
(Contains valid IDs)    (Preserve IDs, Change Colors)
       |
       v
[ Function 0x209B0 ]
       |
       v
[ Windows HID Driver ]
       |
       v
[ USB Hardware ]
```

## 6. Operational Constraints & Safety

1.  **Preserve Key IDs:** The script must **never** modify bytes 0-1 of a block (The Key ID). Modifying IDs can cause the firmware to desync or drop the packet. We only modify bytes 2-4 (RGB).
2.  **Preserve Header:** The 4-byte header must remain intact.
3.  **Performance:** The injection logic runs synchronously on the thread. Complex math (like physics simulations) should be pre-calculated in the Node.js process and passed to the Frida agent via `send/recv` or shared memory, rather than calculated inside the hook's tight loop, though simple math (HSV conversion) is negligible.

## 7. Future Optimization (Edge-JS / Native)
While the current Node.js/Frida stack is performant enough for 60fps effects, the architecture is decoupled.
*   The logic at `0x209B0` is universal.
*   If lower overhead is required later, the same logic can be ported to a C++ DLL injected via generic process injection, using MinHook to redirect `0x209B0` to a local function that reads from a Named Pipe or Shared Memory.