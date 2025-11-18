// Import the Traffic Cop
const stateManager = require('../services/stateManager');

// Import the Frida Proxy directly to talk to hardware
const { sendCommand } = require('../frida/proxy');

// Database setup
const knex = require('knex')(require('../knexfile').development);

// Configuration
const CHECK_INTERVAL_MS = 30 * 1000; // Check every 30 seconds

// --- HARDCODED PROFILE IDs ---
// In the future, we could add a 'target_profile_index' column to the processes table
// so different games trigger different slots (e.g. CS:GO -> Slot 1, Destiny -> Slot 6).
const GAME_PROFILE_INDEX = 6;   // The "Aurora Sync" / Screen Sync slot
const AMBIENT_PROFILE_INDEX = 5; // The Time-of-Day / Default slot

// Local state
let localOverrideActive = false;
let activeProcessName = null;

/**
 * Main monitoring logic
 */
async function checkProcesses() {
    try {
        const { default: psList } = await import('ps-list');

        // Get monitored processes from DB
        const monitoredProcesses = await knex('processes')
            .where('is_active', true)
            .select('process_name'); // We don't rely on filename anymore

        if (monitoredProcesses.length === 0) return;

        const runningProcesses = await psList();
        const runningProcessNames = new Set(runningProcesses.map(p => p.name.toLowerCase()));

        let foundMatch = null;

        for (const monitored of monitoredProcesses) {
            if (runningProcessNames.has(monitored.process_name.toLowerCase())) {
                foundMatch = monitored;
                break; 
            }
        }

        // --- State Transition Logic ---

        // CASE A: Game Detected -> Switch to Profile 6
        if (foundMatch && !localOverrideActive) {
            console.log(`[ProcessMonitor] DETECTED: ${foundMatch.process_name}`);
            
            const granted = stateManager.requestProcessOverride(foundMatch.process_name);

            if (granted) {
                console.log(`[ProcessMonitor] Switching to Game Profile (Index ${GAME_PROFILE_INDEX})...`);
                
                // Send the command directly via Frida Proxy
                await sendCommand("setProfileIndex", { profileId: GAME_PROFILE_INDEX });
                
                localOverrideActive = true;
                activeProcessName = foundMatch.process_name;
            }
        }
        
        // CASE B: Game Lost -> Switch back to Profile 5 (Ambient)
        else if (!foundMatch && localOverrideActive) {
            console.log(`[ProcessMonitor] LOST: ${activeProcessName}. Releasing override.`);
            
            // 1. Switch hardware back to the ambient slot immediately
            console.log(`[ProcessMonitor] Reverting to Ambient Profile (Index ${AMBIENT_PROFILE_INDEX})...`);
            await sendCommand("setProfileIndex", { profileId: AMBIENT_PROFILE_INDEX });

            // 2. Tell StateManager we are done
            // (This will trigger ToD to update colors, ensuring Profile 5 has the correct time-of-day color)
            stateManager.releaseProcessOverride();
            
            localOverrideActive = false;
            activeProcessName = null;
        }

    } catch (err) {
        console.error('[ProcessMonitor] Error during check:', err);
    }
}

/**
 * Start the loop
 */
function start() {
    console.log(`[ProcessMonitor] Starting daemon. Watching processes every ${CHECK_INTERVAL_MS/1000}s...`);
    checkProcesses();
    setInterval(checkProcesses, CHECK_INTERVAL_MS);
}

start();