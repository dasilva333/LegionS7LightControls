// MUST be the very first line
process.env.EDGE_USE_CORECLR = '1';

const path = require('path');
const fs = require('fs');
const edge = require('edge-js');
const { spawn } = require('child_process');
const { promisify } = require('util');

// --- Path Configuration ---
const baseOutputPath = path.join(__dirname, '..', 'edge_bridge', 'EdgeWrapper', 'bin', 'x64', 'Debug', 'net7.0');
// ADD 'net7.0' to the path
const stableDllPath = path.join(baseOutputPath, 'Lib', 'net7.0', 'EdgeProfileWrapper.dll'); 
// ADD 'net7.0' to the path
const workerExePath = path.join(baseOutputPath, 'Exe', 'net7.0', 'EdgeProfileWorker.exe');

// --- 1. The Stable Core ---
// Direct connection via edge-js to the stable, non-crashing functions.
let stableAPI = {};
if (fs.existsSync(stableDllPath)) {
    stableAPI = {
        getActiveProfileId: edge.func({
            assemblyFile: stableDllPath,
            typeName: 'EdgeWrapper.StableService',
            methodName: 'GetActiveProfileId'
        }),
        getBrightness: edge.func({
            assemblyFile: stableDllPath,
            typeName: 'EdgeWrapper.StableService',
            methodName: 'GetBrightness'
        }),
        // ADDED: GetProfileJson
        getProfileJson: edge.func({
            assemblyFile: stableDllPath,
            typeName: 'EdgeWrapper.StableService',
            methodName: 'GetProfileJson'
        }),
        // ADDED: SetProfileIndex
        setProfileIndex: edge.func({
            assemblyFile: stableDllPath,
            typeName: 'EdgeWrapper.StableService',
            methodName: 'SetProfileIndex'
        }),
        shutdown: edge.func({
            assemblyFile: stableDllPath,
            typeName: 'EdgeWrapper.StableService',
            methodName: 'Shutdown'
        })
    };
} else {
    console.error(`[FATAL] Stable DLL not found at: ${stableDllPath}`);
}

// Promisify the stable functions for async/await syntax
const getActiveProfileIdAsync = promisify(stableAPI.getActiveProfileId || ((_, cb) => cb(new Error("Stable API not loaded"))));
const getBrightnessAsync = promisify(stableAPI.getBrightness || ((_, cb) => cb(new Error("Stable API not loaded"))));
const getProfileJsonAsync = promisify(stableAPI.getProfileJson || ((_, cb) => cb(new Error("Stable API not loaded"))));
const setProfileIndexAsync = promisify(stableAPI.setProfileIndex || ((_, cb) => cb(new Error("Stable API not loaded"))));
const shutdownAsync = promisify(stableAPI.shutdown || ((_, cb) => cb(new Error("Stable API not loaded"))));


// --- 2. The Crashable Worker Interface ---
function executeDispatcherCommand(commandJson, payloadJson) {
    if (!fs.existsSync(workerExePath)) {
        return Promise.reject(new Error(`Crashable worker executable not found at: ${workerExePath}`));
    }
    
    console.log(`[Supervisor] Spawning worker for dispatcher command...`);

    return new Promise((resolve, reject) => {
        const worker = spawn(workerExePath, [commandJson, payloadJson]);
        let stderr = '';

        worker.stdout.on('data', (data) => console.log(`[Worker] ${data.toString().trim()}`));
        worker.stderr.on('data', (data) => {
            const message = data.toString().trim();
            console.error(`[Worker] ${message}`);
            stderr += message;
        });

        worker.on('close', (code) => {
            console.log(`[Supervisor] Worker exited with code ${code}.`);
            if (code === 0) {
                resolve(true);
            } else {
                reject(new Error(`Worker process failed with exit code ${code}. Stderr: ${stderr}`));
            }
        });
        worker.on('error', reject);
    });
}


// --- 3. The Public-Facing High-Level Interfaces ---
async function setProfileByFilename(filename) {
    console.log(`[Interface] setProfileByFilename called for '${filename}'`);
    const effectsDir = path.join(__dirname, '..', '..', 'json_effects');
    const filePath = path.join(effectsDir, `${filename}.json`);

    if (!fs.existsSync(filePath)) {
        throw new Error(`Effect file not found: ${filePath}`);
    }

    const payloadObject = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return setProfileByObject(payloadObject);
}

async function setProfileByObject(layersObject) {
    console.log(`[Interface] setProfileByObject called.`);
    const payloadString = JSON.stringify(layersObject);
    return sendRawDispatcherPayload(payloadString);
}

async function sendRawDispatcherPayload(payloadJsonString) {
    console.log(`[Interface] sendRawDispatcherPayload called.`);
    
    const commandObject = {
        contract: "Gaming.AdvancedLighting",
        command: "Set-LightingProfileDetails",
        payload: payloadJsonString,
        targetAddin: null,
        cancelEvent: `Gaming.AdvancedLighting-Set-LightingProfileDetails#${Math.random().toString(16).substr(2, 8)}`,
        clientId: "Consumer",
        callerPid: process.pid
    };

    const commandJsonString = JSON.stringify(commandObject);
    return executeDispatcherCommand(commandJsonString, payloadJsonString);
}


// --- Main Entry Point ---
const allMethods = {
    // Stable functions
    'GetActiveProfileId': () => getActiveProfileIdAsync(null),
    'GetBrightness': () => getBrightnessAsync(null),
    'GetProfileJson': () => getProfileJsonAsync(null), // payload is the profile ID
    'SetProfileIndex': (payload) => setProfileIndexAsync(payload), // payload is the profile ID

    // Dispatcher functions
    'SetProfileByFilename': (payload) => setProfileByFilename(payload),
    'SetProfileByObject': (payload) => setProfileByObject(payload),
    'SendRawPayload': (payload) => sendRawDispatcherPayload(payload)
};

async function main() {
    let arg = process.argv[2];
    if (!arg) {
        console.error("[Worker] Missing action argument (JSON string or @filename)");
        process.exit(1);
    }

    if (arg.startsWith("@")) {
        const filePath = arg.slice(1);
        if (!fs.existsSync(filePath)) {
            console.error(`[Worker] Action file missing: ${filePath}`);
            process.exit(1);
        }
        arg = fs.readFileSync(filePath, 'utf8');
    }

    let action;
    try {
        action = JSON.parse(arg);
    } catch (err) {
        console.error("[Worker] Failed to parse action JSON:", err.message);
        process.exit(1);
    }

    const method = action.method;
    const payload = action.payload;

    const func = allMethods[method];
    if (!func) {
        console.error(`[Worker] Unknown method: '${method}'`);
        process.exit(1);
    }

    console.log(`[Worker] Invoking method: ${method}`);
    try {
        const result = await func(payload);
        console.log(`[Worker] Method '${method}' completed successfully. Result:`, result);
        console.log(JSON.stringify({ method, success: true, result }));
    } catch (error) {
        console.error(`[Worker] Method '${method}' failed:`, error.message || error);
        console.log(JSON.stringify({ method, success: false, error: error.message }));
        process.exit(2);
    } finally {
        try {
            await shutdownAsync(null);
            console.log("[Worker] Shutdown completed.");
        } catch(err) {
            console.error("[Worker] Shutdown failed:", err.message);
        }
    }
}

main();