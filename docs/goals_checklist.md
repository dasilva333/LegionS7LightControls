Excellent idea. A granular checklist is the best tool to turn a design document into an actionable project plan. It transforms the abstract into a series of small, achievable wins.

Here is a fully expanded, more detailed version of your project checklist.

---

# Automation Project Checklist v2.0

## Phase 1: Foundation & Native Bridge

### **1.1 Project Scaffolding & Setup**
- [x] Main `automation/` directory created.
- [x] `automation/backend` workspace created.
- [x] `automation/backend/api/` subdirectory created for route handlers.
- [x] `automation/backend/db/` subdirectory created for database files and migrations.
- [x] `automation/backend/json_effects/` subdirectory created.
- [x] `automation/backend/test/` subdirectory created for headless tests.
- [x] `automation/frontend` workspace created.
- [x] `automation/edge_bridge` workspace created.
- [x] All "golden library" JSON files (e.g., `always_dark_red.json`, `aurora_sync.json`) copied into `automation/backend/json_effects/`.

### **1.2 Native Bridge (`EdgeProfileBridge` - C++)**
- [x] Create `EdgeProfileBridge` C++ DLL project.
- [x] Implement `EnsureInitialized()` helper (loads `Gaming.AdvancedLighting.dll`, calls `entry`, etc.).
- [x] Implement `GetActiveProfileId()` exported function using the "triplet" method (`0x11210` -> `hw+0x154`).
- [x] Implement `GetBrightness()` exported function using the "triplet" method (`0x14110` -> `hw+0x158`).
- [x] Implement `GetProfileJson()` exported function using the 3-step builder sequence (`0x14630` -> `0x12660` -> `0x54210`).
- [x] Implement `SetProfileIndex()` exported function (calls worker `0x13650`).
- [x] Implement `SetProfileDetailsJson()` exported function (calls writer `0x11380` after parsing).
- [x] Implement `ShutdownBridge()` exported function to clean up native threads/handles.
- [x] Compile final `EdgeProfileBridge.dll` (x64) with all exports.

### **1.3 Managed Bridge (`EdgeWrapper` - C#)**
- [x] Create `EdgeWrapper` C# Class Library project (.NET Framework 4.8).
- [x] Add `[DllImport]` P/Invoke signatures for all functions exported from `EdgeProfileBridge.dll`.
- [x] Create a public static class (e.g., `ProfileService`).
- [x] Implement `GetActiveProfileId()` static method that calls the native bridge.
- [x] Implement `GetProfileJson()` static method that calls the native bridge.
- [x] Implement `SetProfileIndex(int id)` static method that calls the native bridge.
- [x] Implement `SetProfileDetails(string json)` static method that calls the native bridge.
- [x] Implement `ShutdownBridge()` static method that calls the native bridge.
- [x] Compile final `EdgeWrapper.dll`.

## Phase 2: Backend Development

### **2.1 Backend Core & Database**
- [x] `cd automation/backend` and run `npm init`.
- [x] Install core dependencies: `npm install express knex sqlite3 ps-list edge-js`.
- [x] Set up `knexfile.js` to point to a `db/dev.sqlite3` file.
- [x] Create database migration for `global_settings` table.
- [x] Create database migration for `processes` table.
- [x] Create database migration for `notifications` table.
- [x] Create database migration for `time_gradients` table.
- [x] Create database migration for `animation_definitions` table.
- [x] Create database migration for `key_mappings` table.
- [x] Run `knex migrate:latest` to create the database.
- [x] Create seed files to populate `animation_definitions` and `key_mappings` with our reverse-engineered data.
- [x] Run `knex seed:run` to populate the reference tables.

### **2.2 Worker & Supervisor Implementation**
- [x] Create `automation/edge_bridge/worker.js`.
- [x] Implement logic in `worker.js` to read a command and payload from `process.argv`.
- [x] Implement `edge-js` calls in `worker.js` for each method in the C# `EdgeWrapper.dll`.
- [x] Implement `ShutdownBridge()` call in `worker.js`'s `finally` block to guarantee cleanup.
- [x] Create `backend/supervisor.js` (or similar).
- [x] Implement `spawnWorker(command, payload)` function that launches `worker.js` as a child process.
- [x] Implement stdout/stderr streaming from worker to supervisor.
- [x] Implement the 5-second timeout and forceful `process.kill()` logic in the supervisor.

