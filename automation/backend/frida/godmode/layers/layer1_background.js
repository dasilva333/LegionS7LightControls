(function () {
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
    
    const speed = settings.speed || 3;

    // --- STEP A: DETERMINE BASE COLOR ---
    let base = { r: 0, g: 0, b: 0 };

    if (colorSource === 'TIME OF DAY' || colorSource === 'TIME') {
        // Time Gradient Logic
        const t = Math.sin((state.timeOfDay || 0.5) * Math.PI);
        // Note: For full implementation, this should interpolate between user-defined gradients
        // For now, using the placeholder logic until we inject the full gradient array
        base = {
            r: Math.floor(t * 200),
            g: Math.floor(t * 50),
            b: Math.floor(t * 100)
        };
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
    else if (effectType === 'WAVE' || effectType === 'RIPPLE') {
        const wave = Math.sin((pos.col * 0.2) + (tick * 0.05 * speed));
        dim = (wave + 1) / 2;
    } 
    else if (effectType === 'FADE' || effectType === 'BREATHING') {
        const pulse = Math.sin(tick * 0.02 * speed);
        dim = (pulse + 1) / 2;
    } 
    else if (effectType === 'CHECKERBOARD' || effectType === 'CHECKER') {
        const isEven = (pos.row + pos.col) % 2 === 0;
        const invert = Math.floor(tick / (60 / speed)) % 2 === 1;
        dim = ((isEven && !invert) || (!isEven && invert)) ? 1.0 : 0.0;
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
        const seed = Math.floor(tick / (20 / speed)) * 1000 + pos.keyId;
        const rand = Math.sin(seed) * 10000;
        const isDrop = (rand - Math.floor(rand)) > 0.98;
        const subTick = tick % (20 / speed);
        dim = isDrop ? 1.0 : Math.max(0, 1.0 - (subTick * 0.1));
    }
    else if (effectType === 'HEATMAP') {
        const dx = pos.col - 10;
        const dy = pos.row - 3;
        const dist = Math.sqrt(dx*dx + dy*dy);
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
})();