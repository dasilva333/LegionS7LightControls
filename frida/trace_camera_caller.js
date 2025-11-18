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
    console.log(`[+] Tracing callers...`);

    Interceptor.attach(targetAddr, {
        onEnter(args) {
            // args[0] = RCX, args[1] = RDX
            // Save them to print context if needed
            this.arg1 = args[1];
            
            // GET THE RETURN ADDRESS
            // This tells us exactly where in the DLL code we came from
            const returnAddr = this.returnAddress;
            const callerRVA = returnAddr.sub(module.base);
            
            console.log(`\n[!] HIT! Camera called.`);
            console.log(`    Caller: ${returnAddr} (RVA: 0x${callerRVA.toString(16)})`);
            
            // Let's peek at the buffer Arg1 to see if it matches the "valid" data pattern
            // We only peek at the header (4 bytes)
            if (!this.arg1.isNull()) {
                const header = this.arg1.readByteArray(4);
                const hex = Array.from(new Uint8Array(header)).map(b => b.toString(16).padStart(2,'0')).join(' ');
                console.log(`    Arg1 Header: ${hex}`);
            }
            
            // Detach after a few hits to avoid flooding
            // We want to see if there are MULTIPLE callers or just one.
            if (this.hitCount === undefined) this.hitCount = 0;
            this.hitCount++;
            if (this.hitCount >= 5) {
                console.log("[-] Detaching...");
                Interceptor.detachAll();
            }
        }
    });
}

setImmediate(main);