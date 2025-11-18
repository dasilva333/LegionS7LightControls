'use strict';

const TARGET_MODULE = 'Gaming.AdvancedLighting.dll';
const RVA_CAMERA = 0x298c0;
const HEADER_SIZE = 4;
const BYTES_PER_KEY = 5;

// Throttle logs
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
    console.log(`[+] Mode: WRITE VERIFICATION`);

    Interceptor.attach(targetAddr, {
        onEnter(args) {
            this.bufferPtr = args[1];
        },
        onLeave(retval) {
            if (this.bufferPtr.isNull()) return;

            frameCount++;
            if (frameCount % LOG_INTERVAL !== 0) return;

            // 1. Find the first valid key
            let cursor = this.bufferPtr.add(HEADER_SIZE);
            const limit = this.bufferPtr.add(960);
            
            while (cursor < limit) {
                const keyId = cursor.readU16();
                if (keyId !== 0) {
                    // FOUND A KEY!
                    
                    // 2. Read ORIGINAL Color
                    const rOld = cursor.add(2).readU8();
                    const gOld = cursor.add(3).readU8();
                    const bOld = cursor.add(4).readU8();
                    
                    console.log(`\n[Tick ${frameCount}] Verification Test:`);
                    console.log(`    [1] Original: Key 0x${keyId.toString(16)} = RGB(${rOld}, ${gOld}, ${bOld})`);
                    
                    // 3. PERFORM WRITE (Set to Red: 255, 0, 0)
                    try {
                        cursor.add(2).writeU8(255);
                        cursor.add(3).writeU8(0);
                        cursor.add(4).writeU8(0);
                        // console.log(`    [2] Write Operation: Executed.`);
                    } catch (e) {
                        console.log(`    [2] Write FAILED: ${e.message}`);
                        break;
                    }

                    // 4. READ BACK IMMEDIATELY
                    const rNew = cursor.add(2).readU8();
                    const gNew = cursor.add(3).readU8();
                    const bNew = cursor.add(4).readU8();
                    
                    console.log(`    [3] Readback: Key 0x${keyId.toString(16)} = RGB(${rNew}, ${gNew}, ${bNew})`);

                    if (rNew === 255 && gNew === 0 && bNew === 0) {
                        console.log(`    [Result] SUCCESS. Memory was modified.`);
                    } else {
                        console.log(`    [Result] FAILURE. Memory reverted or write was ignored.`);
                    }

                    // We only verify one key per second to avoid spam
                    break; 
                }
                cursor = cursor.add(BYTES_PER_KEY);
            }
        }
    });
}

setImmediate(main);