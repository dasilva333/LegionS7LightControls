'use strict';

const TARGET_MODULE = 'Gaming.AdvancedLighting.dll';

// --- RVAs from your research documents ---
const RVA_ACQUIRE_CONTROL = 0x14630;  // init_profile_detail (logs "get control")
const RVA_RELEASE_CONTROL = 0x14cb0;  // stop_expand_animation (logs "release control")
const RVA_SCREENSYNC_START = 0x13eb0; // Set-ScreenToKeyboard (spawns thread)

// Potential new targets to watch
const RVA_PROFILE_WRITER = 0x11380;   // Set-LightingProfileDetails (writer)
const RVA_SET_PROFILE_INDEX = 0x13650; // Set-LightingProfileIndex

function log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[Event Hunter @ ${timestamp}] ${message}`);
}

function attachAndLog(module, name, rva) {
    try {
        const address = module.base.add(rva);
        Interceptor.attach(address, {
            onEnter(args) {
                log(`>>> HIT: ${name} (RVA: 0x${rva.toString(16)}) CALLED <<<`);
                // Optional: For deep debugging, uncomment to see the call stack
                // log(`    Call Stack:\n${Thread.backtrace(this.context, Backtracer.ACCURATE).map(DebugSymbol.fromAddress).join('\n')}`);
            }
        });
        console.log(`[+] Hooked ${name} at ${address}`);
    } catch (e) {
        console.error(`[!] Failed to hook ${name} at RVA 0x${rva.toString(16)}: ${e.message}`);
    }
}

function main() {
    const module = Process.getModuleByName(TARGET_MODULE);
    if (!module) {
        console.log(`[!] ${TARGET_MODULE} not found. Waiting...`);
        setTimeout(main, 1000);
        return;
    }
    console.log(`[+] Found ${TARGET_MODULE} at ${module.base}`);

    // --- Attach to all our primary targets ---
    attachAndLog(module, 'ACQUIRE_CONTROL', RVA_ACQUIRE_CONTROL);
    attachAndLog(module, 'RELEASE_CONTROL', RVA_RELEASE_CONTROL);
    attachAndLog(module, 'SCREENSYNC_START', RVA_SCREENSYNC_START);
    
    // --- Attach to secondary targets ---
    attachAndLog(module, 'PROFILE_WRITER', RVA_PROFILE_WRITER);
    attachAndLog(module, 'SET_PROFILE_INDEX', RVA_SET_PROFILE_INDEX);
    
    console.log('\n[+] All hooks installed. Switch between software-controlled profiles (Audio, Screen Sync, etc.).');
}

setImmediate(main);