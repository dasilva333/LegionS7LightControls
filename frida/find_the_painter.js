'use strict';

const TARGET_MODULE = 'Gaming.AdvancedLighting.dll';
const RVA_FLUSHER = 0x37990; 
const BUFFER_OFFSET = 0x10; 
const BUFFER_SIZE = 960;

let currentBuffer = null;

function main() {
    const module = Process.getModuleByName(TARGET_MODULE);
    if (!module) {
        setTimeout(main, 1000);
        return;
    }

    const flusherAddr = module.base.add(RVA_FLUSHER);
    console.log(`[+] Hooking Flusher at ${flusherAddr}`);

    Interceptor.attach(flusherAddr, {
        onEnter(args) {
            const thisPtr = args[0];
            const bufferPtr = thisPtr.add(BUFFER_OFFSET).readPointer();
            
            if (bufferPtr.isNull()) return;

            // Check if this is a NEW buffer we haven't seen/trapped yet
            if (currentBuffer === null || !bufferPtr.equals(currentBuffer)) {
                console.log(`\n[+] New Frame Buffer detected at: ${bufferPtr}`);
                
                // Remove old trap if exists
                if (currentBuffer !== null) {
                    MemoryAccessMonitor.disable();
                }

                currentBuffer = bufferPtr;
                
                // Set new trap
                try {
                    MemoryAccessMonitor.enable({
                        base: bufferPtr,
                        size: BUFFER_SIZE
                    }, {
                        onAccess: function (details) {
                            if (details.operation === 'write') {
                                console.log(`\n[!!!] CAUGHT THE PAINTER!`);
                                console.log(`      Writing to index: ${details.offset}`);
                                console.log(`      Instruction: ${details.from}`);
                                const rva = details.from.sub(module.base);
                                console.log(`      RVA: 0x${rva.toString(16)}`);
                                
                                // We found it. Stop everything to keep the log clean.
                                MemoryAccessMonitor.disable();
                                Interceptor.detachAll();
                            }
                        }
                    });
                    // console.log("    (Trap armed)");
                } catch (e) {
                    console.log("    (Failed to arm trap: " + e.message + ")");
                }
            }
        }
    });
}

setImmediate(main);