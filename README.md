# Legion S7 Light Controls

A full-stack automation suite for controlling Lenovo Legion keyboard lighting, featuring a React frontend, Node.js backend, and Frida-based native hooks.

## 📂 Project Structure

### ✅ Active Components
*   **`automation/backend`**
    *   **Core:** Node.js/Express server handling API requests and state management.
    *   **Engine:** `godMode.js` (Frida Agent) injects into `LenovoVantage.exe` to hook the lighting engine at the primitive level (RVA `0x209b0`).
*   **`automation/frontend`**
    *   **Tech:** Ionic React + TypeScript.
    *   **UI:** A modern dashboard for real-time control of layers, effects, and widgets.

### ⚠️ Deprecated / Legacy
*   `automation/edge_bridge` (Native C++ bridge - Replaced by Frida)
*   `automation/backend/supervisor.js` & `worker.js` (Old architecture)
*   `backend/test` (Misc helper tools)

## 📚 Key Documentation

For a deep dive into how this works, refer to these core documents:

1.  **[God Mode Architecture Spec](docs/god_mode_spec_2025-11-18.md)**
    *   *The "Bible" of this project.* Details the final architecture, the `0x209b0` hook, the layer compositor pipeline, and the state management strategy.

2.  **[Frontend Dashboard Spec](docs/frontend_dashboard_spec_11_20.md)**
    *   Overview of the UI architecture, component hierarchy, and real-time state synchronization.

3.  **[Roadmap & Wishlist](docs/new_ideas_11_21.md)**
    *   Current active tasks, future ideas (Physics engine, Water ripples), and the "Wishlist" for final polish.

4.  **[Backend Integration](docs/backend_integration_checklist_11_19.md)**
    *   Details the API layer and how the frontend communicates with the Frida agent.

## 🚀 Quick Start

### Prerequisites
This project relies on native Node.js modules (`frida`, `uiohook-napi`, `naudiodon`). To avoid build errors during installation, ensure you have:

1.  **Node.js v18+**
2.  **Python 3.10+** (Required for building native extensions)
3.  **Visual Studio Build Tools** (Desktop development with C++)
    *   *Tip:* You can install these via `npm install --global --production windows-build-tools` (admin required) or the Visual Studio Installer.
4.  **(Optional) Frida CLI Tools:**
    *   Run `pip install frida-tools` to get the `frida-ps` and `frida-trace` commands for debugging.

### Backend
```bash
cd automation/backend
npm install
# If you encounter build errors, ensure Python and VS Build Tools are in your PATH.
npm run dev
# Starts Express on port 3005 and attaches Frida to LenovoVantage
```

### Frontend
```bash
cd automation/frontend
npm install
npm start
# Runs the Ionic dev server on port 3000
```

## 📸 Features

### 🎨 Visual Layers
*   **Background Controller:** Dynamic environments including Time-of-Day gradients, solid colors, and custom snapshots.
*   **Weather Integration:** Real-time rain and storm effects based on local weather conditions.
*   **Typing Reactive:** Interactive effects like Heatmap, Ripple, and Sparkle that respond to every keystroke.
*   **Audio Engine:** FFT-based visualization supporting EQ (Frequency) and RMS (Loudness) modes.

### 🛠️ Widgets & Tools
*   **The Day Bar:** Visualizes the 24-hour day across the F-keys (Past vs Future).
*   **Temperature Gauge:** Maps local temperature to a color gradient on specific keys.
*   **Process Monitor:** Automatically disables God Mode when specific games (e.g., CS:GO) are launched.
*   **Snake Game:** A fully playable Snake game rendered directly on the keyboard grid.
*   **Snapshot Tool:** One-click capture of native lighting states to use as custom backgrounds.

## ❓ Troubleshooting

*   **"Process not found":** Ensure `LenovoVantage.exe` is running. Open the Vantage app and minimize it to the tray.
*   **"Access Denied" / Injection Failed:** Try running the terminal as **Administrator**. Frida requires elevated privileges to attach to processes.
*   **Build Errors:** Verify `python --version` returns 3.x and that Visual Studio Build Tools are correctly installed.

## ⚠️ Disclaimer

This software injects code into a running process (`LenovoVantage.exe`) and modifies memory to control hardware.
*   **Use at your own risk.**
*   While tested on the Legion S7, this may behave differently on other models or Vantage versions.
*   This is **not** an official Lenovo product.

## 📄 License

MIT License

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
