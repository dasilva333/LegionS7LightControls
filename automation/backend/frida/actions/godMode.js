({
    name: 'godMode',
    dependencies: {},
    action: (context) => {
        const { baseAddress, log, keyGroups } = context;
        
        const PRIMITIVE_RVA = 0x209b0;
        const HEADER_SIZE = 4;
        const BYTES_PER_KEY = 5;
        const BUFFER_SIZE = 960;

        // --- 1. THE STATE STORE ---
        // This mirrors the structure the Frontend/Node.js will send.
        const state = {
            active: false,
            mode: 'DEFAULT', // 'DEFAULT', 'PASSTHROUGH' (Gaming)

            // Layer 1: Environment
            background: {
                mode: 'NONE', // 'NONE', 'TIME', 'EFFECT'
                effectType: 'WAVE', // 'RIPPLE', 'WAVE', 'FADE', 'CHECKER'
                baseColor: { r: 0, g: 255, b: 255 },
                speed: 1,
                timeGradients: [ 
                    // Expected: { startTime: 0.0, color: {r,g,b} } (Sorted)
                ], 
                currentTime: 0.5 // 0.0 - 1.0
            },
            weather: {
                condition: 'CLEAR', // 'CLEAR', 'RAIN', 'STORM'
                stormOverride: false,
                dedicatedKeys: [] // List of KeyIDs
            },

            // Layer 2: Context
            shortcuts: [], // List of { keyId, color: {r,g,b} }

            // Layer 3: Widgets
            widgets: {
                dayBar: { enabled: false, activeColor: {r:0,g:255,b:0}, inactiveColor: {r:20,g:20,b:20} },
                temperature: { enabled: false, value: 0, low: 0, high: 100, keys: [] }
            },

            // Layer 4: Interrupts
            interrupts: {
                progress: { enabled: false, value: 0, startKey: 0, endKey: 0, startColor: {r:0,g:255,b:0}, endColor: {r:255,g:0,b:0} },
                safety: { enabled: false, active: false, color: {r:255,g:0,b:0}, keys: [] }
            },
            
            // Layer 5: FX (Transient)
            fx: {
                audioPeak: 0 // 0.0 - 1.0
            }
        };

        // --- 2. INTERNAL HELPERS ---
        const KEY_MAP = new Map();
        const NAME_TO_ID = new Map();
        const ACTIVE_FADES = new Map(); // For Type Lightning
        let tick = 0;

        // Build Geometry
        keyGroups.forEach(group => {
            group.keys.forEach(k => {
                const meta = { row: k.row, col: k.col, group: group.group_name, id: k.id };
                KEY_MAP.set(k.id, meta);
                if(k.key_name) NAME_TO_ID.set(k.key_name.toUpperCase(), k.id);
            });
        });

        // Color Math Helpers
        const mix = (c1, c2, t) => ({
            r: Math.floor(c1.r + (c2.r - c1.r) * t),
            g: Math.floor(c1.g + (c2.g - c1.g) * t),
            b: Math.floor(c1.b + (c2.b - c1.b) * t)
        });

        const getGradientColor = (time, gradients) => {
            if (!gradients || gradients.length === 0) return { r: 0, g: 0, b: 0 };
            // Logic to find start/end indices based on time
            // Simplified: Default to Blue if no gradients passed
            // (Full interpolation logic is heavy, assume Node sends current interpolated color? 
            //  No, Node sends time. We interpolate here for smoothness.)
            
            // Fallback implementation for brevity:
            // Find the slot we are in
            // This requires the array to be sorted by startTime
            let start = gradients[gradients.length - 1];
            let end = gradients[0];
            
            for (let i = 0; i < gradients.length - 1; i++) {
                if (time >= gradients[i].startTime && time < gradients[i + 1].startTime) {
                    start = gradients[i];
                    end = gradients[i + 1];
                    break;
                }
            }
            
            // Handle wrap-around (Midnight)
            // Calc T (0.0 - 1.0) between start and end
            // ... (Math omitted for brevity, can assume linear mix for V1)
            return start.color || { r: 0, g: 0, b: 50 }; 
        };


        // --- 3. THE RENDER LOOP ---
        const targetAddr = baseAddress.add(PRIMITIVE_RVA);
        log(`[GodMode] Engine v2 loaded.`);

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
                            
                            // Start Black
                            let finalColor = { r: 0, g: 0, b: 0 };

                            if (pos) {
                                // === LAYER 1: BACKGROUND ===
                                const isStorming = state.weather.stormOverride && 
                                                  (state.weather.condition === 'RAIN' || state.weather.condition === 'STORM');

                                if (isStorming) {
                                    // Rain Effect
                                    const noise = Math.sin(pos.col * 0.5 + tick * (0.1 * state.background.speed));
                                    if (noise > 0.85) finalColor = { r: 0, g: 0, b: 255 };
                                    if (state.weather.condition === 'STORM' && Math.random() > 0.995) finalColor = {r:255,g:255,b:255}; // Lightning
                                } 
                                else if (state.background.mode === 'TIME') {
                                    // Use simplified Time logic or gradient lookup
                                    // Temp: Simple Blue->Pink cycle based on time
                                    const t = Math.sin(state.background.currentTime * Math.PI);
                                    finalColor = { r: Math.floor(t*200), g: Math.floor(t*50), b: Math.floor(t*100) };
                                }
                                else if (state.background.mode === 'EFFECT') {
                                    const s = state.background.speed || 1;
                                    const base = state.background.baseColor || {r:0,g:255,b:0};
                                    
                                    if (state.background.effectType === 'WAVE') {
                                        const wave = Math.sin((pos.col * 0.2) + (tick * 0.05 * s));
                                        const dim = (wave + 1) / 2; // 0.0 - 1.0
                                        finalColor = { r: base.r * dim, g: base.g * dim, b: base.b * dim };
                                    }
                                    else if (state.background.effectType === 'CHECKER') {
                                        const isEven = (pos.row + pos.col) % 2 === 0;
                                        const invert = Math.floor(tick / (30/s)) % 2 === 1;
                                        if ((isEven && !invert) || (!isEven && invert)) finalColor = base;
                                    }
                                }

                                // === LAYER 2: CONTEXT (Shortcuts) ===
                                // Simple array scan (optimized by map in future)
                                const shortcut = state.shortcuts.find(s => s.keyId === keyId);
                                if (shortcut) {
                                    finalColor = shortcut.color;
                                }

                                // === LAYER 3: WIDGETS ===
                                
                                // Day Bar (F-Row)
                                if (state.widgets.dayBar.enabled && pos.group.includes("Function")) {
                                    // F1(2) to F12(13) -> Index 0 to 11
                                    const fIndex = (keyId >= 2 && keyId <= 13) ? keyId - 2 : -1;
                                    if (fIndex >= 0) {
                                        // 24 hours / 12 keys = 2 hours per key
                                        // currentTime (0.0-1.0) * 24 = Hours
                                        const currentHour = state.background.currentTime * 24;
                                        const keyHourStart = fIndex * 2;
                                        
                                        if (currentHour >= keyHourStart + 2) {
                                            finalColor = state.widgets.dayBar.activeColor; // Passed
                                        } else if (currentHour >= keyHourStart) {
                                            // Active segment (Pulse)
                                            const p = Math.sin(tick * 0.1);
                                            finalColor = state.widgets.dayBar.activeColor; // Todo: Dim it
                                        } else {
                                            finalColor = state.widgets.dayBar.inactiveColor;
                                        }
                                    }
                                }

                                // Temperature (Nav/Arrows)
                                if (state.widgets.temperature.enabled && state.widgets.temperature.keys.includes(keyId)) {
                                    const { value, low, high } = state.widgets.temperature;
                                    // Normalize T (0.0 - 1.0)
                                    let t = (value - low) / (high - low);
                                    if (t < 0) t = 0; if (t > 1) t = 1;
                                    
                                    // Blue -> Green -> Red
                                    if (t < 0.5) {
                                        finalColor = mix({r:0,g:0,b:255}, {r:0,g:255,b:0}, t * 2);
                                    } else {
                                        finalColor = mix({r:0,g:255,b:0}, {r:255,g:0,b:0}, (t - 0.5) * 2);
                                    }
                                }

                                // === LAYER 4: INTERRUPTS ===
                                
                                // Progress Bar (Number Row)
                                if (state.interrupts.progress.enabled && pos.group.includes("Number Row")) {
                                    const pct = state.interrupts.progress.value; // 0-100
                                    // Map columns 0-13 approx
                                    const keyPct = (pos.col / 13) * 100;
                                    
                                    if (keyPct < pct) {
                                        finalColor = state.interrupts.progress.startColor; // Or interpolate to EndColor
                                    } else {
                                        finalColor = { r:10, g:10, b:10 }; // Dim track
                                    }
                                }
                                
                                // Safety Monitor (Strobe)
                                if (state.interrupts.safety.enabled && state.interrupts.safety.active) {
                                    // Global Strobe Red
                                    const strobe = Math.floor(tick / 10) % 2 === 0;
                                    if (state.interrupts.safety.keys.length === 0 || state.interrupts.safety.keys.includes(keyId)) {
                                        if (strobe) finalColor = state.interrupts.safety.color;
                                    }
                                }

                                // === LAYER 5: TRANSIENT FX ===
                                
                                // Type Lightning
                                if (ACTIVE_FADES.has(keyId)) {
                                    let intensity = ACTIVE_FADES.get(keyId);
                                    const flash = 255 * intensity;
                                    
                                    // Additive
                                    finalColor.r = Math.min(255, finalColor.r + flash);
                                    finalColor.g = Math.min(255, finalColor.g + flash);
                                    finalColor.b = Math.min(255, finalColor.b + flash);

                                    intensity -= 0.05;
                                    if (intensity <= 0) ACTIVE_FADES.delete(keyId);
                                    else ACTIVE_FADES.set(keyId, intensity);
                                }
                            }

                            cursor.add(2).writeU8(finalColor.r);
                            cursor.add(3).writeU8(finalColor.g);
                            cursor.add(4).writeU8(finalColor.b);
                        }
                        cursor = cursor.add(BYTES_PER_KEY);
                    }
                }
            }
        });

        return {
            enable: () => { state.active = true; log("God Mode Enabled"); },
            disable: () => { state.active = false; log("God Mode Disabled"); },
            
            // DEEP MERGE HELPER
            // The backend sends partial state trees. We must merge them carefully.
            updateState: (partialState) => {
                // Simple recursive merge or flat assignment based on structure
                // For now, we assume the backend sends structured replacement objects per key
                // e.g. updateState({ weather: { ... } }) replaces the whole weather object?
                // Better: Use Object.assign for top keys.
                
                for (const key in partialState) {
                    if (typeof state[key] === 'object' && !Array.isArray(state[key])) {
                        Object.assign(state[key], partialState[key]);
                    } else {
                        state[key] = partialState[key];
                    }
                }
                // log("State Updated");
            },

            flashKey: (keyName) => {
                const id = NAME_TO_ID.get(keyName.toUpperCase());
                if (id) ACTIVE_FADES.set(id, 1.0);
            }
        };
    }
})