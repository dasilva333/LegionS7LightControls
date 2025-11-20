# Refactoring Specification: God Mode Modular Architecture

**Objective:** Decompose the monolithic `frida/actions/godMode.js` into a modular, layered architecture without changing any logic or functionality.

## 1. Directory Structure

Create the following directory tree under `automation/backend/frida/`:

```text
frida/
├── godmode/
│   ├── layers/
│   │   ├── layer1_background.js
│   │   ├── layer2_context.js
│   │   ├── layer3_widgets.js
│   │   ├── layer4_interrupts.js
│   │   └── layer5_fx.js
│   └── utils/
│       ├── color_math.js
│       └── geometry.js
```

## 2. Component Responsibilities (Porting Logic)

Extract the code blocks from the current `godMode.js` into these new files.
*Note: These files are NOT standard Node modules. They are raw code fragments that will be injected. Wrap each in a closure or object definition as defined in Section 3.*

### **Utils**
*   **`utils/color_math.js`**: Move `hsvToRgb`, `hexToRgb`, and `mix` functions here.
*   **`utils/geometry.js`**: Move the `KEY_MAP` and `NAME_TO_ID` generation logic here (accepting `keyGroups` as input).

### **Layers**
Each layer file should export a single function: `render(state, pos, tick, currentColor, utils) -> newColor`.
*   **`layer1_background.js`**: Move the logic for `state.weather` (Rain/Storm) and `bgMode` (Time/Effect).
*   **`layer2_context.js`**: Placeholder (return `currentColor`).
*   **`layer3_widgets.js`**: Move the logic for `dayBar` and `temperature`.
*   **`layer4_interrupts.js`**: Move the logic for `progress` and `safety`.
*   **`layer5_fx.js`**: Move the logic for `activeFades` (Typing) and Audio.

## 3. Loader Upgrade (`frida/loader.js`)

Update the loader to read all files in `frida/godmode/` and inject them into `agent-core.js`.

**Injection Logic:**
The loader should construct a `context.godMode` object string to replace a placeholder in `agent-core.js`.

```javascript
// Target structure in agent-core.js after injection:
context.godMode = {
    utils: { ... },
    layers: {
        layer1: (state, pos, tick, color, utils) => { ... },
        layer2: (state, pos, tick, color, utils) => { ... },
        ...
    }
};
```

## 4. Orchestrator Update (`frida/actions/godMode.js`)

Rewrite the main action file to use this new structure.
*   It should no longer contain rendering logic.
*   It should iterate the buffer loop.
*   Inside the loop, it calls the layers sequentially:
    ```javascript
    let color = { r:0, g:0, b:0 };
    color = context.godMode.layers.layer1(state, pos, tick, color, context.godMode.utils);
    color = context.godMode.layers.layer3(state, pos, tick, color, context.godMode.utils);
    // etc...
    ```

## 5. Validation Steps
1.  Run `node server.js`.
2.  Enable God Mode via the UI.
3.  Verify that existing features (Time Gradient, Typing FX) work exactly as they did before the refactor.

This is the right move. Breaking it down into a checklist prevents the "I bit off more than I can chew" hallucination loop.

Here is the **Implementation Checklist** to append to the bottom of `refactor_spec_2025_11_20.md`. It breaks the massive job into 3 safe chunks.

## 6. Implementation Checklist

**Phase 1: Scaffolding (Safe Mode)**
*Goal: Create the directory structure and file shells. No logic changes yet.*
- [x] Create directory `automation/backend/frida/godmode/layers/`.
- [x] Create directory `automation/backend/frida/godmode/utils/`.
- [x] Create stub files for Utils: `color_math.js`, `geometry.js`.
- [x] Create stub files for Layers: `layer1_background.js`, `layer2_context.js`, `layer3_widgets.js`, `layer4_interrupts.js`, `layer5_fx.js`.

**Phase 2: Utility & Loader Injection**
*Goal: Make the helper functions available in the agent context.*
- [ ] **Port Utils:** Copy `hsvToRgb`/`hexToRgb` to `color_math.js` and `KEY_MAP` logic to `geometry.js`.
- [ ] **Update Loader:** Modify `frida/loader.js` to:
    -   Read all files in `frida/godmode/**/*.js`.
    -   Construct a `context.godMode` object string.
    -   Inject it into `agent-core.js` (replacing a new placeholder `/* __GODMODE_MODULES__ */ {}`).
- [ ] **Update Agent Core:** Add the placeholder to `agent-core.js`.

**Phase 3: Logic Migration**
*Goal: Move the rendering logic and switch the Orchestrator.*
- [ ] **Port Layers:** Move the `if (storming)...` logic to Layer 1, Widget logic to Layer 3, etc.
- [ ] **Update Orchestrator:** Rewrite `frida/actions/godMode.js` to loop through keys and call `context.godMode.layers.layerX.render(...)`.
- [ ] **Verify:** Run `server.js` and ensure lights still turn on.
### Append this to `docs/refactor_spec_2025_11_20.md`:

```markdown
## 6. Implementation Checklist

**Phase 1: Scaffolding (Safe Mode)**
*Goal: Create the directory structure and file shells. No logic changes yet.*
- [ ] Create directory `automation/backend/frida/godmode/layers/`.
- [ ] Create directory `automation/backend/frida/godmode/utils/`.
- [ ] Create stub files for Utils: `color_math.js`, `geometry.js`.
- [ ] Create stub files for Layers: `layer1_background.js`, `layer2_context.js`, `layer3_widgets.js`, `layer4_interrupts.js`, `layer5_fx.js`.

**Phase 2: Utility & Loader Injection**
*Goal: Make the helper functions available in the agent context.*
- [ ] **Port Utils:** Copy `hsvToRgb`/`hexToRgb` to `color_math.js` and `KEY_MAP` logic to `geometry.js`.
- [ ] **Update Loader:** Modify `frida/loader.js` to:
    -   Read all files in `frida/godmode/**/*.js`.
    -   Construct a `context.godMode` object string.
    -   Inject it into `agent-core.js` (replacing a new placeholder `/* __GODMODE_MODULES__ */ {}`).
- [ ] **Update Agent Core:** Add the placeholder to `agent-core.js`.

**Phase 3: Logic Migration**
*Goal: Move the rendering logic and switch the Orchestrator.*
- [ ] **Port Layers:** Move the `if (storming)...` logic to Layer 1, Widget logic to Layer 3, etc.
- [ ] **Update Orchestrator:** Rewrite `frida/actions/godMode.js` to loop through keys and call `context.godMode.layers.layerX.render(...)`.
- [ ] **Verify:** Run `server.js` and ensure lights still turn on.
```
