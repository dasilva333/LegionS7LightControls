# Design Goals: The "God Mode" Engine

**Date:** November 18, 2025
**Architecture:** "The Photoshop Compositor" (Layered Rendering)
**Core Technology:** Node.js Director + Frida Primitive Injection (`0x209B0`)

## 1. Architectural Overview

The system is designed as a **Layered Compositor**. Unlike the device's native firmware which plays a single "Animation ID," our engine calculates a frame 60 times a second by stacking multiple logical layers on top of each other.

**The Render Pipeline (60 Hz Loop):**
1.  **Base Layer:** Generates the fundamental background (Time/Weather/Game).
2.  **Context Layer:** Modifies specific zones based on active application.
3.  **Widget Layer:** Overwrites specific key clusters with informational displays (Clock, Temp).
4.  **Interrupt Layer:** High-priority overrides (Progress Bars, Alerts).
5.  **FX Layer:** Additive effects (Ripples, Audio Splashes) blended on top.
6.  **Output:** Serializes the 960-byte buffer and injects via Frida.

## 2. Feature Specification

### Layer 1: The Environment (Base)
*   **Time-of-Day Gradient:**
    *   **Logic:** 24-hour cycle.
    *   **Visual:** Smooth gradient shifts representing the sky. Dawn (Purples/Oranges), Noon (Bright Blue/White), Dusk (Red/Pink), Night (Deep Blue/Black).
    *   **Update Rate:** Per minute (color target) / Per frame (interpolation).
*   **"The Storm" (Weather Override):**
    *   **Trigger:** Polls OpenWeatherMap API for local zip code every 15 mins.
    *   **Logic:** If `precip_chance > 50%` or `condition == Rain/Thunderstorm`.
    *   **Visual:** Overrides the Time Gradient.
        *   *Light Rain:* Random blue pixels falling Matrix-style.
        *   *Heavy Rain:* Faster speed, brighter trails.
        *   *Thunderstorm:* Random full-board white flashes (100ms) followed by fade-to-black.

### Layer 2: Context & Passthrough
*   **Gaming Mode (Aurora Passthrough):**
    *   **Trigger:** Process detection (Steam games, etc.).
    *   **Behavior:** **Disable Injection.** Allow the native `Gaming.AdvancedLighting.dll` to handle Screen Sync for maximum immersion.
*   **Contextual Shortcuts ("The Operator"):**
    *   **Trigger:** Active Window detection (`user32.dll`).
    *   **Visual:** Dims irrelevant keys, highlights shortcuts.
        *   *VS Code:* Highlight F5, F10, F11, Ctrl, Shift.
        *   *Photoshop:* Highlight Tool keys (V, B, L, M).

### Layer 3: Widgets (Persistent Info)
*   **The Day Bar (Function Row):**
    *   **Zone:** F1 - F12.
    *   **Logic:** 12 Keys = 24 Hours (2 hours per key).
    *   **Visual:** Acts as a progress bar for the day. Keys light up solid as time passes. The current "active" 2-hour block pulses.
*   **Temperature Gauge:**
    *   **Zone:** Navigation Cluster or Arrow Keys.
    *   **Source:** Weather API or System CPU Temp.
    *   **Visual:** Color scale. Blue (<10°C) -> Green (20°C) -> Orange (30°C) -> Red (>40°C).

### Layer 4: Interrupts (High Priority)
*   **Universal Progress Bar:**
    *   **Zone:** Number Row (1 - 0).
    *   **Interface:** REST API / Socket.io endpoint exposed by Node.js server.
    *   **Use Case:** Tracking generic downloads, AI Model Training (DiT inference), or file transfers.
    *   **Visual:** Green fill left-to-right. Yellow if stalled. Overrides Time-of-Day on that row while active.
*   **Safety Monitor (FindMy):**
    *   **Source:** Script querying FindMyPhone status (e.g., AirTags on pets).
    *   **Logic:** If specific item "Last Seen" > Threshold.
    *   **Visual:** Slow, menacing Red strobe on the whole board or specific zone.

### Layer 5: Transient FX (Additive)
*   **Typing Reactive (Global Hook):**
    *   **Input:** Hooks global keyboard events (via `uiohook-napi` or similar) to capture **External USB Keyboard** input.
    *   **Logic:** Maps external keystrokes to the Laptop's physical layout.
    *   **Visual:** "Type Lightning" / Ripple effect expanding from the pressed key. Blends additively with the background (brightens the underlying color).
*   **Audio Reactive:**
    *   **Input:** System Audio Monitor.
    *   **Logic:** Detect volume spikes (Notifications).
    *   **Visual:** "Splash" radial animation or rainbow wave expanding from center on loud sounds.

## 3. Technical Stack Requirements

*   **Runtime:** Node.js (v18+).
*   **Injection:** Frida (via `frida-node` or spawned process).
*   **Server:** Express.js (to accept Progress Bar / external webhooks).
*   **Inputs:**
    *   `uiohook-napi` (Global Keyboard Hook).
    *   `systeminformation` (Process/Battery/CPU).
    *   `axios` (Weather/External APIs).
*   **Data Structure:** `KeyMap.json` (Physical Layout -> ID Map).

## 4. Roadmap

1.  **The Director:** Build the Node.js loop and Layer Class structure.
2.  **The Bridge:** Establish robust IPC (Inter-Process Communication) between Node.js logic and the Frida injection script.
3.  **Input Integration:** Verify USB Keyboard hooks correctly trigger visual effects on the Laptop display.
4.  **API Integration:** Build the Express routes for the Progress Bar.
5.  **Layer Implementation:** Code the individual logic for Weather, Clock, and Context modes.