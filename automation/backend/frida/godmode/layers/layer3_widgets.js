function render(state, pos, tick, currentColor, utils) {
    if (!pos || !state?.widgets) return currentColor;
    let { r, g, b } = currentColor; // Start with the background color
    const { keyId } = pos;
    const { hexToRgb, mix } = utils;

    // Day Bar
    const dayBar = state.widgets.dayBar;
    if (dayBar?.enabled && pos.group?.includes('Function')) {
        const fIndex = (keyId >= 2 && keyId <= 13) ? keyId - 2 : -1;
        if (fIndex >= 0) {
            const currentHour = (state.timeOfDay || 0) * 24;
            const keyStart = fIndex * 2;
            const keyEnd = keyStart + 2;
            const active = hexToRgb(dayBar.activeColor || '#00FF00');
            const inactive = hexToRgb(dayBar.inactiveColor || '#222222');

            if (currentHour >= keyEnd) {
                r = active.r; g = active.g; b = active.b;
            } else if (currentHour >= keyStart && currentHour < keyEnd) {
                // const progress = (currentHour - keyStart) / 2;
                // const pulse = Math.abs(Math.sin(tick * 0.05)) * (progress / 2);
                // r = active.r * pulse + inactive.r * (1 - pulse);
                // g = active.g * pulse + inactive.g * (1 - pulse);
                // b = active.b * pulse + inactive.b * (1 - pulse);
                // PRESENT: Breathe between Active and Inactive
                // Math.sin goes -1 to 1. We map to 0.0 to 1.0.
                const t = (Math.sin(tick * 0.05) + 1) / 2; 
                
                r = Math.floor(active.r * t + inactive.r * (1 - t));
                g = Math.floor(active.g * t + inactive.g * (1 - t));
                b = Math.floor(active.b * t + inactive.b * (1 - t));
            } else {
                r = inactive.r; g = inactive.g; b = inactive.b;
            }
        }
    }

    // Temperature
    const tempWidget = state.widgets.temperature;
    if (tempWidget?.enabled && Array.isArray(tempWidget.keys) && tempWidget.keys.some(k => k == keyId)) {
        const { value = 0, low = 0, high = 100, lowColor, highColor } = tempWidget;
        let t = (value - low) / (high - low || 1);
        if (t < 0) t = 0; if (t > 1) t = 1;
        
        const start = hexToRgb(lowColor || '#0000FF');
        const end = hexToRgb(highColor || '#FF0000');
        const mixed = mix(start, end, t);
        r = mixed.r; g = mixed.g; b = mixed.b;
    }

    return { r, g, b };
}

return render;