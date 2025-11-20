
const fs = require('fs');
const path = require('path');

// --- CONFIG ---
const TARGET_PROCESS = 'LenovoVantage-(LenovoGamingUserAddin).exe';
const KEY_GROUPS_PATH = path.join(__dirname, './seeds/key_groups.json'); 
// ^ Adjust path if you run this from a different folder!

// --- PREPARE DATA ---
if (!fs.existsSync(KEY_GROUPS_PATH)) {
    console.error(`[!] Cannot find key_groups.json at: ${KEY_GROUPS_PATH}`);
    process.exit(1);
}

const keyGroups = require(KEY_GROUPS_PATH);

// Flatten and Sort keys visually (Row 0->Max, Col 0->Max)
// This ensures the dot moves Left-to-Right, Top-to-Bottom
let allKeys = [];
keyGroups.forEach(g => {
    g.keys.forEach(k => {
        allKeys.push({
            ...k,
            group: g.group_name
        });
    });
});

allKeys.sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
});

console.log(`[+] Loaded ${allKeys.length} keys for debugging.`);

// --- FRIDA AGENT SOURCE ---
const agentSource = `
    const PRIMITIVE_RVA = 0x209b0;
    const HEADER_SIZE = 4;
    const BYTES_PER_KEY = 5;
    const BUFFER_SIZE = 960;

    let baseAddress = null;
    let currentIndex = 0;
    let isPaused = false;
    let tick = 0;
    
    // Injected sorted keys
    const sortedKeys = ${JSON.stringify(allKeys)};

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

                    // Check Header (07 A1)
                    if (dataPtr.readU8() === 0x07 && dataPtr.add(1).readU8() === 0xA1) {
                        
                        // 1. Animation Logic
                        if (!isPaused) {
                            tick++;
                            // Move every 5 frames (approx 12 steps/sec)
                            if (tick % 5 === 0) {
                                currentIndex++;
                                if (currentIndex >= sortedKeys.length) currentIndex = 0;
                                // Notify Node about change
                                send({ type: 'update', index: currentIndex });
                            }
                        }

                        // 2. Render Logic
                        let cursor = dataPtr.add(HEADER_SIZE);
                        const limit = dataPtr.add(BUFFER_SIZE - BYTES_PER_KEY);
                        
                        const targetKeyId = sortedKeys[currentIndex].id;

                        while (cursor < limit) {
                            const keyId = cursor.readU16();
                            
                            if (keyId !== 0) {
                                if (keyId === targetKeyId) {
                                    // TARGET: BRIGHT RED
                                    cursor.add(2).writeU8(255); 
                                    cursor.add(3).writeU8(0);
                                    cursor.add(4).writeU8(0);
                                } else {
                                    // OTHERS: BLACK (Off)
                                    cursor.add(2).writeU8(0);
                                    cursor.add(3).writeU8(0);
                                    cursor.add(4).writeU8(0);
                                }
                            }
                            cursor = cursor.add(BYTES_PER_KEY);
                        }
                    }
                }
            });
            return true;
        },
        setPaused: function(paused) {
            isPaused = paused;
            return isPaused;
        },
        step: function(delta) {
            currentIndex += delta;
            // Wrap around
            if (currentIndex < 0) currentIndex = sortedKeys.length - 1;
            if (currentIndex >= sortedKeys.length) currentIndex = 0;
            return currentIndex;
        },
        getCurrentIndex: function() {
            return currentIndex;
        }
    };
`;

// --- MAIN HOST LOGIC ---
async function main() {
    try {
        const frida = (await import('frida')).default;
        const session = await frida.attach(TARGET_PROCESS);
        const script = await session.createScript(agentSource);

        script.message.connect(message => {
            if (message.type === 'send' && message.payload.type === 'update') {
                // Optional: Log every step if you want, but it might be spammy
                // logKeyInfo(message.payload.index); 
            }
            if (message.type === 'error') {
                console.error(message.stack);
            }
        });

        await script.load();
        const api = script.exports;
        
        const success = await api.init();
        if (!success) {
            console.error("[-] Could not find DLL. Is Aurora Sync enabled?");
            process.exit(1);
        }

        console.log("\n[+] Debugger Attached.");
        console.log("------------------------------------------------");
        console.log(" [ SPACE ]  Pause / Resume");
        console.log(" [ <- ]     Step Backward (while paused)");
        console.log(" [ -> ]     Step Forward (while paused)");
        console.log(" [ CTRL+C ] Exit");
        console.log("------------------------------------------------\n");

        let paused = false;

        // --- KEYBOARD INPUT HANDLING ---
        const stdin = process.stdin;
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding('utf8');

        stdin.on('data', async (key) => {
            // CTRL+C
            if (key === '\u0003') {
                process.exit();
            }

            // SPACE (Pause/Resume)
            if (key === ' ') {
                paused = !paused;
                await api.setPaused(paused);
                console.log(paused ? "\n[!] PAUSED" : "\n[>] RESUMED");
                if (paused) {
                    const idx = await api.getCurrentIndex();
                    logKeyInfo(idx);
                }
            }

            // LEFT ARROW (Step Back)
            if (key === '\u001b[D') { 
                if (!paused) {
                    console.log("[!] Pause first to step.");
                } else {
                    const idx = await api.step(-1);
                    logKeyInfo(idx);
                }
            }

            // RIGHT ARROW (Step Forward)
            if (key === '\u001b[C') {
                if (!paused) {
                    console.log("[!] Pause first to step.");
                } else {
                    const idx = await api.step(1);
                    logKeyInfo(idx);
                }
            }
        });

    } catch (e) {
        console.error(e);
    }
}

function logKeyInfo(index) {
    const k = allKeys[index];
    console.log(`Position ${index}: [ID: ${k.id}] Name: "${k.key_name}" | Group: "${k.group}"`);
}

main();