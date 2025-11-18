'use strict';

const TARGET_MODULE = 'Gaming.AdvancedLighting.dll';
const RVA_CAMERA = 0x298c0;
const HEADER_SIZE = 4;
const BYTES_PER_KEY = 5;
const BUFFER_SIZE = 960;

function main() {
    const module = Process.getModuleByName(TARGET_MODULE);
    if (!module) {
        setTimeout(main, 1000);
        return;
    }

    const targetAddr = module.base.add(RVA_CAMERA);
    console.log(`[+] Hooking Camera at ${targetAddr}`);
    console.log(`[+] GOD MODE: DOUBLE BARREL (Writing to Arg0 and Arg1)`);

    Interceptor.attach(targetAddr, {
        onEnter(args) {
            this.arg0 = args[0];
            this.arg1 = args[1];
        },
        onLeave(retval) {
            if (this.arg1.isNull()) return;

            // --- ATTACK BUFFER 1 (Arg1 - Known Data Source) ---
            hijackBuffer(this.arg1, "Arg1");

            // --- ATTACK BUFFER 0 (Arg0 - Potential Ghost Target) ---
            if (!this.arg0.isNull()) {
                 hijackBuffer(this.arg0, "Arg0");
            }
        }
    });
}

function hijackBuffer(ptr, name) {
    // 1. Skip Header
    let cursor = ptr.add(HEADER_SIZE);
    const limit = ptr.add(BUFFER_SIZE - BYTES_PER_KEY);

    // 2. Iterate
    while (cursor < limit) {
        // Read Key ID (First 2 bytes)
        const keyId = cursor.readU16();

        // If the DLL put a valid key here...
        if (keyId !== 0) {
            // FORCE RED
            cursor.add(2).writeU8(255); // R
            cursor.add(3).writeU8(0);   // G
            cursor.add(4).writeU8(0);   // B
        }
        cursor = cursor.add(BYTES_PER_KEY);
    }
}

setImmediate(main);