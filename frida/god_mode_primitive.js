'use strict';

const TARGET_MODULE = 'Gaming.AdvancedLighting.dll';
const PRIMITIVE_RVA = 0x209b0;

const HEADER_SIZE = 4;     // 07 a1 c0 03
const BYTES_PER_KEY = 5;   // [ID, ID, R, G, B]
const BUFFER_SIZE = 960;

// Animation State
let tick = 0;

// --- HSV to RGB Helper ---
// Input: h (0-1), s (0-1), v (0-1)
// Output: {r, g, b} (0-255)
function hsvToRgb(h, s, v) {
    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }
    return {
        r: Math.floor(r * 255),
        g: Math.floor(g * 255),
        b: Math.floor(b * 255)
    };
}

function main() {
    const module = Process.getModuleByName(TARGET_MODULE);
    if (!module) {
        setTimeout(main, 1000);
        return;
    }

    const targetAddr = module.base.add(PRIMITIVE_RVA);
    console.log(`[+] Hooking Primitive at ${targetAddr}`);
    console.log(`[+] GOD MODE: RAINBOW WAVE ENGAGED`);

    Interceptor.attach(targetAddr, {
        onEnter(args) {
            const bufferInfoPtr = args[2];
            if (bufferInfoPtr.isNull()) return;
            const dataPtr = bufferInfoPtr.readPointer();
            if (dataPtr.isNull()) return;

            // Check Signature (Aurora Sync)
            const h0 = dataPtr.readU8();
            const h1 = dataPtr.add(1).readU8();

            if (h0 === 0x07 && h1 === 0xA1) {
                tick++;
                
                let cursor = dataPtr.add(HEADER_SIZE);
                const limit = dataPtr.add(BUFFER_SIZE - BYTES_PER_KEY);
                let keyIndex = 0;

                while (cursor < limit) {
                    const keyId = cursor.readU16();
                    
                    if (keyId !== 0) {
                        // --- RAINBOW MATH ---
                        // Speed: tick * 0.02
                        // Wave Density: keyIndex * 0.05
                        let hue = (tick * 0.02) + (keyIndex * 0.05);
                        
                        // Wrap hue to 0-1 range
                        hue = hue - Math.floor(hue);

                        const color = hsvToRgb(hue, 1.0, 1.0); // Full Saturation, Full Brightness

                        cursor.add(2).writeU8(color.r);
                        cursor.add(3).writeU8(color.g);
                        cursor.add(4).writeU8(color.b);
                        
                        keyIndex++;
                    }
                    cursor = cursor.add(BYTES_PER_KEY);
                }
            }
        }
    });
}

setImmediate(main);