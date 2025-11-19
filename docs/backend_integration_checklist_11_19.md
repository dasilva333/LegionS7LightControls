# Integration Checklist: Frontend to Backend Migration

**Objective:** Replace fixtures with live API calls, backed by a persistent SQLite database.
**Strategy:** DB Migration -> Endpoint Logic -> Test Runner -> Frontend Wiring.

## 0. Database Protocol (Read First)
All state must be persisted. We will use `knex` for migrations.
**Workflow for new tables:**
1.  `npx knex migrate:make <name>`
2.  Edit the generated file in `automation\backend\migrations`.
3.  Run `npx knex migrate:latest`.
4.  **Constraint:** Read existing migration files first to ensure schema compatibility, using the fixtures we made for the frontend as the source of truth as to what the schema should look like.

## 1. Infrastructure & Core State

- [x] **Test Runner:** `test/api_runner.js` created.
- [x] **Frontend Config:** `src/config/api.ts` created.

### **The State Persistence Layer**
*We need to store the configuration for God Mode (Background Mode, Weather toggles, etc.) so it survives restarts.*

- [x] **Database Migration:**
    -   `npx knex migrate:make create_godmode_config_table`
    -   Schema: `key` (string, primary), `value` (json).
    -   Migrate.
- [x] **Backend Logic (`api/godmode/state.js`):**
    -   Update `GET` to read from DB.
    -   Update `POST` to write to DB **AND** call `sendCommand('updateState', ...)` to sync Frida immediately.
- [x] **Validation:** `node test/api_runner.js http://localhost:3005/api/godmode/state`.

### **The Director Daemon**
*We need a persistent process that ensures Frida is always in sync with the DB state on startup.*

- [x] **Update `daemons/godModeDirector.js`:**
    -   On boot: Read DB config -> Call `sendCommand('enable')` -> Call `sendCommand('updateState', config)`.
    -   This replaces the random "Demo" logic with "Restoration" logic.

### **Test Runner Upgrade: Parallel Execution**
*Current Issue: `api_runner.js` fails if `server.js` is already running on port 3005.*

- [x] **Update `server.js`:**
    -   Change the port definition logic to: `const port = process.env.PORT || process.argv[2] || 3005;`
    -   Ensure it logs the *actual* port used on startup.
- [x] **Update `test/api_runner.js`:**
    -   **Logic Change:** Do *not* assume port 3005.
    -   **Implementation:**
        1.  Generate a random port between 4000 and 5000 (or use a fixed test port like 3006).
        2.  Spawn the child process passing this port: `node server.js <TEST_PORT>`.
        3.  Update the `fetch` URL to use `localhost:<TEST_PORT>`.
- [x] **Verification:**
    -   Start your main server manually (`node server.js`).
    -   Run `node test/api_runner.js http://localhost:3006/godmode/state`.
    -   Confirm both processes coexist without error.
    -  
## 2. Section A: Environment Layer

### **Background Controller**
*Goal: Persist background mode (None/Time/Effect) and gradients.*

- [x] **Backend (Background Config):**
    -   Ensure `POST /api/godmode/state` handles `{ backgroundMode: 'TIME', effectSettings: {...} }`.
    -   Verify `time-gradients` endpoints read/write to DB.
- [x] **Validation:** `node test/api_runner.js http://localhost:3005/api/godmode/state`.
- [x] **Frontend (`BackgroundCard.tsx`):**
    -   [x] **Cleanup:** Remove `godModeState.json` import.
    -   [x] **Logic:** Use `apiClient.get('/api/godmode/state')` to set initial UI state.
    -   [x] **Action:** Wire Mode Selector to `apiClient.post('/api/godmode/state')`.
    -   [x] **Action:** Wire Gradient List to `apiClient.get('/time-gradients')`.
    -   [x] **QC:** Run `npx tsc --noEmit --skipLibCheck`.

### **Weather Control**
*Goal: Persist storm overrides and specific key overrides.*

- [x] **Backend (Weather Config):**
    -   Ensure `POST /api/godmode/state` handles `{ stormOverride: true, weatherKeys: [...] }`.
- [x] **Frontend (`WeatherCard.tsx`):**
    -   [x] **Cleanup:** Remove fixture data.
    -   [x] **Logic:** Bind Toggle/Checkbox to API state.
    -   [x] **Action:** Bind KeyPicker `onChange` to send updated key list to API.
    -   [x] **QC:** Run `npx tsc --noEmit --skipLibCheck`.

## 3. Section B: Automation Layer (Shortcuts)

