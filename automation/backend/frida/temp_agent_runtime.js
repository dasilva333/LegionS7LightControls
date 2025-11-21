'use strict';

function log(message) {
    send({ type: 'log', payload: `[Agent] ${message}` });
}

function createStdString(text) {
    const strPtr = Memory.alloc(32); 
    if (text.length < 16) {
        strPtr.writeUtf8String(text);
        strPtr.add(0x10).writeU64(text.length);
        strPtr.add(0x18).writeU64(15); 
    } else {
        const textBuffer = Memory.allocUtf8String(text);
        strPtr.writePointer(textBuffer);
        strPtr.add(0x10).writeU64(text.length);
        strPtr.add(0x18).writeU64(text.length);
    }
    return strPtr;
}

function readStdString(ptr) {
    if (!ptr || ptr.isNull()) throw new Error("readStdString received a null pointer.");
    const length = ptr.add(0x10).readU64().toNumber();
    const capacity = ptr.add(0x18).readU64().toNumber();
    if (length === 0) return "";
    const dataPtr = (capacity < 16) ? ptr : ptr.readPointer();
    if (dataPtr.isNull()) {
        log(`WARNING: readStdString found a null data pointer.`);
        return "";
    }
    return dataPtr.readUtf8String(length);
}

const context = {
    MODULE_NAME: 'Gaming.AdvancedLighting.dll',
    baseAddress: null,
    nativeFunctions: {},
    hwObjectPtr: null,
    log: log,
    goldenBuffers: { details: null },
    keyGroups: {},
    utils: { readStdString, createStdString }
};

context.goldenBuffers.details = new Uint8Array([
    5,0,0,0,0,0,0,0,48,182,223,254,84,1,0,0,128,182,223,254,84,1,0,0,128,182,223,254,84,1,0,0,1,222,31,154,24,0,0,0,48,238,184,254,84,1,0,0
]);

