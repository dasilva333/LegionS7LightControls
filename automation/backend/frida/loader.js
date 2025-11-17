'use strict';

const path = require('path');
const fs = require('fs');
const frida = require('frida');

// --- Configuration ---
const TARGET_PROCESS = 'LenovoVantage-(LenovoGamingUserAddin).exe';
const AGENT_CORE_PATH = path.join(__dirname, 'agent-core.js'); // The main template
const AGENT_ACTIONS_PATH = path.join(__dirname, 'actions');   // The folder with our modular actions

let agentApi = null;

/**
 * Dynamically builds the complete agent script in memory by concatenating the core
 * loader with all the individual action files. This is our "on-the-fly webpack".
 * @returns {string} The complete agent script as a single string.
 */
function buildAgentScript() {
    console.log('[FridaWorker] Building agent script...');

    // 1. Start with the core loader code.
    let script = fs.readFileSync(AGENT_CORE_PATH, 'utf8');
    
    // 2. Find all action files and append them to the script.
    try {
        const actionFiles = fs.readdirSync(AGENT_ACTIONS_PATH).filter(f => f.endsWith('.js'));
        console.log(`[FridaWorker] Found ${actionFiles.length} actions to bundle.`);
        
        for (const file of actionFiles) {
            const actionCode = fs.readFileSync(path.join(AGENT_ACTIONS_PATH, file), 'utf8');
            // Wrap the content of each action file in the registerAction call.
            script += `\nregisterAction(${actionCode});\n`;
        }
    } catch (e) {
        console.error(`[FridaWorker] ERROR: Could not read actions directory at ${AGENT_ACTIONS_PATH}.`, e);
    }

    console.log(`[FridaWorker] Agent script built successfully (${script.length} bytes).`);
    return script;
}

async function initializeFrida() {
    try {
        console.log(`[FridaWorker] Attaching to target process: ${TARGET_PROCESS}...`);
        
        // Build the script from our modular files first.
        const agentSource = buildAgentScript();

        const device = await frida.getLocalDevice();
        const session = await device.attach(TARGET_PROCESS);
        
        session.detached.connect((reason) => {
            console.error(`[FridaWorker] Session detached. Reason: ${reason}. Resetting agent and attempting to re-initialize.`);
            agentApi = null;
            setTimeout(initializeFrida, 5000); // Attempt to reconnect after a delay
        });

        const script = await session.createScript(agentSource);
        
        script.message.connect(message => {
            // Forward logs from the agent to this worker's console
            if (message.type === 'send' && message.payload.type === 'log') {
                console.log(message.payload.payload); // Log the message content
            } else if (message.type === 'error') {
                console.error(`[Agent ERROR] ${message.stack}`);
            }
        });

        await script.load();
        agentApi = script.exports;
        console.log(`[FridaWorker] Attached and agent loaded. Ready for IPC commands.`);

    } catch (e) {
        console.error(`[FridaWorker] Frida initialization failed: ${e.message}`);
        console.error('[FridaWorker] Is Lenovo Vantage running? Retrying in 10 seconds...');
        setTimeout(initializeFrida, 10000); // Retry on failure
    }
}

// --- IPC Message Handling ---
// Listen for commands from the parent process (proxy.js).
process.on('message', async (message) => {
    const { taskId, command, payload } = message;

    if (!agentApi) {
        process.send({ taskId, error: 'Frida agent is not yet initialized or has detached.' });
        return;
    }

    // The RPC functions are now directly on the agentApi object.
    const actionFunc = agentApi[command];
    if (typeof actionFunc !== 'function') {
        process.send({ taskId, error: `Unknown command or not an exported RPC function: '${command}'` });
        return;
    }

    try {
        console.log(`[FridaWorker] Executing command via RPC: ${command}`);
        const data = await actionFunc(payload);
        process.send({ taskId, data });
    } catch (e) {
        console.error(`[FridaWorker] Error executing RPC command '${command}': ${e.message}`);
        process.send({ taskId, error: e.message });
    }
});

// Start the entire process.
initializeFrida();