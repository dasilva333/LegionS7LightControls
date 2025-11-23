({
    name: 'godMode',
    dependencies: {},
    action: (context) => {
        // 1. Extract Context & Utils
        const { baseAddress, log, keyGroups, initialState } = context;
        const godMode = context.godMode || {};

        // Verify we have the injected modules
        if (!godMode.utils || !godMode.layers) {
            log("[GodMode] CRITICAL ERROR: Modules not injected by loader.");
            return {};
        }

        const { geometry, color_math } = godMode.utils;

        // 2. Build Geometry Map
        const { KEY_MAP, NAME_TO_ID } = geometry.buildKeyMaps(keyGroups);

        // --- DEBUG: INIT CHECK ---
        log(`[DEBUG] Init: BaseAddress ${baseAddress}`);
        log(`[DEBUG] Init: KeyGroups Length ${keyGroups ? keyGroups.length : 'NULL'}`);
        log(`[DEBUG] Init: KEY_MAP Size ${KEY_MAP.size}`);
        // Check Key 66 (Q) specifically as it's our test candidate
        // const debugKey = KEY_MAP.get(66);
        // log(`[DEBUG] Init: Key 66 lookup: ${debugKey ? JSON.stringify(debugKey) : 'UNDEFINED'}`);
        // -------------------------

        // 3. Initialize State
        const state = JSON.parse(JSON.stringify(initialState));

        // Ensure runtime structures exist
        state.alerts = [];
        state.__fxRuntime = { activeFades: new Map() };
        if (!state.widgets) state.widgets = {};
        if (!state.interrupts) state.interrupts = {};

        // --- DEBUG: STATE CHECK ---
        log(`[DEBUG] Init: State Mode: ${state.mode}`);
        log(`[DEBUG] Init: BG Mode: ${state.backgroundMode}`);
        log(`[DEBUG] Init: Weather: ${state.weather}`);
        // --------------------------

        // 4. Setup Layer Pipeline
        const layerOrder = [
            godMode.layers.layer1_background,
            godMode.layers.layer2_context,
            godMode.layers.layer3_widgets,
            godMode.layers.layer4_interrupts,
            godMode.layers.layer5_fx
        ].filter(fn => typeof fn === 'function');

        log(`[DEBUG] Init: Active Layers: ${layerOrder.length}/${Object.keys(godMode.layers).length}`);
        log(`[DEBUG] Layers Found ${JSON.stringify(Object.keys(godMode.layers))}`);

        // 5. Setup Hook
        const PRIMITIVE_RVA = 0x209b0;
        const HEADER_SIZE = 4;
        const BYTES_PER_KEY = 5;
        const BUFFER_SIZE = 960;

        let tick = 0;
        let debuggedOnce = false; // Ensure we only log the loop once

        const targetAddr = baseAddress.add(PRIMITIVE_RVA);
        log('[GodMode] Engine v2 loaded. State synced.');

        // 6. Main Loop
        let lastFrameState = []; // Cache for snapshot
        let captureMode = false; // Performance optimization

        Interceptor.attach(targetAddr, {
            onEnter(args) {
                const bufferInfoPtr = args[2];
                if (bufferInfoPtr.isNull()) return;
                const dataPtr = bufferInfoPtr.readPointer();
                if (dataPtr.isNull()) return;

                if (dataPtr.readU8() === 0x07 && dataPtr.add(1).readU8() === 0xA1) {
                    tick++;

                    // --- SNAPSHOT CAPTURE (READ ONLY) ---
                    // Only parse if requested to save CPU
                    if (captureMode) {
                        const currentFrame = [];
                        let readCursor = dataPtr.add(HEADER_SIZE);
                        const readLimit = dataPtr.add(BUFFER_SIZE - BYTES_PER_KEY);

                        while (readCursor < readLimit) {
                            const kId = readCursor.readU16();
                            if (kId !== 0) {
                                const r = readCursor.add(2).readU8();
                                const g = readCursor.add(3).readU8();
                                const b = readCursor.add(4).readU8();
                                currentFrame.push({ keyId: kId, r, g, b });
                            }
                            readCursor = readCursor.add(BYTES_PER_KEY);
                        }
                        lastFrameState = currentFrame;
                    }
                    // ------------------------------------

                    // If God Mode is NOT active, we are done (Pass-through)
                    if (!state.active || state.mode === 'PASSTHROUGH') return;

                    // --- GOD MODE RENDER (WRITE) ---
                    // ... (Existing rendering logic) ...

                    // --- DEBUG: FIRST FRAME ---
                    if (!debuggedOnce) {
                        log(`[DEBUG] Frame 1: Hook Triggered.`);
                        log(`[DEBUG] Frame 1: Cursor Start ${dataPtr.add(HEADER_SIZE)}`);
                    }
                    // --------------------------

                    let cursor = dataPtr.add(HEADER_SIZE);
                    const limit = dataPtr.add(BUFFER_SIZE - BYTES_PER_KEY);

                    while (cursor < limit) {
                        const keyId = cursor.readU16();

                        if (keyId !== 0) {
                            const basePos = KEY_MAP.get(keyId);

                            if (basePos) {
                                const pos = { ...basePos, keyId };

                                let color = { r: 0, g: 0, b: 0 };

                                // Run Pipeline
                                if (state.snake && state.snake.isPlaying) {
                                    // Snake Game Override
                                    const snakeColor = godMode.layers.layer_snake(state, pos, tick, color, color_math);
                                    if (snakeColor) color = snakeColor;
                                } else {
                                    // Standard Pipeline
                                    for (const layerFn of layerOrder) {
                                        try {
                                            const nextColor = layerFn(state, pos, tick, color, color_math);
                                            if (nextColor) color = nextColor;
                                        } catch (e) {
                                            if (!debuggedOnce) log(`[DEBUG] Layer Error: ${e.message}`);
                                        }
                                    }
                                }

                                // Clamp and Write
                                cursor.add(2).writeU8(Math.max(0, Math.min(255, color.r)));
                                cursor.add(3).writeU8(Math.max(0, Math.min(255, color.g)));
                                cursor.add(4).writeU8(Math.max(0, Math.min(255, color.b)));
                            } else {
                                // --- DEBUG: MAP MISS ---
                                if (!debuggedOnce && keyId < 200) { // Don't spam high IDs
                                    log(`[DEBUG] Frame 1: Key ID ${keyId} NOT FOUND in Map.`);
                                }
                                // -----------------------
                            }
                        }
                        cursor = cursor.add(BYTES_PER_KEY);
                    }
                    debuggedOnce = true;
                }
            }
        });

        // 7. Exports
        return {
            enable: () => { state.active = true; log('God Mode Enabled'); },
            disable: () => { state.active = false; log('God Mode Disabled'); },
            getSnapshot: () => { return lastFrameState; },
            setCaptureMode: (enabled) => { captureMode = enabled; log(`[GodMode] Capture Mode: ${enabled}`); }, // <--- NEW EXPORT
            updateState: (partialState) => {
                for (const key in partialState) {
                    if (typeof state[key] === 'object' && !Array.isArray(state[key]) && partialState[key] !== null) {
                        Object.assign(state[key], partialState[key]);
                    } else {
                        state[key] = partialState[key];
                    }
                }
            },
            // --- UPDATED FLASH LOGIC ---
            flashKey: (keyName) => {
                const id = NAME_TO_ID.get(keyName.toUpperCase());
                if (!id) return; // Key not found

                const fades = state.__fxRuntime.activeFades;
                const config = state.widgets?.typingFx || {};
                const style = config.effectStyle || 'Bounce';

                // 1. Heatmap: Accumulate Intensity
                if (style === 'Heatmap') {
                    let currentVal = 0;
                    const entry = fades.get(id);

                    // Handle legacy storage (number vs object)
                    if (typeof entry === 'number') currentVal = entry;
                    else if (entry && typeof entry === 'object') currentVal = entry.intensity || 0;

                    // Add Heat based on slider (Default to 0.2 if undefined)
                    // Slider 0.1 = Slow Heat (10 taps)
                    // Slider 1.0 = Instant Heat (1 tap)
                    const increment = (config.intensity !== undefined) ? config.intensity : 0.2;

                    let nextVal = currentVal + increment;
                    if (nextVal > 1.0) nextVal = 1.0; // Cap at max

                    fades.set(id, nextVal);
                }
                // 2. Rainbow: Trigger Random Color
                else if (style === 'Rainbow Sparkle') {
                    // We set hue to undefined. The renderer (Layer 5) will see this
                    // and generate a random hue on the next frame.
                    fades.set(id, { intensity: 1.0, hue: undefined });
                }
                // 3. Bounce / Flash: Reset to Max
                else {
                    fades.set(id, 1.0);
                }
            }
        };
    }
})