// FIX: Removed [] brackets here. The loader injects the full array string.
context.keyGroups = [{"group_name":"Function Row (Top)","keys":[{"id":1,"key_name":"Esc","row":0,"col":0},{"id":2,"key_name":"F1","row":0,"col":2},{"id":3,"key_name":"F2","row":0,"col":3},{"id":4,"key_name":"F3","row":0,"col":4},{"id":5,"key_name":"F4","row":0,"col":5},{"id":6,"key_name":"F5","row":0,"col":6},{"id":7,"key_name":"F6","row":0,"col":7},{"id":8,"key_name":"F7","row":0,"col":8},{"id":9,"key_name":"F8","row":0,"col":9},{"id":10,"key_name":"F9","row":0,"col":10},{"id":11,"key_name":"F10","row":0,"col":11},{"id":12,"key_name":"F11","row":0,"col":12},{"id":13,"key_name":"F12","row":0,"col":13},{"id":14,"key_name":"Insert","row":0,"col":15},{"id":15,"key_name":"PrtSc","row":0,"col":16},{"id":16,"key_name":"Delete","row":0,"col":17}]},{"group_name":"Navigation Cluster (Top Right)","keys":[{"id":17,"key_name":"Home","row":0,"col":18},{"id":18,"key_name":"End","row":0,"col":19},{"id":19,"key_name":"PgUp","row":0,"col":20},{"id":20,"key_name":"PgDn","row":0,"col":21}]},{"group_name":"Number Row","keys":[{"id":22,"key_name":"~ (Tilde)","row":1,"col":0},{"id":23,"key_name":"1","row":1,"col":1},{"id":24,"key_name":"2","row":1,"col":2},{"id":25,"key_name":"3","row":1,"col":3},{"id":26,"key_name":"4","row":1,"col":4},{"id":27,"key_name":"5","row":1,"col":5},{"id":28,"key_name":"6","row":1,"col":6},{"id":29,"key_name":"7","row":1,"col":7},{"id":30,"key_name":"8","row":1,"col":8},{"id":31,"key_name":"9","row":1,"col":9},{"id":32,"key_name":"0","row":1,"col":10},{"id":33,"key_name":"- (Minus)","row":1,"col":11},{"id":34,"key_name":"= (Equals)","row":1,"col":12},{"id":56,"key_name":"Backspace","row":1,"col":13}]},{"group_name":"Alpha Block (Top: QWERTY)","keys":[{"id":64,"key_name":"Tab","row":2,"col":0},{"id":66,"key_name":"Q","row":2,"col":1},{"id":67,"key_name":"W","row":2,"col":2},{"id":68,"key_name":"E","row":2,"col":3},{"id":69,"key_name":"R","row":2,"col":4},{"id":70,"key_name":"T","row":2,"col":5},{"id":71,"key_name":"Y","row":2,"col":6},{"id":72,"key_name":"U","row":2,"col":7},{"id":73,"key_name":"I","row":2,"col":8},{"id":74,"key_name":"O","row":2,"col":9},{"id":75,"key_name":"P","row":2,"col":10},{"id":76,"key_name":"[","row":2,"col":11},{"id":77,"key_name":"]","row":2,"col":12},{"id":78,"key_name":"\\ (Backslash)","row":2,"col":13}]},{"group_name":"Alpha Block (Middle: ASDF)","keys":[{"id":85,"key_name":"Caps Lock","row":3,"col":0},{"id":109,"key_name":"A","row":3,"col":1},{"id":110,"key_name":"S","row":3,"col":2},{"id":88,"key_name":"D","row":3,"col":3},{"id":89,"key_name":"F","row":3,"col":4},{"id":90,"key_name":"G","row":3,"col":5},{"id":113,"key_name":"H","row":3,"col":6},{"id":114,"key_name":"J","row":3,"col":7},{"id":91,"key_name":"K","row":3,"col":8},{"id":92,"key_name":"L","row":3,"col":9},{"id":93,"key_name":"; (Semicolon)","row":3,"col":10},{"id":95,"key_name":"' (Quote)","row":3,"col":11},{"id":119,"key_name":"Enter","row":3,"col":13}]},{"group_name":"Alpha Block (Bottom: ZXCV)","keys":[{"id":106,"key_name":"Left Shift","row":4,"col":0},{"id":130,"key_name":"Z","row":4,"col":2},{"id":131,"key_name":"X","row":4,"col":3},{"id":111,"key_name":"C","row":4,"col":4},{"id":112,"key_name":"V","row":4,"col":5},{"id":135,"key_name":"B","row":4,"col":6},{"id":136,"key_name":"N","row":4,"col":7},{"id":115,"key_name":"M","row":4,"col":8},{"id":116,"key_name":", (Comma)","row":4,"col":9},{"id":117,"key_name":". (Period)","row":4,"col":10},{"id":118,"key_name":"/ (Slash)","row":4,"col":11},{"id":141,"key_name":"Right Shift","row":4,"col":13}]},{"group_name":"Bottom Modifiers & Arrows","keys":[{"id":127,"key_name":"Left Ctrl","row":5,"col":0},{"id":128,"key_name":"Fn","row":5,"col":1},{"id":150,"key_name":"Left Win","row":5,"col":2},{"id":151,"key_name":"Left Alt","row":5,"col":3},{"id":152,"key_name":"Space","row":5,"col":6,"width":5},{"id":154,"key_name":"Right Alt","row":5,"col":10},{"id":155,"key_name":"Menu / R-Ctrl","row":5,"col":11},{"id":156,"key_name":"Left Arrow","row":5,"col":15},{"id":157,"key_name":"Up Arrow","row":4,"col":16},{"id":159,"key_name":"Down Arrow","row":5,"col":16},{"id":161,"key_name":"Right Arrow","row":5,"col":17}]},{"group_name":"Numpad","keys":[{"id":38,"key_name":"Num Lock","row":1,"col":18},{"id":39,"key_name":"Num /","row":1,"col":19},{"id":40,"key_name":"Num *","row":1,"col":20},{"id":41,"key_name":"Num -","row":1,"col":21},{"id":79,"key_name":"Num 7","row":2,"col":18},{"id":80,"key_name":"Num 8","row":2,"col":19},{"id":81,"key_name":"Num 9","row":2,"col":20},{"id":104,"key_name":"Num +","row":2,"col":21},{"id":121,"key_name":"Num 4","row":3,"col":18},{"id":123,"key_name":"Num 5","row":3,"col":19},{"id":124,"key_name":"Num 6","row":3,"col":20},{"id":142,"key_name":"Num 1","row":4,"col":18},{"id":144,"key_name":"Num 2","row":4,"col":19},{"id":146,"key_name":"Num 3","row":4,"col":20},{"id":163,"key_name":"Num 0","row":5,"col":19},{"id":165,"key_name":"Num .","row":5,"col":20},{"id":167,"key_name":"Num Enter","row":4,"col":21}]}];
context.initialState = {"active":false,"mode":"DEFAULT","weather":"CLEAR","timeOfDay":0.5,"cpuTemp":0,"downloadProgress":-1,"backgroundMode":"none","timeUpdateRate":1,"effectSettings":{"effectType":"Ripple","baseColor":"#0070FF","speed":3},"stormOverride":false,"weatherEnabled":true,"weatherKeys":[],"weatherSettings":{"zipCode":""},"widgets":{"dayBar":{},"temperature":{"value":0}},"interrupts":{"progress":{}}};
context.godMode = {
    utils: {
        color_math: (function(){
function hsvToRgb(h, s, v) {
  const clamp = (num) => Math.max(0, Math.min(1, num));
  h = clamp(h);
  s = clamp(s);
  v = clamp(v);
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r = 0;
  let g = 0;
  let b = 0;
  switch (i % 6) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    case 5:
      r = v;
      g = p;
      b = q;
      break;
  }
  return { r: Math.floor(r * 255), g: Math.floor(g * 255), b: Math.floor(b * 255) };
}

function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return { r: 0, g: 0, b: 0 };
  const cleanHex = hex.replace('#', '');
  return {
    r: parseInt(cleanHex.substring(0, 2), 16) || 0,
    g: parseInt(cleanHex.substring(2, 4), 16) || 0,
    b: parseInt(cleanHex.substring(4, 6), 16) || 0
  };
}

function mix(c1, c2, t) {
  const clamp = (value) => Math.max(0, Math.min(1, value));
  const ratio = clamp(t);
  return {
    r: Math.floor(c1.r + (c2.r - c1.r) * ratio),
    g: Math.floor(c1.g + (c2.g - c1.g) * ratio),
    b: Math.floor(c1.b + (c2.b - c1.b) * ratio)
  };
}

return { hsvToRgb, hexToRgb, mix };

})(),
        geometry: (function(){
function buildKeyMaps(keyGroups) {
  const KEY_MAP = new Map();
  const NAME_TO_ID = new Map();

  if (!Array.isArray(keyGroups)) return { KEY_MAP, NAME_TO_ID };

  keyGroups.forEach((group) => {
    group.keys.forEach((key) => {
      if (key && typeof key.id === 'number') {
        const meta = { row: key.row, col: key.col, group: group.group_name, keyId: key.id };
        KEY_MAP.set(key.id, meta);
        if (key.key_name) {
          NAME_TO_ID.set(key.key_name.toUpperCase(), key.id);
        }
      }
    });
  });

  return { KEY_MAP, NAME_TO_ID };
}

return { buildKeyMaps };

})()
    },
    layers: {
        layer1_background: (function(){
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
})(),
        layer2_context: (function(){
return function render(_state, _pos, _tick, currentColor) {
  return currentColor || { r: 0, g: 0, b: 0 };
};

})(),
        layer3_widgets: (function(){
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
})(),
        layer4_interrupts: (function(){
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
})(),
        layer5_fx: (function(){

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

})(),
        layer_snake: (function(){
// layer_snake.js
// Renders the Snake game state on the keyboard

const SNAKE_HEAD_COLOR = { r: 0, g: 255, b: 0 }; // Bright Green
const SNAKE_BODY_COLOR = { r: 0, g: 100, b: 0 }; // Dim Green
const FOOD_COLOR = { r: 255, g: 0, b: 0 };       // Red

function layerSnakeGame(state, pos, tick, color, color_math) {
    if (!state.snake || !state.snake.isPlaying) return null;

    const { snake, food } = state.snake;

    // Helper to check if current key matches a coordinate
    // Note: pos.row and pos.col are 0-indexed, matching our game grid
    const isAt = (coord) => coord[0] === pos.row && coord[1] === pos.col;

    // Check Head
    if (snake.length > 0 && isAt(snake[0])) {
        return SNAKE_HEAD_COLOR;
    }

    // Check Body
    for (let i = 1; i < snake.length; i++) {
        if (isAt(snake[i])) {
            return SNAKE_BODY_COLOR;
        }
    }

    // Check Food (with pulse effect)
    // Check Food
    if (isAt(food)) {
        // Force solid red to verify mapping first
        return { r: 255, g: 0, b: 0 };
    }

    return null;
}

return layerSnakeGame;
})()
    }
};

