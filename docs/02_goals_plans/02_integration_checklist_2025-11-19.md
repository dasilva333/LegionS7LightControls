# Integration Checklist: Frontend to Backend Migration

**Objective:** Replace all frontend fixtures with live API calls to the Node.js backend (`localhost:3005`).
**Strategy:** Phased migration per functional layer (Backend Endpoint -> Verification -> Frontend Wiring).

## 1. Infrastructure & Setup

- [ ] **Frontend Configuration:**
    - [ ] Create `src/config/api.ts`.
    - [ ] Define `API_BASE_URL = 'http://localhost:3005'`.
    - [ ] Create a reusable `apiClient` (wrapper around `fetch` or `axios`) to handle GET/POST/PUT/DELETE.
- [ ] **Backend Health Check:**
    - [ ] Verify `GET /health` returns `200 OK`.

## 2. Section A: Environment Layer (Background & Weather)

- [ ] **Backend: God Mode State (`godmode/state.js`)**
    - [ ] Ensure `POST /api/godmode/state` accepts partial updates for `weather`, `stormOverride`, and `backgroundMode`.
    - [ ] Create `GET /api/godmode/state` to return the current full state object (for initial frontend load).
- [ ] **Backend: Time Gradients**
    - [ ] Verify existing `time-gradients/` endpoints (`get.js`, `create.js`, `update.js`, `delete.js`) match the frontend schema.
- [ ] **Frontend: BackgroundCard.tsx**
    - [ ] Replace `godModeState.json` import with `useApi` hook fetching `GET /api/godmode/state`.
    - [ ] Wire Mode Selector to `POST /api/godmode/state`.
    - [ ] Wire Gradient List to `GET /time-gradients`.
- [ ] **Frontend: WeatherCard.tsx**
    - [ ] Wire Toggle/Override switches to `POST /api/godmode/state`.

## 3. Section B: Automation Layer (Processes & Shortcuts)

- [ ] **Backend: Process Monitor**
    - [ ] Verify `processes/` endpoints (`get.js`, `create.js`, `delete.js`).
    - [ ] Ensure the schema matches `gamingModeProcesses.json` (id, processName, enabled).
- [ ] **Backend: Contextual Shortcuts**
    - [ ] **New Endpoint:** Create `api/shortcuts/` (`get.js`, `create.js`, `update.js`, `delete.js`).
    - [ ] Implement in-memory storage or SQLite/JSON DB for shortcuts logic.
- [ ] **Frontend: ProcessMonitorCard.tsx**
    - [ ] Replace fixture with `GET /processes`.
    - [ ] Wire "Add Process" to `POST /processes`.
- [ ] **Frontend: ShortcutsCard.tsx**
    - [ ] Replace fixture with `GET /shortcuts`.
    - [ ] Wire CRUD actions.

## 4. Section C: Widgets Layer (Day Bar & Temp)

- [ ] **Backend: Widget Config**
    - [ ] **New Endpoint:** Create `api/widgets/config.js` (GET/POST).
    - [ ] Store configuration for:
        *   Day Bar (activeColor, inactiveColor).
        *   Temperature (lowTemp, highTemp, keys).
- [ ] **Frontend: DayBarCard.tsx**
    - [ ] Load/Save config via `api/widgets/config`.
- [ ] **Frontend: TemperatureCard.tsx**
    - [ ] Load/Save config via `api/widgets/config`.

## 5. Section D: Interrupts Layer (Progress & Safety)

- [ ] **Backend: Interrupt Config**
    - [ ] Extend `api/widgets/config.js` (or create `api/interrupts/config.js`) to store:
        *   Progress Bar (startKey, endKey, colors, enabledREST, enabledSocket).
        *   Safety Monitor (auth state stub, item list stub).
- [ ] **Frontend: ProgressBarCard.tsx**
    - [ ] Wire config persistence.
- [ ] **Frontend: SafetyMonitorCard.tsx**
    - [ ] Wire config persistence.

## 6. Section E: FX Layer (Typing & Audio)

- [ ] **Backend: FX Config**
    - [ ] Store FX settings (Typing Effect Type, Color, Audio Mode).
- [ ] **Frontend: TypingFxCard.tsx**
    - [ ] Wire config persistence.
- [ ] **Frontend: AudioFxCard.tsx**
    - [ ] Wire config persistence.

## 7. Validation & Testing Strategy

For each backend change, perform a **"Hot Swap" Test**:
1.  **Run Server:** Start `node server.js`.
2.  **Run Curl:** Execute a curl command to the new endpoint (e.g., `curl http://localhost:3005/api/shortcuts`).
3.  **Verify:** Ensure it returns JSON matching the frontend interface.
4.  **Kill:** Stop server.