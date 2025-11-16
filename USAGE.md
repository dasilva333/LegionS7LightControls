# Automation Workspace Usage

## Backend

### Run the HTTP server
```powershell
npm --prefix automation/backend start
```
`automation/backend/server.js` will load `api/` modules dynamically and listen on `localhost:3005`.

### Trigger native helper tests
```powershell
node automation/backend/test/run-tests.js
```
This exercise the native helpers via the supervisor/worker stack, validates `json_effects/`, and appends structured logs to `%LOCALAPPDATA%\ProfileBridge\test.log`.

### Spawn a single worker manually
```powershell
node automation/backend/worker.js @"automation/backend/action.json"
```
The JSON file should include `{ "method": "...", "payload": ... }`. The worker prints structured JSON lines that the supervisor can consume.

### Supervisor helper
```powershell
node automation/backend/supervisor.js "{\"method\":\"GetActiveProfileId\"}"
```
Use `"RunTests"` to launch `run-tests.js` through the supervisor (`node ... "{\"method\":\"RunTests\"}"`).

## Native Bridge

1. Build `EdgeProfileBridge.dll` via `automation/edge_bridge/EdgeProfileBridge/build.bat` (MSVC `vcvars64`, linking `Ole32.lib`).  
2. Build `EdgeWrapper.dll` via `& "C:\Program Files\dotnet\dotnet.exe" build automation/edge_bridge/EdgeWrapper/EdgeWrapper.csproj`.
3. Place resulting DLLs next to the `worker.js`/`supervisor.js` processes (already wired to copy the managed DLL alongside the native one).

## Future Frontend

* `automation/frontend` holds an Ionic React + TypeScript tabs app initialized via `npx ionic start`. Run `npm --prefix automation/frontend run lint` / `ionic serve` once the UI is wired to the backend.