function defineNativeFunction(name, definition) {
    if (context.nativeFunctions[name] || !context.baseAddress) return;
    const address = definition.export
        ? Module.getExportByName(context.MODULE_NAME, definition.export)
        : context.baseAddress.add(definition.rva);
    context.nativeFunctions[name] = new NativeFunction(address, definition.signature[0], definition.signature[1]);
    log(`  -> Native function '${name}' defined at ${address}`);
}

function initialize() {
    log('Initializing agent core...');
    const module = Process.getModuleByName(context.MODULE_NAME);
    if (!module) {
        log('ERROR: Module not found.');
        return false;
    }
    context.baseAddress = module.base;
    context.hwObjectPtr = context.baseAddress.add(0x7E840);
    log(`Module ${context.MODULE_NAME} found. Base: ${context.baseAddress}`);

    defineNativeFunction('getInstance', { export: 'get_instance', signature: ['pointer', []] });
    defineNativeFunction('initProfileDetail', { rva: 0x14630, signature: ['void', ['pointer', 'pointer', 'pointer', 'pointer']] });

    return true;
}

function registerAction(actionObject) {
    if (!actionObject || !actionObject.name || typeof actionObject.action !== 'function') {
        log('ERROR: Invalid action object passed to registerAction.');
        return;
    }

    if (actionObject.dependencies) {
        log(`Defining dependencies for action: ${actionObject.name}...`);
        for (const funcName in actionObject.dependencies) {
            defineNativeFunction(funcName, actionObject.dependencies[funcName]);
        }
    }

    log(`Registering RPC export: ${actionObject.name}`);
    const result = actionObject.action(context);
    
    // This logic now works because godMode.js returns a plain Object, not a function.
    if (typeof result === 'object') {
        Object.assign(rpc.exports, result); 
    } else {
        rpc.exports[actionObject.name] = result;
    }    
}

