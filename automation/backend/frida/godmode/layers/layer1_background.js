function applyWeatherColor(condition) {
    switch (condition) {
        case 'CLEAR': return { r: 135, g: 206, b: 235 };
        case 'CLOUDS': return { r: 200, g: 200, b: 200 };
        case 'RAIN': return { r: 0, g: 0, b: 255 };
        case 'STORM': return { r: 75, g: 0, b: 130 };
        case 'SNOW': return { r: 128, g: 128, b: 128 };
        default: return { r: 50, g: 50, b: 50 };
    }
}

function timeToFloat(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return ((h * 60) + m) / 1440.0;
}

function render(state, pos, tick, currentColor, utils) {
    if (!pos || !state) return currentColor || { r: 0, g: 0, b: 0 };

    const { keyId } = pos;
    const { hexToRgb, hsvToRgb } = utils;

    // 1. Weather Overrides
    const weatherCond = (state.weather || 'CLEAR').toUpperCase();
    const isStorming = state.stormOverride && (weatherCond === 'RAIN' || weatherCond === 'STORM');
    const isWeatherKey = Array.isArray(state.weatherKeys) && state.weatherKeys.includes(keyId);

    if (isStorming) {
        const noise = Math.sin(pos.col * 0.5 + tick * 0.1);
        if (noise > 0.85) return { r: 0, g: 0, b: 255 };
        if (weatherCond === 'STORM' && Math.random() > 0.995) return { r: 255, g: 255, b: 255 };
        return { r: 0, g: 0, b: 0 };
    }

    if (isWeatherKey) {
        return applyWeatherColor(weatherCond);
    }

    // 2. Background Logic
    let bgMode = (state.backgroundMode || 'NONE').toUpperCase();
    // Backwards compatibility for old 'TIME' mode
    if (bgMode === 'TIME') bgMode = 'EFFECT';

    if (bgMode === 'NONE') return { r: 0, g: 0, b: 0 };

    const settings = state.effectSettings || {};
    const effectType = (settings.effectType || 'SOLID').toUpperCase();

    // Handle old 'TIME' mode migration logic implicitly
    const rawColorSource = settings.colorSource || (state.backgroundMode === 'TIME' ? 'TIME OF DAY' : 'STATIC');
    const colorSource = rawColorSource.toUpperCase();

    // Ranges between 1 and 5
    const speed = settings.speed || 3;

    // --- STEP A: DETERMINE BASE COLOR ---
    let base = { r: 0, g: 0, b: 0 };

    if (colorSource === 'TIME OF DAY' || colorSource === 'TIME') {
        // --- REAL INTERPOLATION LOGIC ---
        const gradients = state.timeGradients || [];
        const time = state.timeOfDay || 0;

        if (gradients.length > 0) {
            let startGrad = gradients[gradients.length - 1]; // Default to last entry
            let endGrad = gradients[0]; // Wrap around to first

            // Find current time slot
            for (let i = 0; i < gradients.length - 1; i++) {
                const s = timeToFloat(gradients[i].start_time);
                const e = timeToFloat(gradients[i + 1].start_time);
                if (time >= s && time < e) {
                    startGrad = gradients[i];
                    endGrad = gradients[i + 1];
                    break;
                }
            }

            // Handle last slot wrap-around
            const s = timeToFloat(startGrad.start_time);
            const e = timeToFloat(endGrad.start_time);
            let duration = e - s;
            if (duration < 0) duration += 1.0; // Wrap day

            const t = (time - s) / (duration || 1);

            const startColor = hexToRgb(startGrad.end_rgb || '#000000');
            const endColor = hexToRgb(endGrad.start_rgb || '#000000');

            // Use mix util
            base = utils.mix(startColor, endColor, t);
        } else {
            // Fallback (old pink/purple logic)
            const t = Math.sin(time * Math.PI);
            base = { r: Math.floor(t * 200), g: Math.floor(t * 50), b: Math.floor(t * 100) };
        }
    }
    else if (colorSource === 'SPECTRUM') {
        // Rainbow Cycle
        const hue = (tick * 0.005 * (speed / 3)) % 1.0;
        base = hsvToRgb(hue, 1, 1);
    }
    else {
        // Static
        base = hexToRgb(settings.baseColor || '#0070FF');
    }

    // --- STEP B: APPLY EFFECT PATTERN ---
    let dim = 1.0;

    if (effectType === 'SOLID') {
        dim = 1.0;
    }
    else if (effectType === 'WAVE') {
        // Linear Left-to-Right Scan
        // (pos.col * 0.25) defines the width of the wave (approx 1 full wave across keyboard)
        // (tick * 0.1 * speed) moves the wave. Subtracting time makes it flow Right.
        const val = Math.sin((pos.col * 0.25) - (tick * 0.1 * speed));

        // Normalize sine (-1 to 1) to brightness (0 to 1)
        dim = (val + 1) / 2;
    }
    else if (effectType === 'RIPPLE') {
        // Circular/Radial Expansion
        // Hardcoded center approx (Col 11, Row 3.5) fits most TKL/Full keyboards
        const cx = 11;
        const cy = 4;
        const dx = pos.col - cx;
        const dy = pos.row - cy;

        // Pythagorean distance from center
        const dist = Math.sqrt(dx * dx + dy * dy);

        // (dist * 0.4) controls ring tightness
        // Subtracting time makes the rings expand OUTWARD
        const val = Math.sin((dist * 0.4) - (tick * 0.1 * speed));

        dim = (val + 1) / 2;
    }
    else if (effectType === 'FADE' || effectType === 'BREATHING') {
        const pulse = Math.sin(tick * 0.02 * speed);
        dim = (pulse + 1) / 2;
    }
    else if (effectType === 'CHECKERBOARD' || effectType === 'CHECKER') {
        // 1. Define the checker pattern: 1 vs -1
        // This determines which "Group" the key belongs to (Black vs White)
        const patternSign = ((pos.row + pos.col) % 2 === 0) ? 1 : -1;

        // 2. Determine "Sharpness" based on speed (Range 1-5)
        // Speed 1 = Soft Sine Wave (Gain ~1.5)
        // Speed 5 = Hard Square Wave (Gain ~55)
        // We use Math.pow to make the high speeds get aggressive quickly
        const sharpness = 0.5 + Math.pow(speed, 2.5);

        // 3. Oscillate
        // Standard Sine wave driven by time
        const rawWave = Math.sin(tick * 0.05 * speed);

        // 4. Apply Sharpness & Clamp
        // Multiplying the sine wave makes the slope vertical (instant snap).
        // Clamping limits it so it doesn't exceed valid brightness ranges.
        let wave = rawWave * sharpness;
        wave = Math.max(-1, Math.min(1, wave));

        // 5. Combine
        // If wave is +1 and pattern is +1, result is 1 (Bright)
        // If wave is -1 and pattern is +1, result is -1 (Dark)
        // Normalizing ((-1 to 1) + 1) / 2  ->  0.0 to 1.0
        dim = ((wave * patternSign) + 1) / 2;
    }
    else if (effectType === 'SONAR') {
        const dx = pos.col - 10;
        const dy = pos.row - 3;
        const angle = Math.atan2(dy, dx);
        const sweep = (tick * 0.05 * speed) % (Math.PI * 2);
        let diff = Math.abs(angle - (sweep - Math.PI));
        if (diff > Math.PI) diff = (2 * Math.PI) - diff;
        dim = (diff < 0.5) ? (1.0 - (diff * 2)) : 0.0;
    }
    else if (effectType === 'RAINDROPS') {
        // 1. Create a pseudo-random offset per column so they don't fall in sync.
        // We use Math.sin on the column index to get a deterministic "random" number.
        const colOffset = Math.sin(pos.col * 9999) * 100;

        // 2. Calculate "Time" vertically. 
        // (tick * speed) moves the drop down. Subtracting pos.row makes it relate to physical space.
        const verticalFlow = (tick * 0.2 * speed) + colOffset - pos.row;

        // 3. Wrap the space to create repeating drops.
        // 'spacing' is the vertical distance between drops in the same column.
        const spacing = 20;
        // Modulo math to create the loop. The extra logic ensures positive results.
        const posInCycle = ((verticalFlow % spacing) + spacing) % spacing;

        // 4. Draw the Drop
        const tailLength = 8; // How long the trail is

        if (posInCycle < tailLength) {
            // 0 is the head (brightest), tailLength is the end (darkest)
            const brightness = 1.0 - (posInCycle / tailLength);
            // Square it (brightness^2) for a nicer "liquid" fade
            dim = brightness * brightness;
        } else {
            dim = 0.0;
        }
    }
    else if (effectType === 'PULSE') {
        const dx = pos.col - 10;
        const dy = pos.row - 3;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const pulseSize = 5 + Math.sin(tick * 0.05 * speed) * 2;
        dim = (dist < pulseSize) ? 1.0 : Math.max(0, 1.0 - ((dist - pulseSize) * 0.2));
    }

    return {
        r: Math.floor(base.r * dim),
        g: Math.floor(base.g * dim),
        b: Math.floor(base.b * dim)
    };
}

return render;