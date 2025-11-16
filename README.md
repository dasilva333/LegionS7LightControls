# Keyboard Lighting Automation

This workspace hosts the **automation backend** that controls Lenovo Legion lighting via the native `Gaming.AdvancedLighting.dll`. It glues together:

* `automation/edge_bridge` – Native C++ bridge + C# wrapper that call the dispatcher, read/write profiles, and expose `EdgeWrapper.dll` for `edge-js`.
* `automation/backend` – Node.js/Express service that routes JSON API calls through `supervisor.js` → `worker.js` to the managed bridge, plus database-backed scheduling/notifications.
* `automation/frontend` – Ionic React (tabs + TypeScript) shell for the future UI (initialized, not yet wired).
* `automation/backend/test` – Headless harness that exercises every native helper and logs to `%LOCALAPPDATA%\ProfileBridge\test.log`.
* Fixtures under `automation/edge_bridge/test_files` that replay captured dispatcher payloads and contexts.

Goals:

1. Keep the native surface tiny (`GetActiveProfileId`, `GetProfileJson`, `SetProfileIndex`, `SetProfileDetails`, `ShutdownBridge`) and call it via `edge-js`.
2. Expose a clean HTTP API for everything in `docs/goals_backend.md` (system data, profile controls, process/time-gradient CRUD, notifications).
3. Provide reproducible tests/backdoors (`automation/backend/test/run-tests.js`, supervisor CLI) so the low-level layer can be verified without spinning up the full UI.

Refer to `docs/goals_checklist.md` to track remaining milestones.