if (initialize()) {
    log('Agent core initialized. Ready to register actions.');
    rpc.exports = {};
} else {
    log('Agent initialization failed.');
    rpc.exports = { error: "Agent initialization failed." };
}

registerAction(({
    name: 'executeDispatcher',
    dependencies: {
        'getProfileIndex': { rva: 0x11210, signature: ['void', ['pointer']] }
    },
    action: (context) => {
        return async (payload) => {
            const { nativeFunctions, hwObjectPtr, log, utils } = context;

            if (!payload || !payload.commandString || !payload.payloadString) {
                throw new Error("Invalid payload: { commandString, payloadString } is required.");
            }

            log(`RPC executing: executeDispatcher`);
            
            try {
                // --- Preamble ---
                log('  Preamble: Calling get_instance...');
                const controller = nativeFunctions.getInstance();
                if (controller.isNull()) throw new Error("get_instance() returned null.");
                
                log('  Preamble: Preparing with zeroed-out buffers (crash-on-success model)...');
                const detailBuffer = Memory.alloc(48);
                const scratchBuffer = Memory.alloc(56);
                nativeFunctions.initProfileDetail(hwObjectPtr, detailBuffer, scratchBuffer, NULL);

                log('  Preamble: Calling getProfileIndex to finalize state...');
                nativeFunctions.getProfileIndex(hwObjectPtr);

                // --- Dispatch ---
                const vtable = controller.readPointer();
                const dispatcherPtr = vtable.add(3 * Process.pointerSize).readPointer();
                const dispatcher = new NativeFunction(dispatcherPtr, 'void', ['pointer', 'pointer', 'pointer', 'pointer', 'pointer']);

                const commandStr = utils.createStdString(payload.commandString);
                const payloadStr = utils.createStdString(payload.payloadString);
                const resultStr = utils.createStdString("");

                log('  Action: Calling native dispatcher function... ' + JSON.stringify(payload));
                dispatcher(controller, resultStr, commandStr, payloadStr, NULL);
                
                log('  UNEXPECTED SUCCESS: Dispatcher returned without crashing.');
                const resultJsonString = utils.readStdString(resultStr);
                return JSON.parse(resultJsonString || '{}');

            } catch (e) {
                // This is our expected "success" path. The lights have been changed.
                log(`SUCCESS (via handled crash): Dispatcher call failed as expected: ${e.message}`);
                return { status: "success", note: "Effect applied, followed by a handled native exception." };
            }
        };
    }
}));

