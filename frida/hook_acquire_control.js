'use strict';

const TARGET_MODULE = 'Gaming.AdvancedLighting.dll';

// We are now focused exclusively on the ACQUIRE_CONTROL event.
const RVA_ACQUIRE_CONTROL = 0x14630;  // init_profile_detail (logs "get control")

function log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[Stack Tracer @ ${timestamp}] ${message}`);
}

function main() {
    const module = Process.getModuleByName(TARGET_MODULE);
    if (!module) {
        console.log(`[!] ${TARGET_MODULE} not found. Waiting...`);
        setTimeout(main, 1000);
        return;
    }
    console.log(`[+] Found ${TARGET_MODULE} at ${module.base}`);

    const acquireAddress = module.base.add(RVA_ACQUIRE_CONTROL);
    
    console.log(`[+] Hooking ACQUIRE_CONTROL at ${acquireAddress}`);
    Interceptor.attach(acquireAddress, {
        onEnter(args) {
            log('>>> HIT: ACQUIRE_CONTROL CALLED <<<');
            
            // --- THE FIX: Dump the call stack ---
            // Thread.backtrace() gets the return addresses.
            // DebugSymbol.fromAddress() converts them to function names and offsets.
            const callStack = Thread.backtrace(this.context, Backtracer.ACCURATE)
                .map(addr => {
                    const symbol = DebugSymbol.fromAddress(addr);
                    // Format as "ModuleName!FunctionName + offset" or just the address
                    return symbol.moduleName
                        ? `${symbol.moduleName}!${symbol.name} + 0x${addr.sub(symbol.address).toString(16)}`
                        : addr.toString();
                })
                .join('\n    '); // Indent for readability
            
            console.log(`\n    --- Call Stack ---
    ${callStack}
    --------------------\n`);
        }
    });
    
    console.log('\n[+] Hook installed. Please enable Aurora Sync in Vantage.');
}

setImmediate(main);