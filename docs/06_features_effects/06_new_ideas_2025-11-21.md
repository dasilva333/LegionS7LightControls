Here is the comprehensive **Master Report** of all the ideas, loose ends, and future concepts we’ve generated during this session.

### 🟢 I. Completed & Active
*   **Audio Engine:** Switched from raw RMS to a Windowed FFT (Logarithmic scale) for accurate frequency analysis.
*   **Typing FX:**
    *   **Bounce:** Standard fade.
    *   **Flash:** Fast strobe decay.
    *   **Rainbow Sparkle:** Random hue generation per key press.
    *   **Heatmap:** Accumulative intensity (+0.2 per press) with slow decay (5s) and Blue → Yellow → Red gradient.
*   **Background FX (Fixed):**
    *   **Wave:** Linear Left-to-Right.
    *   **Ripple:** Radial Center-Out.
    *   **Checkerboard:** Smooth Sine-wave crossfading (no more jerky blinking).
    *   **Raindrops:** Matrix-style vertical falling code.

---

### 🟠 II. Layer 1 (Background) Loose Ends
These are effects we critiqued but haven't fully polished or renamed yet.

**1. The "Heatmap" Name Conflict**
*   **Issue:** We moved the logic of a *true* Heatmap to the Typing layer. The Background effect named "Heatmap" (the breathing circle) is now misnamed.
*   **Proposal A (Rename):** Rename background `HEATMAP` to **`BEACON`** or **`PULSE`**.
*   **Proposal B (Redesign):** Change the logic to **`PLASMA`**. Use sine waves moving in opposing directions to create morphing blobs of color (like a lava lamp) to fit the "Heat" aesthetic without needing input data.

**2. Sonar / Radar**
*   **Issue:** The current math uses hardcoded center coordinates `(10, 3)`. It looks off-center on NumPad or different layouts.
*   **Solution:** Pass grid dimensions (`width`, `height`) into the render function so we can calculate the true center dynamically.

---

### 🟣 III. GodMode Engine (Physics & Time)
These are changes to `actions/godMode.js` that alter *how* the engine runs, rather than just changing colors.

**1. "Interactive Water" (Physics Ripples)**
*   **Concept:** Instead of a preset "Ripple" background animation, every key press spawns a physics object (`{x, y, power}`) into a `state.activeRipples` array.
*   **Visual:** Typing feels like rain hitting a pond. Ripples intersect and blend.
*   **Req:** A new Background Effect mode called **`WATER`** that reads this array.

**2. Audio Time Dilation ("Warp Speed")**
*   **Concept:** Modulate the engine's `tick` rate based on music volume.
*   **Logic:**
    *   Silence = Standard Speed (1x).
    *   Bass Drop / Loud Peak = Turbo Speed (4x).
*   **Visual:** Your `Wave`, `Checkerboard`, and `Raindrops` will physically speed up and slow down in sync with the music beat.

**3. Global Impact Shake**
*   **Concept:** Trigger a global coordinate offset on specific events (like hitting `Enter` hard or a loud bass drum hit).
*   **Visual:** The entire lighting grid "jolts" or vibrates for a few milliseconds, adding a tactile "crunch" to the visuals.

---

### 🔵 IV. Interaction Logic (UI Features)
New ways for the layers to talk to each other.

**1. Audio vs. Background Priority**
You requested a UI control (Dropdown or Radio) to decide how Background FX handles music:
*   **Option A: Overlay (Default):** Background runs, Audio FX renders on top.
*   **Option B: Exclusive (Disable BG):** If Audio FX is running, the Background layer turns Black/Off to reduce clutter.
*   **Option C: Reactive (Warp Speed):** Background runs, but allows Audio to control its speed (see *Time Dilation* above).

---

### 📝 Recommended Roadmap

1.  **Immediate Housekeeping:** Rename the background `HEATMAP` to `BEACON` so it doesn't confuse users with the new Typing Heatmap.
2.  **The "Warp Speed" Implementation:** Add the logic to `godMode.js` to speed up `tick` based on `audioPeak`. It's a high-impact change with low code effort.
3.  **The UI Switch:** Add the "Disable Background while Audio Active" logic to `layer1_background.js`.
4.  **The "Water" Physics:** This is the most complex task (requires new state array and new renderer logic), so save it for a dedicated session.