registerAction(({
    /**
     * The name for the RPC export. The Node loader will call agentApi.getActiveProfileId().
     */
    name: 'getActiveProfileId',

    /**
     * The specific native functions this action needs, beyond the core ones.
     */
    dependencies: {
        'getActiveProfileId': { 
            rva: 0x11210, 
            signature: ['void', ['pointer']] 
        }
    },

    /**
     * The factory function that creates the final RPC method.
     */
    action: (context) => {
        return () => {
            const { nativeFunctions, hwObjectPtr, log } = context;

            log('RPC executing: getActiveProfileId');

            if (!nativeFunctions.getActiveProfileId) {
                throw new Error('Dependency "getActiveProfileId" is not available.');
            }

            try {
                // Preamble: Call the core functions provided by agent-core.js.
                nativeFunctions.getInstance();
                const detailBuffer = Memory.alloc(48);
                const scratchBuffer = Memory.alloc(56);
                nativeFunctions.initProfileDetail(hwObjectPtr, detailBuffer, scratchBuffer, NULL);

                // Action: Call the specific function for this task.
                nativeFunctions.getActiveProfileId(hwObjectPtr);

                // Result: Read the integer ID from the known memory offset.
                const profileIdOffset = 0x154;
                const profileId = hwObjectPtr.add(profileIdOffset).readS32();
                log(`  -> Result: ${profileId}`);
                
                return profileId;
            } catch (e) {
                log(`FATAL ERROR in getActiveProfileId: ${e.message}\n${e.stack}`);
                throw new Error(`Native call failed during getActiveProfileId: ${e.message}`);
            }
        };
    }
}));

registerAction(({
    /**
     * The name of the function to be exported via rpc.exports.
     */
    name: 'getBrightness',

    /**
     * A list of native functions this action specifically requires.
     * The agent-core will ensure these are defined and available in the context.
     * `getInstance` and `initProfileDetail` are already provided by the core.
     */
    dependencies: {
        'getBrightness': { 
            rva: 0x14110, 
            signature: ['void', ['pointer']] 
        }
    },

    /**
     * The factory function that creates the final RPC method.
     */
    action: (context) => {
        return () => {
            const { nativeFunctions, hwObjectPtr, log } = context;

            log('RPC executing: getBrightness');

            if (!nativeFunctions.getBrightness) {
                throw new Error('Dependency "getBrightness" is not available.');
            }

            try {
                // Preamble: Call the core functions that are always available.
                nativeFunctions.getInstance();
                const detailBuffer = Memory.alloc(48);
                const scratchBuffer = Memory.alloc(56);
                nativeFunctions.initProfileDetail(hwObjectPtr, detailBuffer, scratchBuffer, NULL);

                // Action: Call the specific function for this task.
                nativeFunctions.getBrightness(hwObjectPtr);

                // Result: Read the value from memory.
                const brightness = hwObjectPtr.add(0x158).readS32();
                log(`  -> Result: ${brightness}`);
                
                return brightness;
            } catch (e) {
                log(`FATAL ERROR in getBrightness: ${e.message}\n${e.stack}`);
                throw new Error(`Native call failed during getBrightness: ${e.message}`);
            }
        };
    }
}));

