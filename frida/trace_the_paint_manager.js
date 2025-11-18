'use strict';

const TARGET_MODULE = 'Gaming.AdvancedLighting.dll';
const RVA_FLUSHER = 0x37990; 

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
            console.log('\n[+] Flusher Called! Tracing back to the Manager...');
            
            // This prints the hierarchy of functions that called us
            console.log(
                Thread.backtrace(this.context, Backtracer.ACCURATE)
                .map(DebugSymbol.fromAddress)
                .join('\n')
            );

            // We only need one trace
            Interceptor.detachAll();
        }
    });
}

setImmediate(main);