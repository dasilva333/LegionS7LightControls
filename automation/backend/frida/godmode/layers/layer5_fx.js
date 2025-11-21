
function render(state, pos, tick, currentColor, utils) {
    if (!pos || !state) return currentColor || { r: 0, g: 0, b: 0 };
    let { r, g, b } = currentColor || { r: 0, g: 0, b: 0 };
    const { keyId } = pos;

    const { hexToRgb, mix, hsvToRgb } = utils;

    // --- 1. Audio FX ---
    const audioFx = state.widgets?.audioFx;
    const audioMode = audioFx?.mode || 'Rows (Loudness)'; // Default
    const audioPeak = state.fx?.audioPeak || 0;
    const audioBands = state.fx?.audioBands || [0, 0, 0, 0, 0, 0];

    if (audioFx?.enabled) {

        if (audioMode === 'Rows (Loudness)') {
            // --- STANDARD RMS LOGIC ---
            // Uses audioPeak (0.0 - 1.0)
            const threshold = audioPeak * 22; // 22 is standard keyboard width

            if (pos.col < threshold) {
                const t = pos.col / 22;
                // Gradient: Green -> Yellow -> Red
                if (t < 0.5) {
                    r = Math.floor((t * 2) * 255);
                    g = 255;
                    b = 0;
                } else {
                    r = 255;
                    g = Math.floor((1 - (t - 0.5) * 2) * 255);
                    b = 0;
                }
            }
        }
        else if (audioMode === 'Rows (EQ)') {
            // --- EQ FFT LOGIC ---
            // Uses audioBands array [Sub, Bass, LoMid, Mid, HiMid, Treb]

            // Map Physical Row to Band Index
            // Row 5 (Bottom/Ctrl) -> Band 0 (Sub)
            // Row 0 (Top/F-Keys)  -> Band 5 (Treble)
            const bandIndex = 5 - pos.row;

            if (bandIndex >= 0 && bandIndex < 6) {
                const level = audioBands[bandIndex];
                const threshold = level * 22; // Scale 0.0-1.0 to column width

                if (pos.col < threshold) {
                    // Fixed Colors per Frequency Band (Rainbow rows)
                    switch (pos.row) {
                        case 5: // Sub
                            r = 0; g = 255; b = 255; break; // Cyan
                        case 4: // Bass
                            r = 0; g = 0; b = 255; break;   // Blue
                        case 3: // Low Mid
                            r = 0; g = 255; b = 0; break;   // Green
                        case 2: // Mid
                            r = 255; g = 255; b = 0; break; // Yellow
                        case 1: // High Mid
                            r = 255; g = 165; b = 0; break; // Orange
                        case 0: // Treble
                            r = 255; g = 0; b = 0; break;   // Red
                    }
                }
            }
        }else if (audioMode === 'Rows (Hybrid)') {
            // --- HYBRID LOGIC (Lenovo Style) ---
            // Row 0 (Top/F-Keys): RMS Loudness Meter
            // Rows 1-5 (Num to Space): 5-Band EQ

            if (pos.row === 0) {
                // --- TOP ROW: RMS LOUDNESS ---
                const threshold = audioPeak * 22;
                
                if (pos.col < threshold) {
                    const t = pos.col / 22;
                    // Standard Meter Gradient (Green -> Yellow -> Red)
                    if (t < 0.5) { 
                        r = Math.floor((t * 2) * 255); 
                        g = 255; 
                        b = 0; 
                    } else { 
                        r = 255; 
                        g = Math.floor((1 - (t - 0.5) * 2) * 255); 
                        b = 0; 
                    }
                }
            } 
            else {
                // --- BOTTOM 5 ROWS: EQ BANDS ---
                // Map Row 5 (Bottom) -> Band 0 (Sub)
                // Map Row 1 (Numbers) -> Band 4 (High Mid)
                const bandIndex = 5 - pos.row;

                // We only use bands 0-4 from our 6-band array
                if (bandIndex >= 0 && bandIndex < 5) {
                    const level = audioBands[bandIndex];
                    const threshold = level * 22;

                    if (pos.col < threshold) {
                        // Fixed Colors per Frequency Band
                        switch (pos.row) {
                            case 5: r = 0;   g = 255; b = 255; break; // Sub (Cyan)
                            case 4: r = 0;   g = 0;   b = 255; break; // Bass (Blue)
                            case 3: r = 0;   g = 255; b = 0;   break; // Lo-Mid (Green)
                            case 2: r = 255; g = 255; b = 0;   break; // Mid (Yellow)
                            case 1: r = 255; g = 0;   b = 0;   break; // Hi-Mid (Red)
                        }
                    }
                }
            }
        }
    }

    // --- 2. Typing FX ---
     const runtime = state.__fxRuntime;
    const activeFades = runtime?.activeFades;

    // Only process if this specific key has an active effect
    if (activeFades?.has(keyId)) {
        
        // --- CONFIG ---
        const typingFx = state.widgets?.typingFx || {};
        const style = typingFx.effectStyle || 'Bounce';
        const hexColor = typingFx.effectColor || '#FFAF00';
        // baseDecay comes from the UI slider (usually 0.1)
        const baseDecay = typingFx.intensity || 0.1;

        // --- RETRIEVE KEY STATE ---
        let entry = activeFades.get(keyId);
        // Normalize storage (Handle simple number vs complex object)
        let intensity = (typeof entry === 'number') ? entry : entry.intensity;
        let meta = (typeof entry === 'object') ? entry : {}; 

        // Variables for result
        let fxR = 0, fxG = 0, fxB = 0;
        let decayRate = baseDecay;

        // --- MODE LOGIC ---
        if (style === 'Heatmap') {
            // 1. HEATMAP COLOR LOGIC
            // Map Intensity (0.0 - 1.0) to Gradient: Blue -> Yellow -> Red
            
            const colLow = { r: 135, g: 206, b: 250 };  // Light Sky Blue
            const colMed = { r: 255, g: 255, b: 224 };  // Light Yellow
            const colHigh = { r: 255, g: 0, b: 0 };     // Pure Red

            let heatColor;
            
            if (intensity < 0.5) {
                // First Half: Blue -> Yellow
                // Map 0.0-0.5 to 0.0-1.0
                const t = intensity * 2; 
                heatColor = mix(colLow, colMed, t);
            } else {
                // Second Half: Yellow -> Red
                // Map 0.5-1.0 to 0.0-1.0
                const t = (intensity - 0.5) * 2;
                heatColor = mix(colMed, colHigh, t);
            }

            fxR = heatColor.r;
            fxG = heatColor.g;
            fxB = heatColor.b;

            // 2. SLOW DECAY LOGIC
            // We want it to last ~5 seconds.
            // Normal decay (0.1) is fast. We scale it down significantly.
            decayRate = baseDecay * 0.05; 

        } 
        else if (style === 'Rainbow Sparkle') {
            // 1. Generate Hue if needed
            if (meta.hue === undefined) meta.hue = Math.random();
            
            // 2. Convert to RGB
            const spark = hsvToRgb(meta.hue, 1.0, 1.0);
            fxR = spark.r; fxG = spark.g; fxB = spark.b;
        } 
        else {
            // Standard 'Bounce' or 'Flash'
            const rgb = hexToRgb(hexColor);
            fxR = rgb.r; fxG = rgb.g; fxB = rgb.b;

            if (style === 'Flash') {
                decayRate = baseDecay * 3.0; // Fast decay
            }
        }

        // --- BLENDING ---
        // Additive blending: Base Color + (Effect * Intensity)
        r = Math.min(255, r + (fxR * intensity));
        g = Math.min(255, g + (fxG * intensity));
        b = Math.min(255, b + (fxB * intensity));

        // --- UPDATE STATE ---
        intensity -= decayRate;

        if (intensity <= 0) {
            activeFades.delete(keyId);
        } else {
            // Save back to state
            if (style === 'Rainbow Sparkle') {
                activeFades.set(keyId, { intensity, hue: meta.hue });
            } else if (style === 'Heatmap') {
                // Heatmap also uses object storage in case we want to add metadata later
                activeFades.set(keyId, { intensity });
            } else {
                // Optimization for simple modes
                activeFades.set(keyId, intensity);
            }
        }
    }

    return { r, g, b };
}

return render;