registerAction(({
    name: 'getProfileJson',

    dependencies: {
        'buildPrep': {
            rva: 0x54210,
            signature: ['void', ['pointer', 'pointer', 'uint64', 'uint64']]
        },
        'jsonWrite': {
            rva: 0x15ea0,
            signature: ['void', ['pointer', 'pointer', 'int', 'char', 'char', 'uint']]
        }
    },

    action: (context) => {
        return () => {
            const { nativeFunctions, hwObjectPtr, log, utils } = context;
            log('RPC executing: getProfileJson');

            if (!nativeFunctions.buildPrep || !nativeFunctions.jsonWrite) {
                throw new Error('Dependencies for getProfileJson are not available.');
            }

            try {
                // Preamble
                nativeFunctions.getInstance();
                const detailBuffer = Memory.alloc(48);
                const scratchBuffer = Memory.alloc(56);
                nativeFunctions.initProfileDetail(hwObjectPtr, detailBuffer, scratchBuffer, NULL);

                // Action
                const outStrPtr = Memory.alloc(32);
                const ctxPtr = Memory.alloc(16);
                nativeFunctions.buildPrep(ctxPtr, detailBuffer, 1, 2);
                nativeFunctions.jsonWrite(ctxPtr, outStrPtr, -1, ' '.charCodeAt(0), '\0'.charCodeAt(0), 0);
                
                // Result: Use the new shared utility function from the context.
                const jsonString = utils.readStdString(outStrPtr);

                log(`  -> Success: Read ${jsonString.length} byte JSON string.`);
                
                return JSON.parse(jsonString);

            } catch (e) {
                log(`FATAL ERROR in getProfileJson: ${e.message}\n${e.stack}`);
                throw new Error(`Native call failed during getProfileJson: ${e.message}`);
            }
        };
    }
}));

