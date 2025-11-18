'use strict';

const TARGET_MODULE = 'Gaming.AdvancedLighting.dll';
const RVA_CAMERA = 0x298c0; 

// Throttle logs to 1 per second (assuming ~60fps)
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
    console.log(`[+] Monitoring args[1] (The Buffer)`);

    Interceptor.attach(targetAddr, {
        onEnter(args) {
            // CORRECTED: We use args[1] (RDX), which points to the local_3d8 buffer start.
            this.bufferPtr = args[1]; 
        },
        onLeave(retval) {
            if (this.bufferPtr.isNull()) return;

            frameCount++;
            if (frameCount % LOG_INTERVAL !== 0) return;

            console.log(`\n[Tick ${frameCount}] Dumping Buffer Header (64 bytes)...`);
            
            // Read 64 bytes
            const data = this.bufferPtr.readByteArray(64);
            const uint8 = new Uint8Array(data);
            
            // Create a nice HEX view
            let hexString = '';
            for (let i = 0; i < uint8.length; i++) {
                hexString += uint8[i].toString(16).padStart(2, '0') + ' ';
                // Add a line break every 16 bytes for readability
                if ((i + 1) % 16 === 0) hexString += '\n    ';
            }
            
            console.log(`    ${hexString.trim()}`);
            
            // Quick analysis of offsets 4, 5, 6, 7, 8 (Potential Key 1)
            const b4 = uint8[4], b5 = uint8[5], b6 = uint8[6], b7 = uint8[7], b8 = uint8[8];
            console.log(`    [Offset 4-8]: ${b4.toString(16)} ${b5.toString(16)} ${b6.toString(16)} ${b7.toString(16)} ${b8.toString(16)}`);
            console.log(`    -> If KeyID is at Offset 4: ID=0x${(b5<<8|b4).toString(16)} RGB(${b6},${b7},${b8})`);
            console.log(`    -> If KeyID is at Offset 6: ID=0x${(b7<<8|b6).toString(16)} RGB(${b8},?,?)`);
        }
    });
}

setImmediate(main);