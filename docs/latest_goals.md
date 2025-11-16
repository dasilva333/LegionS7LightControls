# High-Level Goals – Lighting Automation Draft

## Priority Layers
1. **Time-of-Day Baseline (lowest priority)**
   - Periodically (e.g., every 15 minutes) set the keyboard to a profile representing ambient colors for that time.
   - Runs only when no higher-priority overrides are active.
2. **Notification Overrides**
   - Triggered by external events (email, IM, unclassified alerts).
   - Each notification type maps to a color/profile (e.g., white flash for unclassified, red for critical).
   - Overrides the time-of-day effect for a short duration (fade in/out, fast speed), then restores the baseline.
3. **Aurora Sync Process List (highest priority)**
   - Maintain a list of executables (e.g., Destiny2.exe).
   - While any listed process is running, force the keyboard into Aurora Sync mode regardless of other effects.

## Proposed Architecture
### Core Service (C#)
Runs as a background process hosting:
- **HTTP Control Server (local only)**
  - `/status` – Returns current profile, active overrides, recent events.
  - `/set-effect` – Accepts `{ "profile": "usa_scheme" }` or `{ "payload": { ... } }`, invokes the SwitchProfilesByFilename pipeline.
  - `/notify` – Accepts `{ "type": "email" }` and triggers the notification override logic.
  - `/process-update` – Accepts `{ "running": ["Destiny2.exe"] }`, refreshes the process list state (alternatively polled directly by C#).
- Scheduler for the time-of-day effect (stores next run and desired profile).
- Override manager that tracks active/highest priority effect and re-applies baseline when overrides expire.

### Effect Application Flow
1. Resolve which profile/payload should be active (aurora > notification > time-of-day).
2. Use the existing SwitchProfilesByFilename bridge to build and dispatch the Lenovo payload in-process (no external CLI).
3. Log every change with timestamps and source (time-of-day, notification, process).

### Extensibility Hooks
- Configuration file (`configs/aurora_processes.json`, `configs/time_effect_schedule.json`) describing process list, notification colors, schedules.
- Optional Node.js companion that watches system events and calls the C# HTTP endpoints; keeps the bridge logic centralized in the service.

## Next Steps
1. Embed the SwitchProfilesByFilename logic into a long-running service (shared DLL + scheduler).
2. Define the process monitor (either in C# via WMI or in Node.js calling `/process-update`).
3. Build the `/notify` endpoint and a simple CLI to trigger test notifications.
4. Add documentation for new payload templates (notification colors, aurora sync) under `docs/effects`.

This structure keeps the bridge code in C#, exposes simple local APIs for automation, and lets us layer higher-level behaviors (process detection, notifications, time-of-day schedules) without reimplementing the Lenovo payload mechanics.