- [x] **Database:**
    - [x] `npx knex migrate:make create_shortcuts_table`
    - [x] Schema: `id` (inc), `process_name` (string), `keys_json` (json/text), `is_active` (bool).
    - [x] Migrate.
- [x] **Backend:** Create `api/shortcuts/` endpoints (CRUD).
- [x] **Validation:** Run `node test/api_runner.js http://localhost:3005/api/shortcuts`.
- [x] **Frontend (ProcessMonitorCard):** Wire to `GET/POST /processes`.
- [x] **Frontend (ShortcutsCard):** Wire to `GET/POST /shortcuts`.

## 4. Section C & D & E: Universal Widget Config

*Instead of creating tables for DayBar, Temp, Progress, etc., we create one K/V store.*

- [x] **Database:**
    - [x] `npx knex migrate:make create_widget_configs_table`
    - [x] Schema: `widget_id` (string, primary unique, e.g., 'day_bar', 'temperature'), `config` (json/text).
    - [x] Migrate.
- [x] **Backend:** Create `api/widgets/config.js`.
    -   `GET /api/widgets/:id` -> Returns config JSON.
    -   `POST /api/widgets/:id` -> Upserts config JSON.
- [x] **Validation:**
    -   Run `node test/api_runner.js http://localhost:3005/api/widgets/day_bar`.
- [x] **Frontend Wiring:**
    -   [x] **DayBarCard:** Load/Save to `widgets/day_bar`.
    -   [x] **TemperatureCard:** Load/Save to `widgets/temperature`.
    -   [x] **ProgressBarCard:** Load/Save to `widgets/progress_bar`.
    -   [x] **SafetyMonitorCard:** Load/Save to `widgets/safety`.
    -   [x] **FX Cards:** Load/Save to `widgets/fx_typing` and `widgets/fx_audio`.

## 5. Polish & Deferral
*Objective: Hide features that lack backend daemon support to prevent user confusion.*

- [x] **Frontend (`Settings.tsx`):**
    -   Disable/Hide **SafetyMonitorCard** (Requires external iCloud script).
    -   Disable/Hide **AudioFxCard** (Requires Windows Audio Hook daemon).
    -   *Method:* Either comment out the components or pass a `disabled={true}` prop if the `LayerCard` supports it.

## 6. Settings Page Wiring (`Settings.tsx`)
*Objective: Connect the master toggle and zip code input to the live API state.*

- [x] **Initialization:**
    -   Import `apiClient`.
    -   On mount (`useEffect`), fetch `GET /api/godmode/state`.
    -   Set `isGodModeEnabled` from `state.active`.
    -   Set `zipCode` from `state.weatherSettings.zipCode`.
- [x] **Master Toggle Logic:**
    -   Remove local-only state toggle.
    -   On change, call `apiClient.post('/api/godmode', { command: checked ? 'enable' : 'disable' })`.
    -   Refresh state after call.
- [x] **Zip Code Logic:**
    -   On change (debounced), call `apiClient.post('/api/godmode/state', { weatherSettings: { zipCode: value } })`.
- [x] **Polling:**
    -   Set up a 5-second polling interval to refresh `isGodModeEnabled`.
-   

You are right. We built the *endpoints* and the *child components*, but we forgot to wire the **Master Switch** and the **Zip Code Input** in `Settings.tsx` to the backend. It's still just toggling a React `useState` variable that goes nowhere.

Here is **Section 6: The Final Wiring** to append to your checklist. This instructs the developer to hook up `Settings.tsx` to the live API.

--- START OF FILE checklist_addendum_settings.md ---

## 6. Settings Page Wiring (`Settings.tsx`)
*Objective: Connect the Master Toggle and Zip Code input to the live API.*

- [ ] **Initialization:**
    -   Import `useApi` hook (or `apiClient`).
    -   On mount (`useEffect`), fetch `GET /api/godmode/state`.
    -   Set `isGodModeEnabled` from `state.active`.
    -   Set `zipCode` from `state.weatherSettings.zipCode`.
- [ ] **Master Toggle Logic:**
    -   Remove local-only state toggle.
    -   On change, call `apiClient.post('/api/godmode', { command: checked ? 'enable' : 'disable' })`.
    -   Refresh state after call.
- [ ] **Zip Code Logic:**
    -   On change (debounced), call `apiClient.post('/api/godmode/state', { payload: { weatherSettings: { zipCode: value } } })`.
- [ ] **Polling:**
    -   Set up a 5-second polling interval to refresh `isGodModeEnabled` (in case the backend changes state due to gaming mode).

--- END OF FILE ---
