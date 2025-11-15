# Unofficial Lenovo Advanced Lighting Controller

This repository contains a complete reverse-engineering of Lenovo's `Gaming.AdvancedLighting.dll` and provides a working C++ bridge and C#/.NET proof-of-concept for direct, programmatic control of keyboard RGB lighting on supported Lenovo Legion devices.

Starting now, project folders are grouped by feature:

* `ProfileReaderProject/` – contains `ProfileReader` and the legacy `FinalHarness_cli`.
* `ProfileBridgeProject/` – contains `ProfileBridge` and the reusable `GetProfileTest` harness.
* `SwitchProfilesByFilename/` – new harness/bridge pairing that replays any JSON effect from `json_effects/<name>.json`.
* `BrightnessController/`, `SetProfileDetailsController/`, `SetProfileProject/`, and `FinalHarness/` remain as their own feature folders.

## Project Status: **Milestone 3 Complete**

The reverse-engineering phase is complete, and we have successfully achieved read *and* write access. We have:
*   Identified the correct DLL (`Gaming.AdvancedLighting.dll`) and its internal architecture.
*   Bypassed the complex `RequestDispatcher` by discovering the **direct "triplet" method** for calling internal worker functions.
*   **Successfully read live data** (Brightness, Active Profile ID) directly from the hardware controller's memory.
*   **Successfully written data** by changing the active lighting profile index (`SetProfileIndex`), by replaying captured `Set-LightingProfileDetails` JSON (via `SwitchProfilesByFilename`), and by feeding the bridge a full dispatcher timeline (via `SetProfileDetailsController`).
*   Captured and documented the **full JSON schema** for lighting profiles.
*   Built stable C++ bridges and C# test harnesses that demonstrate both read and write capabilities.

## Key Discoveries

*   **Core Architecture:** The system uses a global "hardware object" (at RVA `0x7E840`) as a state cache. Internal worker functions are called directly with a pointer to this object.
*   **JSON Schema:** Lighting effects are defined by a rich JSON structure containing `profileId`, an array of `layers`, and `animationConfig` objects. We have a complete library of examples for all built-in effects.
*   **Animation IDs:** We have a "cheat sheet" mapping all numeric `animationId`s to their UI effect names.
*   **Key Index Map:** We have a functional map of the proprietary `keys` array indexes to physical keys.

## What's Included

*   **`docs/`**: A comprehensive folder of markdown files documenting our entire reverse-engineering journey.
*   **`GetProfileTest/` & `ProfileReader/`**: A C# project and C++ bridge for reliably **reading** the full JSON profile from the keyboard.
*   **`SetProfileTest/` & `SetProfileBridge/`**: A C# project and C++ bridge for reliably **setting the active profile index**.
*   **`SetProfileDetailsController/`**: Our current project for implementing full profile **writing**, now capable of replaying the full dispatcher timeline captured via Frida (multiple timestamps + context blobs).

## Next Steps & Roadmap

The project is now in the application development phase.

1.  **Master Read-Only Operations (Complete)**
2.  **Master Profile Switching (Complete)**
3.  **Master Profile Writing (In Progress)**
4.  Investigate Software vs. Firmware Control Modes
5.  Investigate Screen Sync ("Ambilight")
6.  Port final logic to a user-friendly application (e.g., Node.js).

## Build & Execution Notes

To rebuild the latest `SetDetailsBridge` and rerun the worker harness from PowerShell, consult `docs/build_and_run_details.md`. That document now contains the full `vcvars64.bat`/`cl` compile sequence, the copy step for the DLL, and the updated `C:\Program Files\dotnet\dotnet.exe run -- <ts-init> <ts-open> <ts-detail> <ts-close>` invocation that replays a captured dispatcher sequence. It also references `hook_lighting.js`, your live Frida hook, so you can correlate the captured command/payload/context blobs with the exact build/run workflow.

## License

Released under the MIT License. See `LICENSE` for details.

---

### Disclaimer
All information and tools in this repository are provided *as is* for educational and interoperability purposes only. Use at your own risk. The author is not affiliated with Lenovo and is not responsible for any damage to hardware or software resulting from the use of this project.