-\r\n### **2.3 API Endpoint Implementation (pi/ folder)**
- [x] Implement server.js with the dynamic route loading logic.
- [x] Create and implement pi/system/getData.js for GET /static-data.
- [x] Create and implement pi/system/getSettings.js for GET /settings.
- [x] Create and implement pi/system/updateSettings.js for PUT /settings.
- [x] Create and implement pi/profiles/getActive.js for GET /active-profile.
- [x] Create and implement pi/profiles/getActiveId.js for GET /active-profile/id.
- [x] Create and implement pi/profiles/setActive.js for POST /set-active-profile/:id.
- [x] Create and implement pi/profiles/applyFromFile.js for POST /apply-profile/file/:filename.
- [x] Create and implement pi/profiles/applyRaw.js for POST /apply-profile/raw.
- [x] Implement full CRUD endpoints for /processes (get.js, create.js, update.js, delete.js).
- [x] Implement full CRUD endpoints for /time-gradients (get.js, create.js, update.js, delete.js).
- [x] Create and implement pi/events/notify.js for POST /notify.
### **2.4 Automation Layers**
- [ ] Implement the Time-of-Day Scheduler `setInterval` loop in `server.js`.
- [ ] Implement the Process Override Monitor `setInterval` loop in `server.js`.

### **2.5 Backend / Headless Test Harnesses**
- [x] Create reusable test scripts under `automation/backend/test/` that call `spawnWorker(...)` directly for each native helper (profile ID, brightness, JSON, set index/set details).
- [x] Add fixtures under `automation/edge_bridge/test_files/` for captured command/context blobs so tests can replay the exact dispatcher payloads.
- [x] Ensure `automation/backend/test` scripts can consume `json_effects/` samples and validate the generated `SetProfileDetails` JSON before dispatch.
- [x] Log every test invocation to `%LOCALAPPDATA%\ProfileBridge\test.log` and surface pass/fail via the supervisor wrapper.
- [x] Wire the backend test scripts into `automation/backend/supervisor.js` so they can be triggered via CLI (e.g., `node automation/backend/supervisor.js "{\"method\":\"GetActiveProfileId\"}"`).
## Phase 3: Frontend Development

### **3.1 Frontend Project Setup**
- [x] `cd automation/frontend` and run `ionic start` (tabs template, React/TS).
- [x] Run `npm install` inside the new Ionic project.
- [ ] Configure `ionic.config.json` or `vite.config.ts` to proxy API requests from `/api` to `http://localhost:3005/api`.

### **3.2 UI Implementation**
- [ ] Scaffold the four main tabs: Dashboard, Settings, Playground, Logs.
- [ ] **Dashboard Tab:**
    - [ ] Implement UI cards for Active Profile, Time-of-Day, and Process Override status.
    - [ ] Implement data fetching (`useEffect` hooks) to poll the relevant backend endpoints.
- [ ] **Settings Tab:**
    - [ ] Implement the "Global Settings" section with toggle switches.
    - [ ] Implement the full CRUD UI for the "Process Monitor" section.
    - [ ] Implement the full CRUD UI for the "Time Gradients" section.
- [ ] **Playground Tab:**
    - [ ] Integrate Monaco Editor (or a simple `textarea`) for JSON editing.
    - [ ] Implement the "Load Active Profile" button (`GET /active-profile`).
    - [ ] Implement the "Apply" button (`POST /apply-profile/raw`).
    - [ ] Implement the "Save to File..." button (client-side file download).
- [ ] **Logs Tab:**
    - [ ] Set up a WebSocket server (`socket.io`) on the Express backend.
    - [ ] Implement WebSocket client logic in the Logs tab.
    - [ ] Emit log events from the backend schedulers/endpoints and display them in the UI.

## Phase 4: Finalization

- [ ] Comprehensive testing of all API endpoints and UI interactions.
- [ ] Build the final static frontend (`npm run build` in `frontend/`).
- [ ] Configure the Express server in `server.js` to serve the static files from the `frontend/dist` (or `www`) folder.
- [ ] Finalize `README.md` with usage instructions.







