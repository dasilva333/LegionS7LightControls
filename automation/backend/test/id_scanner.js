const { sendCommand } = require('../frida/proxy');

// Config
const SPEED_MS = 100; // Faster scan
const START_ID = 1;
const END_ID = 255;

async function main() {
    console.log(`[ID Scanner] Starting scan from ${START_ID} to ${END_ID}...`);
    console.log(`[ID Scanner] WATCH YOUR KEYBOARD.`);
    console.log(`[ID Scanner] Press CTRL+C to stop.`);

    // 1. Enable Engine
    await sendCommand('enable');
    
    // 2. Reset State (Clear Widgets, Weather, etc)
    await sendCommand('updateState', { 
        widgets: { 
            dayBar: { enabled: false }, 
            temperature: { enabled: false },
            audioFx: { enabled: false },
            typingFx: { enabled: false }
        },
        weather: 'CLEAR',
        stormOverride: false,
        // We DON'T set backgroundMode to NONE here, because we are about to set it to EFFECT
    });

    for (let i = START_ID; i <= END_ID; i++) {
        const hexID = '0x' + i.toString(16).toUpperCase();
        
        process.stdout.write(`\rTesting Key ID: ${i} (${hexID})   `);

        const singleKeyMap = {};
        // Use Red for high visibility
        singleKeyMap[i] = { r: 255, g: 0, b: 0 }; 

        await sendCommand('updateState', {
            backgroundMode: 'EFFECT', // <--- CRITICAL FIX: Turn the layer on!
            effectSettings: {
                colorSource: 'CUSTOM',
                effectType: 'SOLID',
                customMap: singleKeyMap
            }
        });

        await new Promise(r => setTimeout(r, SPEED_MS));
    }
    
    console.log("\nScan Complete.");
    process.exit(0);
}

main();