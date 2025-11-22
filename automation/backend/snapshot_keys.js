const fs = require('fs');
const path = require('path');

// --- CONFIG ---
const TARGET_PROCESS = 'LenovoVantage-(LenovoGamingUserAddin).exe';
const OUTPUT_DIR = path.join(__dirname, 'snapshots');

// Ensure output dir exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
}

const agentSource = `
    const PRIMITIVE_RVA = 0x209b0;
    const HEADER_SIZE = 4;
    const BYTES_PER_KEY = 5;
    const BUFFER_SIZE = 960;

    let baseAddress = null;
    
    // Cache the latest state here
    let lastFrameState = [];

    rpc.exports = {
        init: function() {
            const module = Process.getModuleByName('Gaming.AdvancedLighting.dll');
            if (!module) return false;
            baseAddress = module.base;
            const targetAddr = baseAddress.add(PRIMITIVE_RVA);
            
            Interceptor.attach(targetAddr, {
                onEnter(args) {
                    const bufferInfoPtr = args[2];
                    if (bufferInfoPtr.isNull()) return;
                    const dataPtr = bufferInfoPtr.readPointer();
                    if (dataPtr.isNull()) return;

                    // Check Header (07 A1 ...) to ensure it's a lighting packet
                    if (dataPtr.readU8() === 0x07 && dataPtr.add(1).readU8() === 0xA1) {
                        
                        // Capture this frame
                        const currentFrame = [];
                        let cursor = dataPtr.add(HEADER_SIZE);
                        const limit = dataPtr.add(BUFFER_SIZE - BYTES_PER_KEY);

                        while (cursor < limit) {
                            const keyId = cursor.readU16();
                            if (keyId !== 0) {
                                const r = cursor.add(2).readU8();
                                const g = cursor.add(3).readU8();
                                const b = cursor.add(4).readU8();
                                
                                currentFrame.push({ keyId, r, g, b });
                            }
                            cursor = cursor.add(BYTES_PER_KEY);
                        }
                        
                        // Update the global cache
                        lastFrameState = currentFrame;
                    }
                }
            });
            return true;
        },
        getSnapshot: function() {
            return lastFrameState;
        }
    };
`;

async function main() {
    try {
        // --- FIX: Load Frida v16 dynamically ---
        const fridaModule = await import('frida');
        const frida = fridaModule.default || fridaModule;
        // ---------------------------------------

        console.log(`[+] Attaching to ${TARGET_PROCESS}...`);
        const session = await frida.attach(TARGET_PROCESS);
        const script = await session.createScript(agentSource);

        script.message.connect(message => {
            if (message.type === 'error') console.error(message.stack);
        });

        await script.load();
        const api = script.exports;
        
        const success = await api.init();
        if (!success) {
            console.error("[-] Could not find DLL. Is Aurora Sync enabled?");
            process.exit(1);
        }

        console.log("[+] Sniffer Active. Monitoring frames...");
        console.log("------------------------------------------------");
        console.log(" [ SPACE ]  Capture Snapshot (Log & Save JSON)");
        console.log(" [ CTRL+C ] Exit");
        console.log("------------------------------------------------\n");

        // --- KEYBOARD HANDLING ---
        const stdin = process.stdin;
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding('utf8');

        stdin.on('data', async (key) => {
            // CTRL+C
            if (key === '\u0003') process.exit();

            // SPACE
            if (key === ' ') {
                console.log("\n[!] Capturing Snapshot...");
                const snapshot = await api.getSnapshot();
                
                if (snapshot.length === 0) {
                    console.log("[-] No frame data captured yet. Wait a moment.");
                    return;
                }

                // 1. Log to Console (Summary)
                console.log(`[+] Captured ${snapshot.length} active keys.`);
                // Preview first 3
                snapshot.slice(0, 3).forEach(k => {
                    console.log(`    ID: ${k.keyId} -> RGB(${k.r}, ${k.g}, ${k.b})`);
                });
                console.log("    ...");

                // 2. Save to JSON
                const filename = `snapshot_${Date.now()}.json`;
                const filepath = path.join(OUTPUT_DIR, filename);
                
                fs.writeFileSync(filepath, JSON.stringify(snapshot, null, 2));
                console.log(`[+] Saved to: ${filepath}`);
                console.log("[>] Ready for next capture.");
            }
        });

    } catch (e) {
        console.error(e);
    }
}

main();