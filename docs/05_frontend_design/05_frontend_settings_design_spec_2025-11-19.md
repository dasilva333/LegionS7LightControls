# Frontend Design Specification: God Mode Control Center

**Version:** 1.0
**Target Platform:** Web Browser (Desktop)
**Backend Interface:** REST API + Socket.io (for real-time status)
**Core Concept:** A "Mission Control" dashboard composed of modular cards, allowing real-time configuration of the lighting compositor layers.

## 1. Global Layout & State

**Header Bar:**
*   **System Status Indicator:** Green Dot (Connected) / Red Dot (Disconnected).
*   **Master Toggle:** A large switch labeled **"GOD MODE"**.
    *   *Action:* Calls `POST /api/godmode` with `{ command: 'enable' | 'disable' }`.
    *   *Visual:* When OFF, all other cards on the page are dimmed/disabled.
*   **Global Settings:**
    *   **Zip Code Field:** Single input field used by both Weather and Temperature widgets.

---

## 2. Component Modules (Cards)

The dashboard is divided into logical cards representing the Compositor Layers.

Here is the revised **Section A** for the Frontend Design Specification. It replaces the previous "Time of Day" card with a dynamic "Background Controller" that handles the logic you described.

### A. The Environment (Background Layer)

**1. Background Controller**
*   **Mode Selector:** Segmented Control `[ None | Time of Day | Effect ]`
*   *Dynamic Content Area (Changes based on Mode):*

    *   **State: None**
        *   **Visual:** A simple placeholder text: *"Background layer is disabled. Unassigned keys will remain off (Black)."*

    *   **State: Time of Day**
        *   **Update Rate:** Number Input (Default: 1 minute).
        *   **Gradient Editor:**
            *   Fetches data from `GET /time-gradients`.
            *   **Columns:** `Start Time` | `End Time` | `Start Color (Swatch)` | `End Color (Swatch)` | `Actions`.
            *   **Actions:** [Edit] [Delete].
        *   **Footer Action:** [ + Add New Gradient ] button.

    *   **State: Effect**
        *   **Effect Type:** Dropdown `[ Ripple | Wave | Fade | Checkerboard ]`
        *   **Base Color:** [ Color Picker ] (Defines the primary hue).
        *   **Speed:** Range Slider `[ 1 -----|----- 5 ]` (Slow to Fast).

**2. Weather Control**
*   **Toggle:** [ Enable / Disable ]
*   **Description:** "Monitors local weather conditions and applies rain/storm effects."
*   **Storm Override:** [ Checkbox ] "Override Background Layer during Intense Weather".
    *   *Logic:* If checked, rain/storm animations replace the Time of Day or Static Effect.
*   **Specific Key Override:**
    *   *Input:* **Key Picker** (Multi-select).
    *   *Description:* "Always reflect weather status on these specific keys (Sunny/Overcast/Rainy), regardless of the main background."

---

### B. Automation & Context

**3. Process Monitor (Gaming Mode)**
*   *Note: Controls the external daemon, distinct from the God Mode render loop.*
*   **Toggle:** [ Enable / Disable ]
*   **Description:** "Automatically disables God Mode when specific games are running."
*   **Monitored Processes List:**
    *   Fetches from `GET /processes`.
    *   **List Item:** `Process Name (e.g., csgo.exe)` | [ Remove Button ].
*   **Footer Action:** [ + Add Process ] button.
    *   *Modal:* Input field for "Executable Name".

**4. Contextual Shortcuts**
*   **Toggle:** [ Enable / Disable ]
*   **Application List:**
    *   Accordion style list of configured apps.
    *   **Header:** `App Name (e.g., photoshop.exe)` | [Delete].
    *   **Body (Expanded):** List of mapped keys.
        *   `Key: [V]` | `Color: [ #Swatch ]` | [Remove].
        *   [ + Add Key ] button inside the accordion.

---

### C. Widgets (Persistent Overlays)

**5. The Day Bar**
*   **Toggle:** [ Enable / Disable ]
*   **Description:** "F1-F12 represent 24 hours."
*   **Configuration:**
    *   **Active Color:** [ Color Picker ] (Past hours).
    *   **Inactive Color:** [ Color Picker ] (Future hours).

**6. Temperature Gauge**
*   **Toggle:** [ Enable / Disable ]
*   **Configuration:**
    *   **Low Temp (0%):** Input (`°F`) + [ Color Picker ] (Default: Blue).
    *   **High Temp (100%):** Input (`°F`) + [ Color Picker ] (Default: Red).
    *   **Target Keys:** **Key Picker** (Multi-select).

---

### D. Interrupts (High Priority Overrides)

**7. Universal Progress Bar**
*   **Toggle:** [ Enable / Disable ]
*   **Configuration:**
    *   **Start Key:** **Key Picker** (Single).
    *   **End Key:** **Key Picker** (Single).
    *   **Start Gradient:** [ Color Picker ].
    *   **End Gradient:** [ Color Picker ].
*   **Interfaces:**
    *   **REST Endpoint:** Toggle [ On / Off ].
    *   **Socket.io:** Toggle [ On / Off ].

**8. Safety Monitor (FindMy)**
*   **Toggle:** [ Enable / Disable ]
*   **Authentication State:**
    *   *If Unauthenticated:* Large [ Log in with Apple ] button.
    *   *If Authenticated:*
        *   **Item Selector:** Dropdown of FindMy items (e.g., "Styx", "Shamree").
        *   **Threshold:** Number Input ("Minutes since last seen").
        *   **Alert Target:** **Key Picker** (Single or Zone).
        *   **Base Color:** [ Color Picker ] (Defines the strobe color).

---

### E. Transient Effects (Visual Flare)

**9. Typing Reactive**
*   **Toggle:** [ Enable / Disable ]
*   **Effect Style:** Dropdown [ Bounce | Flash | Rainbow Sparkle ].
    *   *Logic:* If "Rainbow Sparkle" is selected, hide the Color Picker.
*   **Effect Color:** [ Color Picker ].

**10. Audio Reactive**
*   **Toggle:** [ Enable / Disable ]
*   **Mode:** Dropdown [ Ripple | Rows (EQ) ].
*   **Source:** Dropdown [ Windows Audio | Microphone | Both ].

---

## 3. UX Components & Standards

**The "Key Picker" Component:**
Since standardizing key input is critical, a reusable component will be built.
*   **Visual:** A searchable dropdown list.
*   **Data:** Contains all keys from `key_groups.json`.
*   **Labeling:** Shows `Key Name` (e.g., "Esc", "Num 0", "PrtSc").
*   **Value:** Returns the internal `Key ID`.

**The "Color Picker" Component:**
*   Standard Hex/RGB wheel.
*   Must support **Brightness** (V in HSV) to handle dimming logic described in the backend.

## 4. Data Sync Strategy

1.  **Load:** On page load, Frontend fetches `GET /settings` (or similar aggregate endpoint) to populate all toggles and input fields.
2.  **Update:**
    *   **Toggles/Simple Inputs:** Send `POST /api/godmode/state` with the updated partial state (e.g., `{ weather: { enabled: true } }`).
    *   **Complex Lists (Gradients/Processes):** Use their specific CRUD endpoints (`POST /time-gradients`, etc.).
3.  **Real-time:** Socket.io listener updates the UI if the backend changes state (e.g., if Gaming Mode auto-disables God Mode, the Master Switch on the UI should flip off automatically).