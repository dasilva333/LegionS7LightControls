const { mergeGodModeState } = require('../services/godmodeConfigStore');
const { sendCommand } = require('../frida/proxy');
const knex = require('../db/knex');

const CHECK_INTERVAL_MS = 5000; // Check every 5 seconds

let activeGame = null;

async function checkProcesses() {
    try {
        // Load ps-list dynamically (ESM module)
        const { default: psList } = await import('ps-list');

        // 1. Get list of monitored processes from DB
        const targets = await knex('processes').where('is_active', true).select('process_name');
        if (targets.length === 0) return;

        // 2. Get currently running processes
        const running = await psList();
        const runningNames = new Set(running.map(p => p.name.toLowerCase()));

        // 3. Check for match
        let foundGame = null;
        for (const target of targets) {
            if (runningNames.has(target.process_name.toLowerCase())) {
                foundGame = target.process_name;
                break; // Priority doesn't matter much, just grab the first one
            }
        }

        // 4. State Transition Logic
        
        // Case A: Game Started (Transition Default -> Passthrough)
        if (foundGame && !activeGame) {
            console.log(`[ProcessMonitor] GAME DETECTED: ${foundGame}. Engaging Passthrough Mode.`);
            
            // Update DB & Frida
            await mergeGodModeState({ mode: 'PASSTHROUGH' });
            await sendCommand('updateState', { mode: 'PASSTHROUGH' });
            
            activeGame = foundGame;
        }
        // Case B: Game Stopped (Transition Passthrough -> Default)
        else if (!foundGame && activeGame) {
            console.log(`[ProcessMonitor] GAME CLOSED: ${activeGame}. Resuming God Mode.`);
            
            // Update DB & Frida
            await mergeGodModeState({ mode: 'DEFAULT' });
            await sendCommand('updateState', { mode: 'DEFAULT' });
            
            activeGame = null;
        }

    } catch (err) {
        console.error('[ProcessMonitor] Error:', err.message);
    }
}

function start() {
    console.log(`[ProcessMonitor] Daemon started. Polling every ${CHECK_INTERVAL_MS/1000}s.`);
    // Initial check
    checkProcesses();
    // Loop
    setInterval(checkProcesses, CHECK_INTERVAL_MS);
}

// Auto-start
start();