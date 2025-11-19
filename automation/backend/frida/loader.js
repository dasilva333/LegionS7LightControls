'use strict';

const path = require('path');
const fs = require('fs');
const frida = require('frida');

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
    
    // Buffer Injection
    if (fs.existsSync(GOLDEN_BUFFER_PATH)) {
        console.log(`[FridaLoader] Found golden buffer.`);
        const buffer = fs.readFileSync(GOLDEN_BUFFER_PATH);
        const bufferString = Array.from(buffer).join(',');
        script = script.replace('// __GOLDEN_DETAILS_BUFFER__', bufferString);
    } else {
        script = script.replace('// __GOLDEN_DETAILS_BUFFER__', '');
    }

    // FIX: Target the exact string in agent-core.js
    // We replace the empty array and comment with the real JSON array.
    script = script.replace('/* __KEY_GROUPS__ */ []', JSON.stringify(KEY_GROUPS));
    
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

    try {
        console.log(`[FridaLoader] Attaching to target process: ${TARGET_PROCESS}...`);
        
        const agentSource = buildAgentScript();
        const device = await frida.getLocalDevice();
        const session = await device.attach(TARGET_PROCESS);
        
        session.detached.connect((reason) => {
            console.error(`[FridaLoader] Session detached. Reason: ${reason}.`);
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
        
        isFridaReady = true;
        console.log(`[FridaLoader] Attached and agent loaded. Ready for IPC commands.`);
        processQueuedMessages();

    } catch (e) {
        console.error(`[FridaLoader] Frida initialization failed: ${e.message}`);
        setTimeout(initializeFrida, 10000);
    }
}

async function executeCommand(message) {
    const { taskId, command, payload } = message;

    // agentApi[command] will now exist because we merged the object in agent-core
    const actionFunc = agentApi[command];
    if (typeof actionFunc !== 'function') {
        return process.send({ taskId, error: `Unknown command: '${command}'` });
    }

    try {
        // console.log(`[FridaLoader] Executing command via RPC: ${command}`);
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