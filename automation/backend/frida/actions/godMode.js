({
    name: 'godMode',
    dependencies: {},
    action: (context) => {
        const { baseAddress, log, keyGroups, initialState } = context;

        const PRIMITIVE_RVA = 0x209b0;
        const HEADER_SIZE = 4;
        const BYTES_PER_KEY = 5;
        const BUFFER_SIZE = 960;

        // --- 1. THE STATE STORE ---
        // We clone the injected initial state to ensure we match the backend exactly.
        // We manually add internal/runtime properties that might not be in the DB config.
        const state = JSON.parse(JSON.stringify(initialState));

        // Runtime-only state (not persisted in DB)
        state.alerts = [];

        // Ensure widgets object exists if backend didn't send it (backwards compat)
        if (!state.widgets) state.widgets = {
            dayBar: { enabled: false, activeColor: { r: 0, g: 255, b: 0 }, inactiveColor: { r: 20, g: 20, b: 20 } },
            temperature: { enabled: false, value: 0, low: 0, high: 100, keys: [] }
        };
        if (!state.interrupts) state.interrupts = {
            progress: { enabled: false, value: 0, startKey: 0, endKey: 0, startColor: { r: 0, g: 255, b: 0 }, endColor: { r: 255, g: 0, b: 0 } },
            safety: { enabled: false, active: false, color: { r: 255, g: 0, b: 0 }, keys: [] }
        };

        // --- FX STATE ---
        const activeFades = new Map();

        // --- GEOMETRY PRE-CALC ---
        const KEY_MAP = new Map();
        const NAME_TO_ID = new Map();

        keyGroups.forEach(group => {
            group.keys.forEach(k => {
                const meta = { row: k.row, col: k.col, group: group.group_name };
                KEY_MAP.set(k.id, meta);
                if (k.key_name) NAME_TO_ID.set(k.key_name.toUpperCase(), k.id);
            });
        });

        // --- HELPERS ---
        function hexToRgb(hex) {
            if (!hex || typeof hex !== 'string') return { r: 0, g: 0, b: 0 };
            const cleanHex = hex.replace('#', '');
            return {
                r: parseInt(cleanHex.substring(0, 2), 16) || 0,
                g: parseInt(cleanHex.substring(2, 4), 16) || 0,
                b: parseInt(cleanHex.substring(4, 6), 16) || 0
            };
        }

        const mix = (c1, c2, t) => ({
            r: Math.floor(c1.r + (c2.r - c1.r) * t),
            g: Math.floor(c1.g + (c2.g - c1.g) * t),
            b: Math.floor(c1.b + (c2.b - c1.b) * t)
        });

        let tick = 0;
        const targetAddr = baseAddress.add(PRIMITIVE_RVA);
        log(`[GodMode] Engine loaded. State synced from backend.`);

        Interceptor.attach(targetAddr, {
            onEnter(args) {
                if (!state.active || state.mode === 'PASSTHROUGH') return;

                const bufferInfoPtr = args[2];
                if (bufferInfoPtr.isNull()) return;
                const dataPtr = bufferInfoPtr.readPointer();
                if (dataPtr.isNull()) return;

                if (dataPtr.readU8() === 0x07 && dataPtr.add(1).readU8() === 0xA1) {
                    tick++;

                    let cursor = dataPtr.add(HEADER_SIZE);
                    const limit = dataPtr.add(BUFFER_SIZE - BYTES_PER_KEY);

                    while (cursor < limit) {
                        const keyId = cursor.readU16();
                        if (keyId !== 0) {
                            const pos = KEY_MAP.get(keyId);
                            let r = 0, g = 0, b = 0;

                            if (pos) {
                                // === LAYER 1: BACKGROUND ===
                                // Use FLAT properties from DB schema
                                const bgMode = (state.backgroundMode || 'NONE').toUpperCase();
                                const weatherCond = (state.weather || 'CLEAR').toUpperCase();
                                const isStorming = state.stormOverride && (weatherCond === 'RAIN' || weatherCond === 'STORM');
                                const isWeatherKey = state.weatherKeys && state.weatherKeys.includes(keyId);

                                if (isStorming) {
                                    // Rain
                                    const noise = Math.sin(pos.col * 0.5 + tick * 0.1);
                                    if (noise > 0.85) { b = 255; r = 0; g = 0; }
                                    if (weatherCond === 'STORM' && Math.random() > 0.995) { r = 255; g = 255; b = 255; }
                                }
                                else if (isWeatherKey) {
                                    // Dedicated Weather Key (Always shows condition)
                                    // CLEAR=Light Blue, CLOUDS=White, RAIN=Deep Blue, STORM=Dark Purple, SNOW=Gray
                                    if (weatherCond === 'CLEAR') { r = 135; g = 206; b = 235; }
                                    else if (weatherCond === 'CLOUDS') { r = 200; g = 200; b = 200; }
                                    else if (weatherCond === 'RAIN') { r = 0; g = 0; b = 255; }
                                    else if (weatherCond === 'STORM') { r = 75; g = 0; b = 130; }
                                    else if (weatherCond === 'SNOW') { r = 128; g = 128; b = 128; }
                                    else { r = 50; g = 50; b = 50; } // Default/Unknown
                                }
                                else if (bgMode === 'TIME') {
                                    const t = Math.sin((state.timeOfDay || 0.5) * Math.PI);
                                    r = Math.floor(t * 200); g = Math.floor(t * 50); b = Math.floor(t * 100);
                                }
                                else if (bgMode === 'EFFECT') {
                                    const settings = state.effectSettings || {};
                                    const s = settings.speed || 3;
                                    const base = hexToRgb(settings.baseColor || '#0070FF');
                                    const type = (settings.effectType || 'RIPPLE').toUpperCase();

                                    if (type === 'WAVE' || type === 'RIPPLE') {
                                        const wave = Math.sin((pos.col * 0.2) + (tick * 0.05 * s));
                                        const dim = (wave + 1) / 2;
                                        r = base.r * dim; g = base.g * dim; b = base.b * dim;
                                    }
                                    else if (type === 'CHECKERBOARD' || type === 'CHECKER') {
                                        const isEven = (pos.row + pos.col) % 2 === 0;
                                        const invert = Math.floor(tick / (60 / s)) % 2 === 1;
                                        if ((isEven && !invert) || (!isEven && invert)) {
                                            r = base.r; g = base.g; b = base.b;
                                        }
                                    }
                                }

                                // === LAYER 2: CONTEXT ===
                                // (Shortcuts logic to be added)

                                // === LAYER 3: WIDGETS ===
                                // Day Bar (F1-F12)
                                if (state.widgets.dayBar?.enabled && pos.group.includes("Function")) {
                                    // F1(2) -> F12(13)
                                    const fIndex = (keyId >= 2 && keyId <= 13) ? keyId - 2 : -1;
                                    if (fIndex >= 0) {
                                        // 24 hours / 12 keys = 2 hours per key
                                        const currentHour = (state.timeOfDay || 0) * 24;
                                        const keyStart = fIndex * 2;
                                        const keyEnd = keyStart + 2;

                                        const active = hexToRgb(state.widgets.dayBar.activeColor || '#00FF00');
                                        const inactive = hexToRgb(state.widgets.dayBar.inactiveColor || '#222222');

                                        if (currentHour >= keyEnd) {
                                            // Past -> Solid Active
                                            r = active.r; g = active.g; b = active.b;
                                        } else if (currentHour >= keyStart) {
                                            // Present -> Pulse
                                            const pulse = (Math.sin(tick * 0.1) + 1) / 2; // 0-1
                                            // Blend Active and Inactive based on pulse
                                            r = active.r * pulse + inactive.r * (1 - pulse);
                                            g = active.g * pulse + inactive.g * (1 - pulse);
                                            b = active.b * pulse + inactive.b * (1 - pulse);
                                        } else {
                                            // Future -> Inactive
                                            r = inactive.r; g = inactive.g; b = inactive.b;
                                        }
                                    }
                                }

                                // Temperature
                                // console.log('temp enabled', JSON.stringify(state.widgets.temperature));
                                if (state.widgets.temperature?.enabled && state.widgets.temperature.keys?.some(k => k == keyId)) {
                                    const { value, low, high, lowColor, highColor } = state.widgets.temperature;
                                    let t = (value - low) / (high - low);
                                    if (t < 0) t = 0; if (t > 1) t = 1;

                                    // Use User-Defined Colors (Default to Blue/Red if missing)
                                    const start = hexToRgb(lowColor || '#0000FF');
                                    const end = hexToRgb(highColor || '#FF0000');

                                    // Simple Linear Mix
                                    const c = mix(start, end, t);

                                    r = c.r; g = c.g; b = c.b;
                                }

                                // === LAYER 4: INTERRUPTS ===
                                // Progress Bar
                                if (state.downloadProgress >= 0 && pos.group.includes("Number Row")) {
                                    const keyPercent = (pos.col / 13) * 100;
                                    if (keyPercent < state.downloadProgress) { g = 255; r = 0; b = 0; }
                                    else { g = 0; r = 20; b = 0; }
                                }

                                // === LAYER 5: FX ===
                                if (activeFades.has(keyId)) {
                                    let intensity = activeFades.get(keyId);
                                    const flash = 255 * intensity;
                                    r = Math.min(255, r + flash);
                                    g = Math.min(255, g + flash);
                                    b = Math.min(255, b + flash);
                                    intensity -= 0.10;
                                    if (intensity <= 0) activeFades.delete(keyId);
                                    else activeFades.set(keyId, intensity);
                                }
                            }

                            cursor.add(2).writeU8(r);
                            cursor.add(3).writeU8(g);
                            cursor.add(4).writeU8(b);
                        }
                        cursor = cursor.add(BYTES_PER_KEY);
                    }
                }
            }
        });

        // --- RPC EXPORTS ---
        return {
            enable: () => { state.active = true; log("God Mode Enabled"); },
            disable: () => { state.active = false; log("God Mode Disabled"); },

            updateState: (partialState) => {
                // Deep merge required for settings objects
                for (const key in partialState) {
                    if (typeof state[key] === 'object' && !Array.isArray(state[key]) && partialState[key] !== null) {
                        Object.assign(state[key], partialState[key]);
                    } else {
                        state[key] = partialState[key];
                    }
                }
            },

            flashKey: (keyName) => {
                const id = NAME_TO_ID.get(keyName.toUpperCase());
                if (id) activeFades.set(id, 1.0);
            }
        };
    }
})