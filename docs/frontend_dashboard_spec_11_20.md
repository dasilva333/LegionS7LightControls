# Frontend Design Specification: The Dashboard (v2)

**Version:** 2.0
**Date:** November 20, 2025
**Scope:** Tab 1 (Home Screen)

## 1. Data Source
We will exclusively use `GET /api/godmode/state`.
This endpoint returns everything we need:
*   `active` (Engine Status)
*   `mode` (Default vs Passthrough)
*   `backgroundMode` / `effectSettings` (Visualizer Base)
*   `widgets` (Active widgets to highlight)
*   `timeOfDay` (For calculating gradient color)
*   `widgets.temperature.value` (For visualizing temp)

## 2. UI Components (`src/components/dashboard/`)

### **A. Status Hero (`StatusHero.tsx`)**
*   **Left:** Status Dot (Green=Active, Yellow=Passthrough, Red=Disabled).
*   **Text:** "ENGINE ACTIVE" or "PASSTHROUGH".
*   **Right:** "Weather: Clear" | "Temp: 75°F" (Pulled from `state.weather` / `state.widgets.temperature.value`).

### **B. The Layer Stack (`LayerStack.tsx`)**
A vertical list visualization.
*   **Logic:** Iterates through the `state` object to see which features are `enabled`.
*   **Visual:**
    *   **Active:** Bright text, colored indicator.
    *   **Inactive:** Dimmed text.
    *   **Layers:**
        1.  **FX:** (Typing / Audio)
        2.  **Interrupts:** (Progress Bar)
        3.  **Widgets:** (Day Bar / Temp)
        4.  **Background:** (Shows current Mode: "Time of Day" or "Ripple")

### **C. The Visualizer (`VirtualKeyboard.tsx`)**
*   **Geometry:** Uses `keyGroups.json` to render the CSS grid.
*   **Rendering:**
    *   Replicates the `godMode.js` logic in TypeScript (client-side).
    *   Calculates the color for each key based on the `state` prop.
    *   **Example:** If `backgroundMode == 'TIME'`, it calculates the gradient color for `state.timeOfDay` and sets the background of all key divs.
    *   **Example:** If `widgets.dayBar.enabled`, it overrides the F-Keys div colors.

### **D. Quick Actions (`QuickActions.tsx`)**
*   **[ Reload Engine ]**: Calls `POST /api/godmode { command: 'enable' }`.
*   **[ Emergency Off ]**: Calls `POST /api/godmode { command: 'disable' }`.


# Dashboard Implementation Checklist (v2)

**Objective:** Build the Home Tab using existing endpoints.

## 1. Infrastructure
- [ ] **Frontend Utility (`src/utils/colorMath.ts`):**
    -   Create this file.
    -   Manually copy the `hsvToRgb`, `hexToRgb`, and `mix` functions from `backend/frida/godmode/utils/color_math.js` and type them for TypeScript.
    -   *Reason:* The frontend needs to do the same math as the backend to show an accurate preview.

## 2. Components
- [ ] **`StatusHero.tsx`:** Simple display component taking `godModeState` as a prop.
- [ ] **`LayerStack.tsx`:** Logic to parse `godModeState` and render the active layer list.
- [ ] **`VirtualKeyboard.tsx`:**
    -   Import `keyGroups.json`.
    -   Implement a `renderKey(keyId)` function that mimics the `godMode.js` pipeline (Background -> Widgets).
    -   Use `src/utils/colorMath.ts` for gradients.

## 3. Page Wiring
- [ ] **`Dashboard.tsx`:**
    -   Use `useApi` to fetch `GET /api/godmode/state` on mount.
    -   Set up a simple poll (e.g., 5 seconds) to keep the Visualizer roughly in sync with the real world (Time/Temp updates).
    -   Render the 3 components.
