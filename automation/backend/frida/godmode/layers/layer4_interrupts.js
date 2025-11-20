function render(state, pos, _tick, currentColor) {
    if (!pos || !state) return currentColor || { r: 0, g: 0, b: 0 };
    let { r, g, b } = currentColor || { r: 0, g: 0, b: 0 };

    // Progress Bar
    if (typeof state.downloadProgress === 'number' && state.downloadProgress >= 0) {
        if (pos.group?.includes('Number Row')) {
            const keyPercent = (pos.col / 13) * 100;
            if (keyPercent < state.downloadProgress) {
                r = 0; g = 255; b = 0;
            } else {
                r = 20; g = 0; b = 0;
            }
        }
    }

    return { r, g, b };
}

return render;