
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
        }
    }

    // --- 2. Typing FX ---
    const runtime = state.__fxRuntime;
    const activeFades = runtime?.activeFades;

    if (activeFades?.has(keyId)) {
        // Config
        const typingFx = state.widgets?.typingFx || {};
        const style = typingFx.effectStyle || 'Bounce';
        const hexColor = typingFx.effectColor || '#FFAF00';
        const baseDecay = typingFx.intensity || 0.1;

        // Retrieve current state (Support legacy number or object storage)
        let entry = activeFades.get(keyId);
        let intensity = (typeof entry === 'number') ? entry : entry.intensity;
        let meta = (typeof entry === 'object') ? entry : {}; 

        // --- PREPARE COLOR ---
        let fxR = 0, fxG = 0, fxB = 0;
        let decayRate = baseDecay;

        if (style === 'Rainbow Sparkle') {
            // If this is the first frame (no hue saved), pick a RANDOM hue
            if (meta.hue === undefined) {
                meta.hue = Math.random(); // 0.0 to 1.0
            }

            // Use the util function: hsvToRgb(h, s, v)
            const spark = hsvToRgb(meta.hue, 1.0, 1.0);
            fxR = spark.r;
            fxG = spark.g;
            fxB = spark.b;

        } else {
            // 'Bounce' and 'Flash' use the UI selected color
            const rgb = hexToRgb(hexColor);
            fxR = rgb.r; 
            fxG = rgb.g; 
            fxB = rgb.b;

            if (style === 'Flash') {
                // Flash decays 3x faster for a strobe effect
                decayRate = baseDecay * 3.0;
            }
        }

        // --- APPLY BLENDING ---
        // Additive Blending: Base Color + (Effect Color * Intensity)
        r = Math.min(255, r + (fxR * intensity));
        g = Math.min(255, g + (fxG * intensity));
        b = Math.min(255, b + (fxB * intensity));

        // --- UPDATE STATE ---
        intensity -= decayRate;

        if (intensity <= 0) {
            activeFades.delete(keyId);
        } else {
            // If we are in Rainbow mode, we MUST store the object to keep the hue consistent
            if (style === 'Rainbow Sparkle') {
                activeFades.set(keyId, { intensity, hue: meta.hue });
            } else {
                // For others, we can just store the number (optimization)
                activeFades.set(keyId, intensity);
            }
        }
    }

    return { r, g, b };
}

return render;
