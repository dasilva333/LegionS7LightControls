# Frontend Implementation Checklist

**Objective:** Scaffolding the UI using **Mock Data (Fixtures)**. Do not connect to the backend yet.
**Architecture:** Modular Component-based design. `Settings.tsx` acts as the parent controller.

## 1. Fixture Creation (`src/fixtures/`)

Initialize the frontend state by transforming existing backend data into clean JSON files.

- [x] **`godModeState.json`**
    *   **Source:** Derived from `frida/actions/godMode.js` initial state.
    *   **Schema:**
        ```json
        {
          "active": false,
          "mode": "DEFAULT",
          "weather": "CLEAR",
          "timeOfDay": 0.5,
          "cpuTemp": 0,
          "downloadProgress": -1
        }
        ```

- [x] **`keyGroups.json`**
    *   **Source:** Copy directly from `automation\backend\seeds\key_groups.json`.
    *   **Action:** Duplicate the file into the frontend fixtures folder. No transformation needed.

- [x] **`timeGradients.json`**
    *   **Source:** `automation\backend\seeds\time_gradients.js`.
    *   **Action:** Extract the array inside `knex('time_gradients').insert([...])` and save as pure JSON.
    *   **Cleanup:** Ensure keys are camelCase if preferred for frontend (e.g., `start_time` -> `startTime`), or keep snake_case to match DB.

- [x] **`gamingModeProcesses.json`** (For Process Monitor / Aurora Passthrough)
    *   **Source:** `automation\backend\seeds\default_games.js`.
    *   **Action:** Extract the array. **Remove** the `profile_filename` property (deprecated).
    *   **Target Schema:** `Array<{ id: number, processName: string, enabled: boolean }>`

- [x] **`contextualShortcuts.json`** (For App-Specific Key Highlights)
    *   **Source:** New file (No existing seed).
    *   **Logic:** Based on *Settings Design Spec Section B.4*.
    *   **Target Schema:**
        ```json
        [
          {
            "processName": "photoshop.exe",
            "enabled": true,
            "keys": [
              { "keyId": 112, "color": "#FF0000" }, // V
              { "keyId": 135, "color": "#FF0000" }  // B
            ]
          }
        ]
        ```
        
## 2. Project Scaffolding
- [x] **Clean `App.tsx`**: Remove default Ionic template code. Setup `IonReactRouter` with `IonTabs`.
- [ ] **Create Page Containers (`src/pages/`)**:
    - [x] `Dashboard.tsx`
    - [x] `Settings.tsx`
    - [x] `Logs.tsx`
- [x] **Route Configuration**: Ensure tabs navigate correctly (`/dashboard`, `/settings`, `/logs`).
- [ ] **Create Directory Structure**:
    - [x] `src/components/shared/` (Generic UI elements)
    - [x] `src/components/settings/cards/` (Specific logic cards)

## 3. Shared Components (`src/components/shared/`)
Build these reusable UI elements.
- [x] **`LayerCard.tsx`**: Wrapper component.
    -   Props: `title`, `icon`, `toggleState` (boolean), `onToggle` (function), `disabled` (boolean).
    -   Visual: Renders children only if enabled (or dims them).
- [x] **`ColorPicker.tsx`**:
    -   Action: Opens a Modal/Popover with a color input.
    -   Output: Hex string.
- [x] **`KeyPicker.tsx`**:
    -   **Critical Component.**
    -   Data Source: Imports `keyGroups.json`.
    -   Visual: A multi-select component grouping keys by their group name.

## 4. Settings Architecture (`src/pages/Settings.tsx`)
The main settings page acts as the "Master Controller".
- [x] Initialize local state for `isGodModeEnabled` (default: true).
- [x] Implement the **Header Bar** with the "Master Toggle".
- [x] Pass the `isGodModeEnabled` state down to all child components (to disable them visually when God Mode is off).
- [x] Import and render the specific Card components defined in Section 5.

## 5. Settings Cards (`src/components/settings/cards/`)
Each item below should be a separate `.tsx` file.

### **A. Environment Layer**
- [x] **`BackgroundCard.tsx`**:
    -   Implement Segmented Button state (None / Time / Effect).
    -   Implement conditional rendering for the "Effect" controls (Speed slider, Dropdown).
    -   Implement "Time of Day" list view using fixtures.
- [x] **`WeatherCard.tsx`**:
    -   Implement the "Storm Override" checkbox.
    -   Implement the KeyPicker for specific weather keys.

### **B. Automation Layer**
- [x] **`ProcessMonitorCard.tsx`**:
    -   Render list of processes from `monitoredProcesses.json`.
    -   Add "Remove" buttons (UI only).
- [x] **`ShortcutsCard.tsx`**:
    -   Render accordion list from `shortcuts.json`.

### **C. Widgets Layer**
- [x] **`DayBarCard.tsx`**:
    -   Implement color pickers for Active/Inactive states.
- [x] **`TemperatureCard.tsx`**:
    -   Implement Inputs for Low/High Temps.
    -   Implement KeyPicker for target keys.

### **D. Interrupts Layer**
- [x] **`ProgressBarCard.tsx`**:
    -   Implement Start/End Key pickers.
    -   Implement REST/Socket toggles.
- [x] **`SafetyMonitorCard.tsx`**:
    -   Implement "Log in with Apple" placeholder button.
    -   Implement authenticated view (Item dropdown, Threshold input).

### **E. FX Layer**
- [x] **`TypingFxCard.tsx`**:
    -   Implement Effect Dropdown (Bounce/Flash/Rainbow).
    -   Logic: Hide Color Picker if "Rainbow" is selected.
- [x] **`AudioFxCard.tsx`**:
    -   Implement Mode and Source dropdowns.

## 6. User Verification (Manual)
*Since the implementation is headless, the user must perform these checks:*
- Run `ionic serve`.
- Click the "God Mode" master toggle and verify all cards fade out/disable.
- Click through the "Background" modes to ensure the sub-settings appear/disappear correctly.
- Open a KeyPicker and verify the keys are grouped correctly (Function Row, Numpad, etc).
