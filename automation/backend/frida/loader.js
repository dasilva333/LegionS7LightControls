'use strict';

const path = require('path');
const fs = require('fs');
const frida = require('frida');

const TARGET_PROCESS = 'LenovoVantage-(LenovoGamingUserAddin).exe';
const AGENT_CORE_PATH = path.join(__dirname, 'agent-core.js');
const AGENT_ACTIONS_PATH = path.join(__dirname, 'actions');

let agentApi = null;
let isFridaReady = false;
let messageQueue = []; // Queue for commands that arrive before Frida is ready.
const GOLDEN_BUFFER_PATH = path.join(__dirname, 'golden_details.bin'); // Path to the golden buffer

function buildAgentScript() {
    console.log('[FridaLoader] Building agent script from source files...');

    let script = fs.readFileSync(AGENT_CORE_PATH, 'utf8');
    
    // --- START: New Buffer Injection Logic ---
    if (fs.existsSync(GOLDEN_BUFFER_PATH)) {
        console.log(`[FridaLoader] Found golden buffer at: ${GOLDEN_BUFFER_PATH}`);
        const buffer = fs.readFileSync(GOLDEN_BUFFER_PATH);
        // Convert the Buffer object to a simple array of numbers, then join to a string.
        const bufferString = Array.from(buffer).join(',');
        
        // Replace the placeholder in the agent-core template.
        script = script.replace('// __GOLDEN_DETAILS_BUFFER__', bufferString);
        console.log(`[FridaLoader] Injected ${buffer.length} bytes from golden buffer into agent script.`);
    } else {
        console.warn(`[FridaLoader] WARNING: Golden buffer not found at ${GOLDEN_BUFFER_PATH}. Dispatcher may crash.`);
        // If the file isn't there, we replace the placeholder with nothing, resulting in an empty array.
        script = script.replace('// __GOLDEN_DETAILS_BUFFER__', '');
    }
    // --- END: New Buffer Injection Logic ---

    // Inject actions
    try {
        const actionFiles = fs.readdirSync(AGENT_ACTIONS_PATH).filter(f => f.endsWith('.js'));
        console.log(`[FridaLoader] Found ${actionFiles.length} actions to bundle.`);
        for (const file of actionFiles) {
            const actionCode = fs.readFileSync(path.join(AGENT_ACTIONS_PATH, file), 'utf8');
            script += `\nregisterAction(${actionCode});\n`;
        }
    } catch (e) {
        console.error(`[FridaLoader] ERROR: Could not read actions directory.`, e);
    }
    return script;
}

async function initializeFrida() {
    isFridaReady = false; // Mark as not ready during initialization
    agentApi = null;

    try {
        console.log(`[FridaLoader] Attaching to target process: ${TARGET_PROCESS}...`);
        
        const agentSource = buildAgentScript();
        const device = await frida.getLocalDevice();
        const session = await device.attach(TARGET_PROCESS);
        
        session.detached.connect((reason) => {
            console.error(`[FridaLoader] Session detached. Reason: ${reason}. Resetting and re-initializing...`);
            isFridaReady = false;
            agentApi = null;
            setTimeout(initializeFrida, 5000);
        });

        const script = await session.createScript(agentSource);
        
        script.message.connect(message => {
            if (message.type === 'send' && message.payload.type === 'log') {
                console.log(message.payload.payload);
            } else if (message.type === 'error') {
                console.error(`[Agent ERROR] ${message.stack}`);
            }
        });

        await script.load();
        agentApi = script.exports;
        
        // THE FIX: Mark Frida as ready and process any queued messages.
        isFridaReady = true;
        console.log(`[FridaLoader] Attached and agent loaded. Ready for IPC commands.`);
        processQueuedMessages();

    } catch (e) {
        console.error(`[FridaLoader] Frida initialization failed: ${e.message}`);
        console.error('[FridaLoader] Is Lenovo Vantage running? Retrying in 10 seconds...');
        setTimeout(initializeFrida, 10000);
    }
}

// Function to execute a single command.
async function executeCommand(message) {
    const { taskId, command, payload } = message;

    const actionFunc = agentApi[command];
    if (typeof actionFunc !== 'function') {
        return process.send({ taskId, error: `Unknown command: '${command}'` });
    }

    try {
        console.log(`[FridaLoader] Executing command via RPC: ${command}`);
        const data = await actionFunc(payload);
        process.send({ taskId, data });
    } catch (e) {
        console.error(`[FridaLoader] Error executing RPC command '${command}': ${e.message}`);
        process.send({ taskId, error: e.message });
    }
}

// Function to process the message queue.
function processQueuedMessages() {
    console.log(`[FridaLoader] Processing ${messageQueue.length} queued commands.`);
    while(messageQueue.length > 0) {
        const message = messageQueue.shift();
        executeCommand(message);
    }
}

// --- IPC Message Handling ---
process.on('message', (message) => {
    // THE FIX: If Frida isn't ready, queue the command. Otherwise, execute it immediately.
    if (!isFridaReady) {
        console.log(`[FridaLoader] Frida not ready. Queuing command: ${message.command}`);
        messageQueue.push(message);
    } else {
        executeCommand(message);
    }
});

// Start the initialization process.
initializeFrida();