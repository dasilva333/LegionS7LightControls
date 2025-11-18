'use strict';

const TARGET_MODULE = 'Gaming.AdvancedLighting.dll';
const RVA_CAMERA = 0x298c0; 

// --- The Schema (Derived from your logs) ---
const HEADER_SIZE = 4;       // 07 03 ff 01
const BYTES_PER_KEY = 5;     // [ID_LO, ID_HI, R, G, B]
const BUFFER_SIZE = 960;

// Throttle: Analyze 1 frame per second (approx)
let frameCount = 0;
const LOG_INTERVAL = 60; 

function main() {
    const module = Process.getModuleByName(TARGET_MODULE);
    if (!module) {
        setTimeout(main, 1000);
        return;
    }

    const targetAddr = module.base.add(RVA_CAMERA);
    console.log(`[+] Hooking Camera at ${targetAddr}`);
    console.log(`[+] Mode: PASSIVE DEEP PARSING`);

    Interceptor.attach(targetAddr, {
        onEnter(args) {
            // args[1] is the pointer to the buffer start
            this.bufferPtr = args[1]; 
        },
        onLeave(retval) {
            if (this.bufferPtr.isNull()) return;

            frameCount++;
            if (frameCount % LOG_INTERVAL !== 0) return;

            // --- PARSING LOGIC ---
            
            // Read the full buffer for safe JS processing
            const rawBuffer = this.bufferPtr.readByteArray(BUFFER_SIZE);
            const view = new DataView(rawBuffer);

            let activeKeys = 0;
            let totalR = 0, totalG = 0, totalB = 0;
            const uniqueColors = new Set();

            // Iterate over all potential key slots
            // Start at offset 4 (Header), stop before the end
            for (let offset = HEADER_SIZE; offset < BUFFER_SIZE - BYTES_PER_KEY; offset += BYTES_PER_KEY) {
                
                const keyId = view.getUint16(offset, true); // Little Endian
                
                // KeyID 0 means empty slot or end of list
                if (keyId === 0) continue;

                activeKeys++;

                const r = view.getUint8(offset + 2);
                const g = view.getUint8(offset + 3);
                const b = view.getUint8(offset + 4);

                // Statistics
                totalR += r;
                totalG += g;
                totalB += b;

                // Store unique color strings for the palette report
                // (Limit set size to avoid massive logs)
                if (uniqueColors.size < 5) {
                    uniqueColors.add(`RGB(${r.toString().padStart(3)}, ${g.toString().padStart(3)}, ${b.toString().padStart(3)})`);
                }
            }

            // --- REPORTING ---
            if (activeKeys > 0) {
                const avgR = Math.floor(totalR / activeKeys);
                const avgG = Math.floor(totalG / activeKeys);
                const avgB = Math.floor(totalB / activeKeys);

                console.log(`\n[Tick ${frameCount}] Frame Analysis:`);
                console.log(`    Active LEDs:    ${activeKeys}`);
                console.log(`    Dominant Color: RGB(${avgR}, ${avgG}, ${avgB})  <-- Does this match the video?`);
                console.log(`    Sample Palette: ${Array.from(uniqueColors).join(' | ')} ...`);
            } else {
                console.log(`\n[Tick ${frameCount}] Frame Empty (No active keys found)`);
            }
        }
    });
}

setImmediate(main);