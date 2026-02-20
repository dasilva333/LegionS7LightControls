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
    if (!pos || !state?.widgets) return currentColor;
    let { r, g, b } = currentColor; // Start with the background color
    const { keyId } = pos;
    const { hexToRgb, mix } = utils;

    // Day Bar
    const dayBar = state.widgets.dayBar;
    // console.log('dayBar ' + JSON.stringify(dayBar));
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
                const progress = (currentHour - keyStart) / 2;
                const pulse = Math.abs(Math.sin(tick * 0.05)) * (progress / 2);
                r = active.r * pulse + inactive.r * (1 - pulse);
                g = active.g * pulse + inactive.g * (1 - pulse);
                b = active.b * pulse + inactive.b * (1 - pulse);
                // PRESENT: Breathe between Active and Inactive
                // Math.sin goes -1 to 1. We map to 0.0 to 1.0.
                // const t = (Math.sin(tick * 0.05) + 1) / 2;                 
                // r = Math.floor(active.r * t + inactive.r * (1 - t));
                // g = Math.floor(active.g * t + inactive.g * (1 - t));
                // b = Math.floor(active.b * t + inactive.b * (1 - t));
            } else {
                r = inactive.r; g = inactive.g; b = inactive.b;
            }
        }
    }

    // Temperature
    const tempWidget = state.widgets.temperature;
    if (tempWidget?.enabled && Array.isArray(tempWidget.keys) && tempWidget.keys.some(k => k == keyId)) {
        const { value = 0, low = 0, high = 100, lowColor, highColor } = tempWidget;
        const ranges = Array.isArray(tempWidget.ranges) ? tempWidget.ranges : [];

        if (ranges.length > 0) {
            let bestRange = null;
            let bestDistance = Infinity;

            ranges.forEach((range) => {
                const min = typeof range.min === 'number' ? range.min : null;
                const max = typeof range.max === 'number' ? range.max : null;
                let distance = 0;

                if (min !== null && value < min) {
                    distance = min - value;
                } else if (max !== null && value > max) {
                    distance = value - max;
                } else {
                    distance = 0;
                }

                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestRange = range;
                }
            });

            const rangeColor = (bestRange && (bestRange.color || bestRange.hex)) || '#0000FF';
            const selected = hexToRgb(rangeColor);
            r = selected.r; g = selected.g; b = selected.b;
        } else {
            let t = (value - low) / (high - low || 1);
            if (t < 0) t = 0; if (t > 1) t = 1;

            const start = hexToRgb(lowColor || '#0000FF');
            const end = hexToRgb(highColor || '#FF0000');
            const mixed = mix(start, end, t);
            r = mixed.r; g = mixed.g; b = mixed.b;
        }
    }

    // Weather
    if (state.weatherEnabled){
        // 1. Weather Overrides
        const weatherCond = (state.weather || 'CLEAR').toUpperCase();
        const isStorming = state.stormOverride && (weatherCond === 'RAIN' || weatherCond === 'STORM');

        if (isStorming) {
            const noise = Math.sin(pos.col * 0.5 + tick * 0.1);
            if (noise > 0.85) return { r: 0, g: 0, b: 255 };
            if (weatherCond === 'STORM' && Math.random() > 0.995) return { r: 255, g: 255, b: 255 };
            return { r: 0, g: 0, b: 0 };
        }

        // 2. Weather Keys        
        const isWeatherKey = Array.isArray(state.weatherKeys) && state.weatherKeys.includes(keyId);

        if (isWeatherKey) {
            return applyWeatherColor(weatherCond);
        }        
    }


    return { r, g, b };
}

return render;