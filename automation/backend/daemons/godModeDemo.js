const { sendCommand } = require('../frida/proxy');

const TICK_RATE = 100; // Update every 100ms (10 FPS updates)

let simTime = 0.0;
let simTemp = 30;
let tempDirection = 1;

async function startDemo() {
    console.log('[GodModeDemo] Waiting for Frida to initialize...');
    
    // Give Frida a moment to attach on startup
    setTimeout(async () => {
        try {
            console.log('[GodModeDemo] Enabling Engine...');
            await sendCommand('enable');

            console.log('[GodModeDemo] Starting Simulation Loop...');
            
            setInterval(() => {
                // 1. Simulate Time Passing (0.0 to 1.0)
                simTime += 0.005;
                if (simTime > 1.0) simTime = 0.0;

                // 2. Simulate CPU Temp fluctuation (30 to 90)
                simTemp += tempDirection;
                if (simTemp > 90 || simTemp < 30) tempDirection *= -1;

                // 3. Send State to Frida
                // We don't await this because we don't care about the return value, just fire and forget.
                sendCommand('updateState', {
                    timeOfDay: simTime,
                    cpuTemp: simTemp,
                    weather: 'CLEAR', // Change to 'RAIN' to test rain layer
                    mode: 'DEFAULT'
                }).catch(err => console.error('[Demo Error]', err.message));

            }, TICK_RATE);

        } catch (e) {
            console.error('[GodModeDemo] Failed to start:', e.message);
        }
    }, 5000); // Wait 5 seconds after server start
}

startDemo();