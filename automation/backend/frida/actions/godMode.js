({
    name: 'godMode',
    dependencies: {
        // No new native functions needed, we hook an address directly
    },
    action: (context) => {
        const { baseAddress, log, keyGroups } = context;
        
        // --- CONFIGURATION ---
        const PRIMITIVE_RVA = 0x209b0;
        const HEADER_SIZE = 4;
        const BYTES_PER_KEY = 5;
        const BUFFER_SIZE = 960;

        // --- STATE (Modified by RPC) ---
        const state = {
            active: false,
            mode: 'DEFAULT', // DEFAULT, PASSTHROUGH
            weather: 'CLEAR', // CLEAR, RAIN, STORM
            timeOfDay: 0.5,   // 0.0 - 1.0 (Noon)
            cpuTemp: 0,       // 0 - 100
            downloadProgress: -1, // -1 = Off, 0-100 = Active
            alerts: []        // List of active transient alerts
        };

        // --- FX STATE (New) ---
        // Map<KeyID, Opacity(0.0-1.0)>
        const activeFades = new Map();

        // --- GEOMETRY PRE-CALC ---
        const KEY_MAP = new Map();     // ID -> {row, col}
        const NAME_TO_ID = new Map();  // "Q" -> ID
        
        // Note: keyGroups is the raw array injected by loader, no need for [0]
        keyGroups.forEach(group => {
            group.keys.forEach(k => {
                const meta = { row: k.row, col: k.col, group: group.group_name };
                KEY_MAP.set(k.id, meta);
                // Normalize name for lookup (e.g. "Q" -> 66)
                if(k.key_name) NAME_TO_ID.set(k.key_name.toUpperCase(), k.id);
            });
        });

        // --- RENDERER HELPERS ---
        function hsvToRgb(h, s, v) {
            let r, g, b;
            const i = Math.floor(h * 6);
            const f = h * 6 - i;
            const p = v * (1 - s);
            const q = v * (1 - f * s);
            const t = v * (1 - (1 - f) * s);
            switch (i % 6) {
                case 0: r = v; g = t; b = p; break;
                case 1: r = q; g = v; b = p; break;
                case 2: r = p; g = v; b = t; break;
                case 3: r = p; g = q; b = v; break;
                case 4: r = t; g = p; b = v; break;
                case 5: r = v; g = p; b = q; break;
            }
            return { r: Math.floor(r * 255), g: Math.floor(g * 255), b: Math.floor(b * 255) };
        }

        let tick = 0;

        // --- THE HOOK ---
        const targetAddr = baseAddress.add(PRIMITIVE_RVA);
        log(`[GodMode] Engine loaded. Hooking ${targetAddr}...`);

        Interceptor.attach(targetAddr, {
            onEnter(args) {
                if (!state.active || state.mode === 'PASSTHROUGH') return;

                const bufferInfoPtr = args[2];
                if (bufferInfoPtr.isNull()) return;
                const dataPtr = bufferInfoPtr.readPointer();
                if (dataPtr.isNull()) return;

                // Verify Aurora Sync Header
                const h0 = dataPtr.readU8();
                const h1 = dataPtr.add(1).readU8();

                if (h0 === 0x07 && h1 === 0xA1) {
                    tick++;
                    
                    let cursor = dataPtr.add(HEADER_SIZE);
                    const limit = dataPtr.add(BUFFER_SIZE - BYTES_PER_KEY);

                    while (cursor < limit) {
                        const keyId = cursor.readU16();
                        if (keyId !== 0) {
                            const pos = KEY_MAP.get(keyId);
                            
                            // Default: Black
                            let r = 0, g = 0, b = 0;

                            if (pos) {
                                // === LAYER 1: BACKGROUND (Time of Day / Weather) ===
                                if (state.weather === 'RAIN') {
                                    // Matrix Rain Effect
                                    const noise = Math.sin(pos.col * 0.5 + tick * 0.1);
                                    if (noise > 0.8) { b = 255; r = 0; g = 0; } // Blue drops
                                } else {
                                    // Time Gradient
                                    const brightness = Math.sin(state.timeOfDay * Math.PI);
                                    b = Math.floor(60 * brightness); // Deep Blue base
                                    g = Math.floor(20 * brightness);
                                    r = 10;
                                }

                                // === LAYER 2: WIDGETS ===
                                if (pos.group.includes("Bottom Modifiers") && (pos.col > 15)) {
                                    r = Math.floor((state.cpuTemp / 100) * 255);
                                    b = 255 - r;
                                    g = 0;
                                }

                                // === LAYER 3: INTERRUPTS ===
                                if (state.downloadProgress >= 0 && pos.group.includes("Number Row")) {
                                    const keyPercent = (pos.col / 13) * 100;
                                    if (keyPercent < state.downloadProgress) {
                                        g = 255; r = 0; b = 0; 
                                    } else {
                                        g = 0; r = 20; b = 0; 
                                    }
                                }

                                // === LAYER 4: TRANSIENT FX (The Lightning) ===
                                if (activeFades.has(keyId)) {
                                    let intensity = activeFades.get(keyId);
                                    
                                    // Additive Blending (White Flash)
                                    const flash = 255 * intensity;
                                    r = Math.min(255, r + flash);
                                    g = Math.min(255, g + flash);
                                    b = Math.min(255, b + flash);

                                    // Decay the flash
                                    intensity -= 0.08; // Fade speed
                                    if (intensity <= 0) {
                                        activeFades.delete(keyId);
                                    } else {
                                        activeFades.set(keyId, intensity);
                                    }
                                }
                            }

                            // Apply Color
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
                Object.assign(state, partialState);
            },
            
            // NEW: This allows the lightningDemo.js to call us
            flashKey: (keyName) => {
                const id = NAME_TO_ID.get(keyName.toUpperCase());
                if (id) {
                    activeFades.set(id, 1.0); // 1.0 = Full Brightness
                }
            }
        };
    }
})