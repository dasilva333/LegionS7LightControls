'use strict';

const TARGET_MODULE = 'Gaming.AdvancedLighting.dll';
const RVA_CAMERA = 0x298c0;
const HEADER_SIZE = 4;
const BYTES_PER_KEY = 5;
const BUFFER_SIZE = 960;

let tick = 0;

function main() {
    const module = Process.getModuleByName(TARGET_MODULE);
    if (!module) {
        setTimeout(main, 1000);
        return;
    }

    const targetAddr = module.base.add(RVA_CAMERA);
    console.log(`[+] Hooking Camera at ${targetAddr}`);
    console.log(`[+] GOD MODE: Blue Pulse Injection`);

    Interceptor.attach(targetAddr, {
        onEnter(args) {
            this.bufferPtr = args[1];
        },
        onLeave(retval) {
            if (this.bufferPtr.isNull()) return;

            tick++;
            // Slow pulse: 0 -> 255 -> 0
            const blueVal = Math.abs(Math.sin(tick * 0.1)) * 255;
            
            // 1. Sanity Check Header BEFORE write
            const h1 = this.bufferPtr.readU8();
            const h2 = this.bufferPtr.add(1).readU8();
            
            // 2. OVERWRITE LOOP
            let cursor = this.bufferPtr.add(HEADER_SIZE);
            const limit = this.bufferPtr.add(BUFFER_SIZE - BYTES_PER_KEY);

            let modifiedCount = 0;
            while (cursor < limit) {
                const keyId = cursor.readU16();
                if (keyId !== 0) {
                    cursor.add(2).writeU8(0);           // R
                    cursor.add(3).writeU8(0);           // G
                    cursor.add(4).writeU8(blueVal);     // B (Pulse)
                    modifiedCount++;
                }
                cursor = cursor.add(BYTES_PER_KEY);
            }

            // 3. Sanity Check Header AFTER write
            const h1_post = this.bufferPtr.readU8();
            const h2_post = this.bufferPtr.add(1).readU8();

            // Only log periodically
            if (tick % 60 === 0) {
                console.log(`[Tick ${tick}] RetVal: ${retval}`);
                console.log(`    Keys Modified: ${modifiedCount}`);
                console.log(`    Header Pre:  ${h1.toString(16)} ${h2.toString(16)}`);
                console.log(`    Header Post: ${h1_post.toString(16)} ${h2_post.toString(16)}`);
                
                if (h1 !== h1_post || h2 !== h2_post) {
                    console.log("    [!!!] WARNING: Header was corrupted!");
                }
                if (h2_post !== 0x03) {
                    console.log("    [!!!] WARNING: Header[1] is not 0x03. Caller will likely drop this packet.");
                }
            }
        }
    });
}

setImmediate(main);