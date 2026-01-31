# Frontend Design Specification: God Mode Control Center

**Version:** 2.0 (God Mode Edition)
**Date:** November 19, 2025
**Framework:** Ionic React (Typescript)
**Architecture:** Tabbed PWA with "God Mode" Compositor Configuration.

## 1. Global UX Strategy

The application controls the "God Mode" Node.js backend. It is divided into **Monitoring** (Dashboard) and **Configuration** (Settings).

**Header Bar (Persistent):**
*   **Status Dot:** Green (Socket Connected) / Red (Disconnected).
*   **Master Switch:** A prominent toggle labeled **"GOD MODE"**.
    *   *Behavior:* Global Kill-switch. If OFF, all lighting logic stops and returns to firmware default.
    *   *Visual:* When OFF, the rest of the UI is desaturated/disabled.

## 2. Tabbed Interface Layout

### **Tab 1: Dashboard (Home)**
**Icon:** `home-outline`
**Goal:** Real-time visualization of the active composition.

*   **System Status Card:**
    *   `Engine State:` **ACTIVE** / **PASSTHROUGH** (Gaming Mode).
    *   `FPS:` (e.g., 60).
    *   `Active Layers:` List of currently rendering layers (e.g., "Background: Rain", "Widget: Clock", "Interrupt: Download").
*   **Visualizer Preview:**
    *   A CSS-based representation of the keyboard (using `key_groups.json` geometry) that mirrors the colors currently being sent to the hardware. (Future goal, placeholder for now).
*   **Quick Actions:**
    *   [ Force Clear ] - Panic button to black out keys.
    *   [ Restart Engine ] - Re-initializes the Frida hook.

---

### **Tab 2: Settings (The Compositor)**
**Icon:** `settings-outline`
**Goal:** Configuration of the 5-Layer Compositor Engine.
Refer to docs\frontend_settings_design_spec_2025_11_19.md for the full spec

This page is a scrolling list of **Layer Cards**.

---

### **Tab 3: Logs**
**Icon:** `terminal-outline`
*   Standard scrolling console log of backend events via WebSocket.