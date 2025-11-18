'use strict';

const TARGET_MODULE = 'Gaming.AdvancedLighting.dll';
const PRIMITIVE_RVA = 0x209b0; // The USB Sender

// Helper to format hex
function ab2hex(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join(' ');
}

function main() {
    const module = Process.getModuleByName(TARGET_MODULE);
    if (!module) {
        setTimeout(main, 1000);
        return;
    }

    const targetAddr = module.base.add(PRIMITIVE_RVA);
    console.log(`[+] Hooking Primitive Output at ${targetAddr}`);

    Interceptor.attach(targetAddr, {
        onEnter(args) {
            // args[2] (R8) is usually the buffer info pointer in these calls
            // Decomp: FUN(param_1, param_2, buffer_info_ptr)
            const bufferInfoPtr = args[2];
            
            if (bufferInfoPtr.isNull()) return;

            // The buffer info struct usually has { start_ptr, end_ptr, ... }
            // Let's dereference the first pointer to get the data.
            const dataPtr = bufferInfoPtr.readPointer();
            
            if (dataPtr.isNull()) return;

            // Read Header (First 16 bytes)
            const header = dataPtr.readByteArray(16);
            
            console.log(`\n[!] Primitive Called!`);
            console.log(`    Data Buffer: ${dataPtr}`);
            console.log(`    Hex Dump:    ${ab2hex(header)}`);
            
            // If we see 07 03 ... we know we are in the right place.
        }
    });
}

setImmediate(main);