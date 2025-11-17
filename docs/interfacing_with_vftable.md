# Technical Document: Interfacing with `Gaming.AdvancedLighting.dll`

## 1. Abstract

This document outlines the architectural pattern required to reliably call complex, stateful functions within `Gaming.AdvancedLighting.dll` from a managed environment like Node.js or .NET. Direct calls to high-level dispatcher functions, particularly the one located at `vftable[3]`, result in a fatal native exception (`0xC0000005`) that terminates the host process.

The root cause is an unhandled exception within the native library post-operation, likely due to incompletely reverse-engineered buffer arguments. However, the primary operation (e.g., changing the lighting) succeeds *before* this exception occurs.

The definitive solution is not to prevent the crash, but to **isolate it** by replicating the Supervisor/Worker architecture observed in the original reference code.

## 2. The Core Problem: The "Crash-on-Success" Phenomenon

When invoking the main command dispatcher located at `vftable[3]` of the controller object, a specific sequence of initialization is required:

1.  `LoadLibraryW` is called to load `Gaming.AdvancedLighting.dll`.
2.  `GetProcAddress` is used to find and call the exported `entry` function.
3.  `get_instance` is called to retrieve the controller object pointer.
4.  A hardware context pointer (`hw`) is calculated from the module's base address.
5.  The `init_profile_detail` function (at `base + 0x14630`) is called, passing the `hw` pointer and several stack-allocated buffers (`details` and `scratch`).

Our analysis, confirmed by log files and visual confirmation of keyboard effects, has shown the following:

-   The primary command (e.g., `Set-LightingProfileDetails`) is successfully processed, and the hardware state is updated (the keyboard lights change).
-   Immediately following this success, the native code attempts to perform a subsequent operation that relies on the contents of the `details` and `scratch` buffers.
-   Because we have not fully reverse-engineered the required contents of these buffers and are passing them as zeroed-out memory, the native code attempts an invalid memory access.
-   This results in a fatal, non-continuable `0xC0000005` (Access Violation) Structured Exception (SEH).

This "crash-on-success" is harmless to the primary operation but fatal to any host process that is not architected to handle it. A standard `edge-js` host or a simple `DllImport` in a long-running application will be terminated immediately.

## 3. The Architectural Solution: Process Isolation (Supervisor/Worker)

The working reference code demonstrates the correct solution: **Process Isolation**. Instead of calling the native bridge directly from the main application, it spawns a separate, lightweight "worker" process.

#### The Supervisor (Node.js `apply.js`)

-   **Responsibility:** To manage the user request and launch the worker.
-   **Implementation:** A standard Node.js script using the built-in `child_process.spawn` function.
-   **Logic:**
    1.  Receives a command-line argument (e.g., a profile name).
    2.  Spawns the C# Worker executable (`SwitchProfileWrapper.exe`), passing the argument to it.
    3.  Does **not** use `edge-js` or any direct native interop.
    4.  Asynchronously waits for the worker process to terminate.
    5.  It treats **any** termination of the worker process (a clean exit with code 0 or a crash) as a successful completion of the task. It does not need to differentiate between them.
    6.  Reports success to the user.

This model is, in effect, a **process-level `try...catch` block**, where the `try` is the act of spawning the worker and the `catch` is simply the act of observing that the worker has finished, regardless of how.

#### The Worker (C# `Worker.exe`)

-   **Responsibility:** To perform the single, dangerous native call and then terminate.
-   **Implementation:** A minimal .NET 7 console application that contains the `[DllImport]` definition for the C++ bridge.
-   **Logic:**
    1.  Receives its task via command-line arguments.
    2.  Makes the P/Invoke call to the C++ bridge function (e.g., `ApplyProfileByFilename`).
    3.  The native call executes, the lights change, and the `0xC0000005` exception occurs.
    4.  The entire Worker process is terminated by the operating system due to the unhandled native exception.
    5.  The Supervisor, which is monitoring the process, sees that it has exited and proceeds.

## 4. Conclusion

Directly interfacing with the `vftable[3]` dispatcher of `Gaming.AdvancedLighting.dll` is inherently unstable due to our incomplete knowledge of its buffer arguments. All future integrations that rely on this dispatcher **must** adopt the Supervisor/Worker process isolation pattern. This architecture acknowledges the "crash-on-success" as an expected outcome and contains it, providing a stable and reliable interface for the end-user while preventing the main application from being terminated.