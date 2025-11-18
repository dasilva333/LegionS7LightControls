### `architecture_journey_recap.md`

# Architectural Recap: The Journey to a Stable Lighting Controller

## 1. Executive Summary

This document captures the evolution and final architecture for interfacing with the proprietary `Gaming.AdvancedLighting.dll`. After extensive experimentation with multiple approaches, a definitive, robust pattern was established. The core discovery is that the native DLL is extremely fragile and sensitive to its host environment, particularly for write operations.

The final, successful architecture is a **hybrid model**:

1.  **For fast, stable, read-only operations** (e.g., `getBrightness`, `getActiveProfileId`), a **persistent Frida agent** attached to the live `LenovoVantage` service is used. This provides low-latency access to hardware state.
2.  **For unstable, write operations** (i.e., `Set-LightingProfileDetails`), a **disposable C# worker process** (`SwitchProfileTest.exe`) is spawned for each command. This process perfectly replicates a known-good reference implementation and isolates the "crash-on-success" behavior, ensuring the main server remains stable.

This document details the pivots and key discoveries that led to this design.

## 2. The Core Challenge: The "Crash-on-Success" Phenomenon

The central difficulty in this project was the behavior of the `vftable[3]` dispatcher function, used for `Set-LightingProfileDetails`. Our analysis revealed:

-   **The Operation Succeeds:** When called, the dispatcher successfully updates the keyboard's lighting effect.
-   **The Crash is Inevitable:** Immediately after success, the native code attempts a cleanup or finalization step that results in a fatal `0xC0000005` (Access Violation) exception.
-   **Root Cause:** This crash is believed to be caused by our inability to provide correctly populated `details` and `scratch` buffers to the `init_profile_detail` preamble function. The native code reads from these buffers post-operation and crashes when it finds invalid data.

This "crash-on-success" meant that any long-running process that called this function directly would be terminated.

## 3. The Journey: A History of Architectural Pivots

Our path to a solution involved several distinct architectural attempts. Understanding why each one failed is critical.

#### Attempt 1: The C++ Bridge (`EdgeProfileBridge.dll`) + `edge-js`

-   **Concept:** Create a C++ bridge that is a direct, logical copy of a known-good reference, and call it from Node.js via `edge-js`.
-   **Failure Point:** `GetProcAddress for 'entry' failed`.
-   **Root Cause:** The host environment of `node.exe` is fundamentally different from a clean `dotnet.exe` process. It's believed that C++ Runtime (CRT) conflicts or other loaded modules within Node interfered with the `Gaming.AdvancedLighting.dll`'s `DllMain` initialization, leaving it in a "zombie" state where it was loaded in memory but its exported functions were not accessible. Static linking (`/MT`) and other attempts could not resolve this fundamental environmental conflict.

#### Attempt 2: The Persistent Frida Agent (In-Process Writes)

-   **Concept:** Use Frida to attach to the live `LenovoVantage` service. All operations, including writes, would be performed by an agent injected into this live process, bypassing `LoadLibrary` issues.
-   **Failure Point:** `Session detached. Reason: process-terminated.`
-   **Root Cause:** This model directly violated the "Crash-on-Success" principle. When our agent called the dispatcher, the resulting `0xC0000005` exception was not contained. It fatally crashed the **entire `LenovoVantage` service process**, which was the very process our agent was attached to. This was not a recoverable error and required a full service restart.

#### Attempt 3: The "Notepad Strategy" (Frida Spawn)

-   **Concept:** A hybrid Frida model. Use the persistent agent for stable reads, but for writes, use `frida.spawn()` to launch a disposable process (e.g., `notepad.exe`), inject a specialized agent to perform the `LoadLibrary` -> `dispatch` sequence, and let it crash.
-   **Failure Point:** `unable to find export 'entry'`.
-   **Root Cause:** This re-exposed the core problem from Attempt 1. The clean-room environment of a spawned `notepad.exe` was still not the correct environment for the Lenovo DLL to initialize properly, and Frida's strict `getExportByName` could not find the necessary `entry` function.

## 4. The Final, Working Architecture

The successful architecture accepts the lessons learned from all previous failures.

-   **It abandons the C++ bridge** for the automation project due to the unsolvable host environment conflicts.
-   **It abandons in-process Frida writes** due to the "Crash-on-Success" terminating the host.
-   **It recognizes that only a .NET host process (`dotnet.exe`) has been proven to reliably initialize the native DLL.**

The final implementation is therefore a hybrid:

-   **Node.js Express Server (`server.js`):** The main application hub.
-   **Frida IPC Proxy (`frida/proxy.js` & `frida/loader.js`):** Manages a **persistent** Frida connection to the live `LenovoVantage` service, but **only** for stable, read-only operations.
-   **C# Executor (`helpers/profileExecutor.js`):** For all write operations, this helper uses `child_process.spawn` to run the known-good, pre-compiled `SwitchProfileTest.exe`. This executable provides the perfect, isolated .NET host environment to absorb the "crash-on-success" without affecting the main server.

This design is the culmination of our entire effort. It is robust, stable, and uses the right tool for each specific job, respecting the fundamental limitations and behaviors of the native library. Any future work should build upon this stable foundation.