'use strict';

const TARGET_MODULE = 'Gaming.AdvancedLighting.dll';
const RVA_CAMERA = 0x298c0;

function main() {
    const module = Process.getModuleByName(TARGET_MODULE);
    if (!module) {
        setTimeout(main, 1000);
        return;
    }

    const targetAddr = module.base.add(RVA_CAMERA);
    console.log(`[+] Hooking Camera at ${targetAddr}`);

    Interceptor.attach(targetAddr, {
        onEnter(args) {
            // Save the buffer pointer (RDX / args[1])
            this.bufferPtr = args[1];
        },
        onLeave(retval) {
            if (this.bufferPtr.isNull()) return;

            // Read the header (first 6 bytes)
            const header = this.bufferPtr.readByteArray(6);
            
            // Read the first entry (next 5 bytes)
            const firstKey = this.bufferPtr.add(6).readByteArray(5);

            // Dump to console so we can see the structure
            console.log(`[Camera Return] Ret: ${retval}`);
            console.log(`   Header: ${ab2hex(header)}`);
            console.log(`   Key #1: ${ab2hex(firstKey)}`);
            
            // Only print once to avoid spamming
            Interceptor.detachAll();
            console.log("[+] Dump complete. Detaching.");
        }
    });
}

// Helper to make hex strings readable
function ab2hex(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join(' ');
}

setImmediate(main);