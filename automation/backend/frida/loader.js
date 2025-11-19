'use strict';

const path = require('path');
const fs = require('fs');
// REMOVED: const frida = require('frida'); // Frida v16 is ESM-only, we load it dynamically later.

const TARGET_PROCESS = 'LenovoVantage-(LenovoGamingUserAddin).exe';
const AGENT_CORE_PATH = path.join(__dirname, 'agent-core.js');
const AGENT_ACTIONS_PATH = path.join(__dirname, 'actions');

let agentApi = null;
let isFridaReady = false;
let messageQueue = []; 
const GOLDEN_BUFFER_PATH = path.join(__dirname, 'golden_details.bin');
const KEY_GROUPS = require('../seeds/key_groups.json');

function buildAgentScript() {
    console.log('[FridaLoader] Building agent script from source files...');

    let script = fs.readFileSync(AGENT_CORE_PATH, 'utf8');
    
    // --- Buffer Injection ---
    if (fs.existsSync(GOLDEN_BUFFER_PATH)) {
        console.log(`[FridaLoader] Found golden buffer.`);
        const buffer = fs.readFileSync(GOLDEN_BUFFER_PATH);
        const bufferString = Array.from(buffer).join(',');
        script = script.replace('// __GOLDEN_DETAILS_BUFFER__', bufferString);
    } else {
        script = script.replace('// __GOLDEN_DETAILS_BUFFER__', '');
    }

    // --- Key Group Injection ---
    // We replace the placeholder /* __KEY_GROUPS__ */ [] with the actual JSON
    script = script.replace('/* __KEY_GROUPS__ */ []', JSON.stringify(KEY_GROUPS));
    
    // Debug write
    fs.writeFileSync(path.join(__dirname, 'temp_agent.js'), script);
    
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
    isFridaReady = false; 
    agentApi = null;
    let agentSource = '';

    try {
        console.log(`[FridaLoader] Attaching to target process: ${TARGET_PROCESS}...`);
        
        // --- FIX: Dynamic Import for Frida v16 ---
        const fridaModule = await import('frida');
        const frida = fridaModule.default || fridaModule; // Handle ESM export
        // -----------------------------------------

        agentSource = buildAgentScript();
        const device = await frida.getLocalDevice();
        const session = await device.attach(TARGET_PROCESS);
        
        session.detached.connect((reason) => {
            console.error(`[FridaLoader] Session detached. Reason: ${reason}. Resetting...`);
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

        fs.writeFileSync(path.join(__dirname, 'temp_agent_2.js'), agentSource);

        await script.load();
        agentApi = script.exports;
        
        isFridaReady = true;
        console.log(`[FridaLoader] Attached and agent loaded. Ready for IPC commands.`);
        processQueuedMessages();

    } catch (e) {
        if(agentSource) fs.writeFileSync(path.join(__dirname, 'temp_agent_error.js'), agentSource);
        
        console.error(`[FridaLoader] Frida initialization failed: ${e.message}`);
        console.error('[FridaLoader] Is Lenovo Vantage running? Retrying in 10 seconds...');
        setTimeout(initializeFrida, 10000);
    }
}

async function executeCommand(message) {
    const { taskId, command, payload } = message;

    const actionFunc = agentApi[command];
    if (typeof actionFunc !== 'function') {
        return process.send({ taskId, error: `Unknown command: '${command}'` });
    }

    try {
        const data = await actionFunc(payload);
        process.send({ taskId, data });
    } catch (e) {
        console.error(`[FridaLoader] Error executing RPC command '${command}': ${e.message}`);
        process.send({ taskId, error: e.message });
    }
}

function processQueuedMessages() {
    while(messageQueue.length > 0) {
        const message = messageQueue.shift();
        executeCommand(message);
    }
}

process.on('message', (message) => {
    if (!isFridaReady) {
        console.log(`[FridaLoader] Frida not ready. Queuing command: ${message.command}`);
        messageQueue.push(message);
    } else {
        executeCommand(message);
    }
});

initializeFrida();