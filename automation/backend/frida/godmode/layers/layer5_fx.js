function render(state, pos, _tick, currentColor) {
    if (!pos || !state) return currentColor || { r: 0, g: 0, b: 0 };
    let { r, g, b } = currentColor || { r: 0, g: 0, b: 0 };
    const { keyId } = pos;

    // --- 1. Audio FX ---
    const audioFx = state.widgets?.audioFx;
    const audioMode = audioFx?.mode;
    const audioPeak = state.fx?.audioPeak || 0;

    if (audioFx?.enabled && audioMode === 'Rows (Loudness)') {
        const threshold = audioPeak * 22;
        if (pos.col < threshold) {
            const t = pos.col / 22;
            let ar = 0, ag = 0, ab = 0;

            if (t < 0.5) {
                ar = Math.floor((t * 2) * 255); ag = 255;
            } else {
                ar = 255; ag = Math.floor((1 - (t - 0.5) * 2) * 255);
            }
            // Audio overwrites previous layers
            r = ar; g = ag; b = ab;
        }
    }

    // --- 2. Typing FX (Additive) ---
    const runtime = state.__fxRuntime;
    const activeFades = runtime?.activeFades;

    if (activeFades?.has(keyId)) {
        let intensity = activeFades.get(keyId);
        const flash = 255 * intensity;

        r = Math.min(255, r + flash);
        g = Math.min(255, g + flash);
        b = Math.min(255, b + flash);

        const typingFx = state.widgets?.typingFx || {};
        const decayRate = typingFx.intensity || 0.1;

        intensity -= decayRate;
        if (intensity <= 0) activeFades.delete(keyId);
        else activeFades.set(keyId, intensity);
    }

    return { r, g, b };
}

return render;