registerAction(({
    name: 'godMode',
    dependencies: {},
    action: (context) => {
        // 1. Extract Context & Utils
        const { baseAddress, log, keyGroups, initialState } = context;
        const godMode = context.godMode || {};

        // Verify we have the injected modules
        if (!godMode.utils || !godMode.layers) {
            log("[GodMode] CRITICAL ERROR: Modules not injected by loader.");
            return {};
        }

        const { geometry, color_math } = godMode.utils;

        // 2. Build Geometry Map
        const { KEY_MAP, NAME_TO_ID } = geometry.buildKeyMaps(keyGroups);

        // --- DEBUG: INIT CHECK ---
        log(`[DEBUG] Init: BaseAddress ${baseAddress}`);
        log(`[DEBUG] Init: KeyGroups Length ${keyGroups ? keyGroups.length : 'NULL'}`);
        log(`[DEBUG] Init: KEY_MAP Size ${KEY_MAP.size}`);
        // Check Key 66 (Q) specifically as it's our test candidate
        // const debugKey = KEY_MAP.get(66);
        // log(`[DEBUG] Init: Key 66 lookup: ${debugKey ? JSON.stringify(debugKey) : 'UNDEFINED'}`);
        // -------------------------

        // 3. Initialize State
        const state = JSON.parse(JSON.stringify(initialState));

        // Ensure runtime structures exist
        state.alerts = [];
        state.__fxRuntime = { activeFades: new Map() };
        if (!state.widgets) state.widgets = {};
        if (!state.interrupts) state.interrupts = {};

        // --- DEBUG: STATE CHECK ---
        log(`[DEBUG] Init: State Mode: ${state.mode}`);
        log(`[DEBUG] Init: BG Mode: ${state.backgroundMode}`);
        log(`[DEBUG] Init: Weather: ${state.weather}`);
        // --------------------------

        // 4. Setup Layer Pipeline
        const layerOrder = [
            godMode.layers.layer1_background,
            godMode.layers.layer2_context,
            godMode.layers.layer3_widgets,
            godMode.layers.layer4_interrupts,
            godMode.layers.layer5_fx
        ].filter(fn => typeof fn === 'function');

        log(`[DEBUG] Init: Active Layers: ${layerOrder.length}/${Object.keys(godMode.layers).length}`);
        log(`[DEBUG] Layers Found ${JSON.stringify(Object.keys(godMode.layers))}`);

        // 5. Setup Hook
        const PRIMITIVE_RVA = 0x209b0;
        const HEADER_SIZE = 4;
        const BYTES_PER_KEY = 5;
        const BUFFER_SIZE = 960;

        let tick = 0;
        let debuggedOnce = false; // Ensure we only log the loop once

        const targetAddr = baseAddress.add(PRIMITIVE_RVA);
        log('[GodMode] Engine v2 loaded. State synced.');

        // 6. Main Loop
        Interceptor.attach(targetAddr, {
            onEnter(args) {
                if (!state.active || state.mode === 'PASSTHROUGH') return;

                const bufferInfoPtr = args[2];
                if (bufferInfoPtr.isNull()) return;
                const dataPtr = bufferInfoPtr.readPointer();
                if (dataPtr.isNull()) return;

                if (dataPtr.readU8() === 0x07 && dataPtr.add(1).readU8() === 0xA1) {
                    tick++;

                    // --- DEBUG: FIRST FRAME ---
                    if (!debuggedOnce) {
                        log(`[DEBUG] Frame 1: Hook Triggered.`);
                        log(`[DEBUG] Frame 1: Cursor Start ${dataPtr.add(HEADER_SIZE)}`);
                    }
                    // --------------------------

                    let cursor = dataPtr.add(HEADER_SIZE);
                    const limit = dataPtr.add(BUFFER_SIZE - BYTES_PER_KEY);

                    while (cursor < limit) {
                        const keyId = cursor.readU16();

                        if (keyId !== 0) {
                            const basePos = KEY_MAP.get(keyId);

                            if (basePos) {
                                const pos = { ...basePos, keyId };

                                let color = { r: 0, g: 0, b: 0 };

                                // Run Pipeline
                                if (state.snake && state.snake.isPlaying) {
                                    // Snake Game Override
                                    const snakeColor = godMode.layers.layer_snake(state, pos, tick, color, color_math);
                                    if (snakeColor) color = snakeColor;
                                } else {
                                    // Standard Pipeline
                                    for (const layerFn of layerOrder) {
                                        try {
                                            const nextColor = layerFn(state, pos, tick, color, color_math);

                                            // // --- DEBUG: TRACE KEY 66 ---
                                            // if (!debuggedOnce && keyId === 66) {
                                            //     log(`[DEBUG] Key 66 Layer Result: ${JSON.stringify(nextColor)}`);
                                            // }
                                            // ---------------------------

                                            if (nextColor) color = nextColor;
                                        } catch (e) {
                                            if (!debuggedOnce) log(`[DEBUG] Layer Error: ${e.message}`);
                                        }
                                    }
                                }

                                // Clamp and Write
                                cursor.add(2).writeU8(Math.max(0, Math.min(255, color.r)));
                                cursor.add(3).writeU8(Math.max(0, Math.min(255, color.g)));
                                cursor.add(4).writeU8(Math.max(0, Math.min(255, color.b)));
                            } else {
                                // --- DEBUG: MAP MISS ---
                                if (!debuggedOnce && keyId < 200) { // Don't spam high IDs
                                    log(`[DEBUG] Frame 1: Key ID ${keyId} NOT FOUND in Map.`);
                                }
                                // -----------------------
                            }
                        }
                        cursor = cursor.add(BYTES_PER_KEY);
                    }
                    debuggedOnce = true;
                }
            }
        });

        // 7. Exports
        return {
            enable: () => { state.active = true; log('God Mode Enabled'); },
            disable: () => { state.active = false; log('God Mode Disabled'); },
            updateState: (partialState) => {
                for (const key in partialState) {
                    if (typeof state[key] === 'object' && !Array.isArray(state[key]) && partialState[key] !== null) {
                        Object.assign(state[key], partialState[key]);
                    } else {
                        state[key] = partialState[key];
                    }
                }
            },
            // --- UPDATED FLASH LOGIC ---
            flashKey: (keyName) => {
                const id = NAME_TO_ID.get(keyName.toUpperCase());
                if (!id) return; // Key not found

                const fades = state.__fxRuntime.activeFades;
                const config = state.widgets?.typingFx || {};
                const style = config.effectStyle || 'Bounce';

                // 1. Heatmap: Accumulate Intensity
                if (style === 'Heatmap') {
                    let currentVal = 0;
                    const entry = fades.get(id);
                    
                    // Handle legacy storage (number vs object)
                    if (typeof entry === 'number') currentVal = entry;
                    else if (entry && typeof entry === 'object') currentVal = entry.intensity || 0;

                    // Add Heat based on slider (Default to 0.2 if undefined)
                    // Slider 0.1 = Slow Heat (10 taps)
                    // Slider 1.0 = Instant Heat (1 tap)
                    const increment = (config.intensity !== undefined) ? config.intensity : 0.2;

                    let nextVal = currentVal + increment;
                    if (nextVal > 1.0) nextVal = 1.0; // Cap at max

                    fades.set(id, nextVal);
                } 
                // 2. Rainbow: Trigger Random Color
                else if (style === 'Rainbow Sparkle') {
                    // We set hue to undefined. The renderer (Layer 5) will see this
                    // and generate a random hue on the next frame.
                    fades.set(id, { intensity: 1.0, hue: undefined });
                } 
                // 3. Bounce / Flash: Reset to Max
                else {
                    fades.set(id, 1.0);
                }
            }
        };
    }
}));

