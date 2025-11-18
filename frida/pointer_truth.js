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
            this.arg0 = args[0];
            this.arg1 = args[1];
        },
        onLeave(retval) {
            // Only log once to check alignment
            if (this.logged) return;
            this.logged = true;

            console.log(`\n[+] Pointer Truth Table:`);
            console.log(`    Arg0 (RCX): ${this.arg0}`);
            console.log(`    Arg1 (RDX): ${this.arg1}`);
            
            try {
                const diff = this.arg0.sub(this.arg1);
                console.log(`    Diff (0-1): ${diff} (Decimal: ${diff.toInt32()})`);
            } catch(e) {}

            // Dump Arg0 Data
            console.log(`\n[+] Arg0 Data (First 16 bytes):`);
            console.log(ab2hex(this.arg0.readByteArray(16)));

            // Dump Arg1 Data
            console.log(`\n[+] Arg1 Data (First 16 bytes):`);
            console.log(ab2hex(this.arg1.readByteArray(16)));
            
            console.log("\n[+] Detaching...");
            Interceptor.detachAll();
        }
    });
}

function ab2hex(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join(' ');
}

setImmediate(main);