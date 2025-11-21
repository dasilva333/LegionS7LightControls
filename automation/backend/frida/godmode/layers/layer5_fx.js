
  function render(state, pos, _tick, currentColor) {
    if (!pos || !state) return currentColor || { r: 0, g: 0, b: 0 };
    let { r, g, b } = currentColor || { r: 0, g: 0, b: 0 };
    const { keyId } = pos;

   // --- 1. Audio FX ---
    const audioFx = state.widgets?.audioFx;
    const audioMode = audioFx?.mode || 'Rows (Loudness)'; // Default
    const audioPeak = state.fx?.audioPeak || 0;
    const audioBands = state.fx?.audioBands || [0,0,0,0,0,0];

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
                    switch(pos.row) {
                        case 5: // Sub
                            r=0; g=255; b=255; break; // Cyan
                        case 4: // Bass
                            r=0; g=0; b=255; break;   // Blue
                        case 3: // Low Mid
                            r=0; g=255; b=0; break;   // Green
                        case 2: // Mid
                            r=255; g=255; b=0; break; // Yellow
                        case 1: // High Mid
                            r=255; g=165; b=0; break; // Orange
                        case 0: // Treble
                            r=255; g=0; b=0; break;   // Red
                    }
                }
            }
        }
    }

    // --- 2. Typing FX ---
    const runtime = state.__fxRuntime;
    const activeFades = runtime?.activeFades;

    if (activeFades?.has(keyId)) {
        let intensity = activeFades.get(keyId);
        const flash = 255 * intensity;
        
        r = Math.min(255, r + flash);
        g = Math.min(255, g + flash);
        b = Math.min(255, b + flash);

        const typingFx = state.widgets?.typingFx || {};
        const decayRate = typingFx.intensity || 0.1; // Support dynamic decay if config exists

        intensity -= decayRate;
        if (intensity <= 0) activeFades.delete(keyId);
        else activeFades.set(keyId, intensity);
    }

    return { r, g, b };
  }

  return render;