registerAction(({
    /**
     * The name for the RPC export.
     */
    name: 'setProfileIndex',

    /**
     * This action requires the native functions for string manipulation and setting the index.
     */
    dependencies: {
        'setProfileIndex': {
            rva: 0x13650,
            signature: ['void', ['pointer', 'pointer', 'pointer', 'pointer']]
        },
        'stringInit': {
            rva: 0x17280,
            signature: ['void', ['pointer', 'char']]
        },
        'stringDestroy': {
            rva: 0x171b0,
            signature: ['void', ['pointer']]
        }
    },

    /**
     * The factory function that creates the final RPC method.
     */
    action: (context) => {
        // This RPC function expects a payload object like { profileId: 3 }
        return (payload) => {
            const { nativeFunctions, hwObjectPtr, log } = context;

            if (!payload || typeof payload.profileId !== 'number') {
                throw new Error("Invalid payload: 'profileId' (number) is required.");
            }
            const profileId = payload.profileId;

            log(`RPC executing: setProfileIndex with ID: ${profileId}`);

            if (!nativeFunctions.setProfileIndex || !nativeFunctions.stringInit || !nativeFunctions.stringDestroy) {
                throw new Error('Dependencies for setProfileIndex are not available.');
            }

            // This function uses __try, so we must be careful with C++ objects.
            // We'll manage memory manually.
            const outStrPtr = Memory.alloc(32); // Allocate memory for the std::string struct

            try {
                // --- Preamble ---
                nativeFunctions.getInstance();
                const detailBuffer = Memory.alloc(48);
                const scratchBuffer = Memory.alloc(56);
                nativeFunctions.initProfileDetail(hwObjectPtr, detailBuffer, scratchBuffer, NULL);

                // --- Action ---
                log('  Action: Initializing temporary native string...');
                nativeFunctions.stringInit(outStrPtr, '\0'.charCodeAt(0));

                log(`  Action: Calling native setProfileIndex function with ID ${profileId}...`);
                // The native function expects a pointer to an unsigned int.
                const idPtr = Memory.alloc(4);
                idPtr.writeU32(profileId);
                nativeFunctions.setProfileIndex(hwObjectPtr, outStrPtr, idPtr, NULL);
                
                log('  -> Success: Native call completed.');
                
                return { success: true, profileId: profileId };

            } catch (e) {
                log(`HANDLED EXCEPTION in setProfileIndex: ${e.message}`);
                // Based on our C++ bridge, a native exception here is a "forgivable" error (-3).
                // The profile switch likely still worked.
                return { success: true, profileId: profileId, note: "Native call threw a handled exception." };
            } finally {
                // --- Cleanup ---
                // CRITICAL: We must always destroy the native string to prevent memory leaks,
                // even if an exception occurred.
                if (nativeFunctions.stringDestroy) {
                    log('  Cleanup: Destroying temporary native string...');
                    nativeFunctions.stringDestroy(outStrPtr);
                }
            }
        };
    }
}));
