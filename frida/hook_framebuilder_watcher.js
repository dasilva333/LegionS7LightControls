'use strict';

const TARGET_MODULE = 'Gaming.AdvancedLighting.dll';
const RVA_FRAME_BUILDER = 0x37990; // FUN_180037990, the function we know is in the render loop

// This is a global flag to ensure we only print the discovery once.
let foundSetterFunction = false;

function main() {
    console.log('[+] Frame Builder Watcher started.');
    
    const module = Process.getModuleByName(TARGET_MODULE);
    if (!module) {
        console.log(`[!] ${TARGET_MODULE} not found. Waiting...`);
        setTimeout(main, 1000);
        return;
    }
    console.log(`[+] Found ${TARGET_MODULE} at ${module.base}`);

    const builderAddress = module.base.add(RVA_FRAME_BUILDER);
    
    console.log(`[+] Hooking FrameBuilder function at ${builderAddress}`);
    
    Interceptor.attach(builderAddress, {
        onEnter(args) {
            // If we've already found our target, we don't need to do anything more.
            if (foundSetterFunction) {
                return;
            }
            
            const objectPtr = args[0]; // This is the 'this' pointer (param_1)
            
            // This is the memory address of the member variable we want to watch.
            // It's the pointer at offset +0x10 inside the object.
            const memberToWatch = objectPtr.add(0x10);
            
            try {
                // We set up a one-time memory access monitor.
                // It will trigger when any code writes to this 8-byte memory location.
                MemoryAccessMonitor.enable({ base: memberToWatch, size: 8 }, {
                    onAccess(details) {
                        // This callback fires when a write occurs.
                        // 'details.from' is the address of the instruction that performed the write.
                        const writerAddress = details.from;
                        
                        console.log(`\n--- !!! MEMORY WRITE DETECTED !!! ---`);
                        console.log(`[+] The member at ${memberToWatch} was written to.`);
                        console.log(`[+] The writer function is at address: ${writerAddress}`);
                        
                        // Calculate the RVA, which is what we need for Ghidra and future hooks.
                        const writerRva = writerAddress.sub(module.base);
                        console.log(`\n>>> This is the 'Key Setter' function RVA: 0x${writerRva.toString(16)} <<<`);
                        
                        // We found what we were looking for.
                        foundSetterFunction = true;
                        
                        // We can now detach all hooks to stop logging.
                        Interceptor.detachAll();
                        console.log('\n[+] Target function found. Detaching hooks. You can now close this script.');
                    }
                });
            } catch (e) {
                console.error(`[!] Failed to set up MemoryAccessMonitor: ${e.message}`);
            }
        },
        onLeave(retval) {
            // Clean up the monitor if it's still active.
            MemoryAccessMonitor.disable();
        }
    });

    console.log('\n[+] Hook installed. Enable a software-controlled effect (like Aurora Sync) to trigger the watcher.');
}

setImmediate(main);