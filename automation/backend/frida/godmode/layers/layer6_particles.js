function render(state, pos, tick, currentColor, utils) {
    if (!pos || !state) return currentColor || { r: 0, g: 0, b: 0 };
    let { r, g, b } = currentColor || { r: 0, g: 0, b: 0 };

    const runtime = state.__fxRuntime;
    const particles = runtime?.particles;

    if (particles && particles.length > 0) {
        const { hexToRgb } = utils;
        // We read intensity from config just to calculate spread distance dynamically
        const config = state.widgets?.typingFx || {};
        const baseIntensity = (config.intensity !== undefined) ? config.intensity : 0.5;

        // Calculate Beam Spread based on intensity slider
        // Low Intensity = Short Beam (2 units)
        // High Intensity = Long Beam (10 units)
        const maxDistance = 2 + (baseIntensity * 8);

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            
            // Calculate Lifecycle Opacity (Fade out as it ages)
            const lifePct = 1.0 - (p.age / p.maxAge);
            if (lifePct <= 0) continue;

            // --- LASER LOGIC ---
            if (p.type === 'LASER') {
                let dist = -1;

                // Horizontal Check (Exact Row Match)
                if (pos.row === p.row) {
                    dist = Math.abs(pos.col - p.col);
                } 
                // Vertical Check (Fuzzy column match for staggered layout)
                // We allow a 0.5 unit tolerance for vertical alignment
                else if (Math.abs(pos.col - p.col) < 0.5) {
                    dist = Math.abs(pos.row - p.row);
                }

                // Render if hit
                if (dist >= 0 && dist < maxDistance) {
                    // Distance Falloff (Bright center, dim edges)
                    // Power of 2 curve makes the center "hotter"
                    const distFalloff = Math.pow(1.0 - (dist / maxDistance), 2);
                    
                    // Combine Life * Distance
                    const brightness = lifePct * distFalloff;

                    if (brightness > 0) {
                        // Use pre-calculated RGB if available, else parse
                        const pColor = p.rgb || hexToRgb(p.hexColor || '#FFFFFF');
                        
                        // Additive Blending (Clamped to 255)
                        r = Math.min(255, r + (pColor.r * brightness));
                        g = Math.min(255, g + (pColor.g * brightness));
                        b = Math.min(255, b + (pColor.b * brightness));
                    }
                }
            }
        }
    }

    return { r, g, b };
}

return render;