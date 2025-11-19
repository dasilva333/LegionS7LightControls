# Frontend Design Specification: The Dashboard

**Version:** 1.0
**Date:** November 19, 2025
**Scope:** Tab 1 (Home Screen)
**Goal:** Provide a real-time "Heartbeat" of the God Mode Engine.

## 1. Overview
The Dashboard is the landing page. It answers three questions immediately:
1.  Is God Mode running?
2.  What is controlling the lights right now?
3.  Does the system look healthy?

## 2. UI Components

### **A. System Status Card (Hero)**
A large, high-contrast card at the top.

*   **Visuals:**
    *   **Background:** Dynamic gradient based on the current "Time of Day" (if active) or a status color.
    *   **Icon:** Large Pulsing Dot (Green = Active, Yellow = Passthrough, Gray = Disabled).
*   **Data Points:**
    *   **Status:** Large Text ("ACTIVE", "GAMING MODE", "OFFLINE").
    *   **Uptime:** "Session: 4h 20m".
    *   **FPS:** "Engine: 60 FPS" (Mocked or Real telemetry).

### **B. The Layer Stack (Visualization)**
A visual breakdown of the **Compositor**, showing which layers are currently contributing to the output. This helps debug why a key is a certain color.

*   **Layout:** A vertical stack of bars (like a layer list in Photoshop).
*   **States:**
    *   **Dimmed:** Layer is inactive/disabled.
    *   **Bright/Highlighted:** Layer is active and rendering.
*   **Items:**
    1.  **Layer 5 (FX):** "Typing Ripple" (Flashes when typing detected).
    2.  **Layer 4 (Interrupts):** "Download Bar" (Shows % if active).
    3.  **Layer 3 (Widgets):** "CPU Temp" | "Day Bar".
    4.  **Layer 2 (Context):** "Photoshop Shortcuts".
    5.  **Layer 1 (Environment):** "Rain" or "Time Gradient".

### **C. The Visualizer (Virtual Keyboard)**
A CSS-based representation of the physical device.

*   **Geometry:** Uses `keyGroups.json` to render keys in their approximate relative positions.
*   **Rendering:**
    *   Does **not** stream 60FPS raw video (too heavy for HTTP).
    *   Instead, it reflects the **State**.
    *   *Example:* If `cpuTemp` is 80, the arrow keys in the UI turn Red. If Time is Night, the background keys turn Blue.
*   **Interactivity:** Hovering over a key shows its ID and current assigned function (e.g., "Key: F1 | Source: Day Bar").

### **D. Quick Actions (Footer)**
Large, accessible buttons for common tasks.

*   **[ Restart Engine ]**: Sends a signal to kill/respawn the Frida process.
*   **[ Force Clear ]**: Sends a "Blackout" command to wipe the buffer.
*   **[ Test Pattern ]**: Cycles R/G/B/White to test LED health.

# Dashboard Implementation Checklist

**Objective:** Build the Home Tab to visualize system state.
**Prerequisites:** `keyGroups.json` fixture is present.

## 1. Backend Telemetry Support
*We need an endpoint that aggregates "Runtime Status" (Active layers, FPS, Uptime) distinct from "Configuration".*

- [ ] **Backend (`api/godmode/status.js`):**
    -   Create `GET /api/godmode/status`.
    -   Return:
        ```json
        {
          "engineRunning": true,
          "uptimeSeconds": 120,
          "activeLayers": ["BACKGROUND", "WIDGET_TEMP"],
          "telemetry": { "fps": 60, "lastFrameTimeMs": 16 }
        }
        ```
    -   *Note:* You may need to update `godModeDirector.js` to store/expose this data.
- [ ] **Validation:** `node test/api_runner.js http://localhost:3005/api/godmode/status`.

## 2. Frontend Components (`src/components/dashboard/`)

- [ ] **`StatusHero.tsx`:**
    -   Props: `status` object.
    -   Visual: Dynamic background color container, status badge.
- [ ] **`LayerStack.tsx`:**
    -   Props: `activeLayers` array.
    -   Visual: List of items that light up if included in the array.
- [ ] **`VirtualKeyboard.tsx`:**
    -   **Logic:** Import `keyGroups.json`. Map over groups -> keys.
    -   **Render:** Flexbox/Grid layout representing the board.
    -   **State:** Accept the full `godModeState` object as props. Calculate key colors via CSS based on that state (Mirroring the `godMode.js` logic but in CSS/JS).
    -   *Optimization:* Use `useMemo` to prevent re-renders if state hasn't changed.

## 3. Dashboard Page (`src/pages/Dashboard.tsx`)

- [ ] **Data Fetching:**
    -   Use `useApi` to poll `GET /api/godmode/status` every 2-5 seconds.
    -   Use `useApi` to poll `GET /api/godmode/state` (for the Visualizer colors).
- [ ] **Layout:**
    -   Render `StatusHero`.
    -   Render `VirtualKeyboard`.
    -   Render `LayerStack`.
    -   Render `QuickActions` (Buttons wired to `POST /api/godmode/control`).

## 4. Quick Actions Wiring

- [ ] **Backend (`api/godmode/control.js`):**
    -   Add handler for `command: 'restart'`.
    -   Add handler for `command: 'clear'`.
- [ ] **Frontend:** Connect buttons to these endpoints.