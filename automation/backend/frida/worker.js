const path = require('path');
const fs = require('fs');
const frida = require('frida'); 

const TARGET_PROCESS = 'LenovoVantage-(LenovoGamingUserAddin).exe';
const AGENT_PATH = path.join(__dirname, 'agent.js'); // Assumes agent.js is in the same folder

// --- Load all available actions dynamically ---
const actionsDir = path.join(__dirname, 'actions');
const actions = {};

try {
    fs.readdirSync(actionsDir).forEach(file => {
        if (file.endsWith('.js')) {
            const actionName = path.basename(file, '.js');
            actions[actionName] = require(path.join(actionsDir, file));
            console.log(`[FridaWorker] Loaded action: ${actionName}`);
        }
    });
} catch (e) {
    console.error(`[FridaWorker] Could not load actions from ${actionsDir}. Error: ${e.message}`);
}
// ---------------------------------------------

let agentApi = null;

async function initializeFrida() {
    try {
        console.log(`[FridaWorker] Attaching to target process: ${TARGET_PROCESS}...`);
        const device = await frida.getLocalDevice();
        const session = await device.attach(TARGET_PROCESS);
        
        session.detached.connect((reason) => {
            console.error(`[FridaWorker] Session detached. Reason: ${reason}. Exiting worker.`);
            process.exit(1); // Exit so the proxy can restart us.
        });

        const source = fs.readFileSync(AGENT_PATH, 'utf8');
        const script = await session.createScript(source);
        
        script.message.connect(message => {
            if (message.type === 'send') {
                console.log(`[Agent] ${message.payload}`);
            } else if (message.type === 'error') {
                console.error(`[Agent Error] ${message.stack}`);
            }
        });

        await script.load();
        agentApi = script.exports;
        console.log(`[FridaWorker] Attached successfully. Ready for IPC commands.`);

    } catch (e) {
        console.error(`[FridaWorker] Frida initialization failed: ${e.message}`);
        console.error('[FridaWorker] Is Lenovo Vantage running? Retrying in 10 seconds...');
        setTimeout(initializeFrida, 10000); // Retry on failure
    }
}

// Listen for commands from the parent (proxy.js)
process.on('message', async (message) => {
    const { taskId, command, payload } = message;

    if (!agentApi) {
        process.send({ taskId, error: 'Frida agent is not yet initialized or has detached.' });
        return;
    }

    const actionFunc = actions[command];
    if (!actionFunc) {
        process.send({ taskId, error: `Unknown command received: '${command}'` });
        return;
    }

    try {
        console.log(`[FridaWorker] Executing command: ${command}`);
        const data = await actionFunc(agentApi, payload);
        process.send({ taskId, data });
    } catch (e) {
        console.error(`[FridaWorker] Error executing command '${command}': ${e.message}`);
        process.send({ taskId, error: e.message });
    }
});

// Start the initialization process.
initializeFrida();