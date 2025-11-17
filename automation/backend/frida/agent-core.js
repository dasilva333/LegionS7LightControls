'use strict';

/**
 * Sends a log message back to the parent Node.js process.
 */
function log(message) {
    send({ type: 'log', payload: `[Agent] ${message}` });
}

// --- Global Context for Actions ---
// This object is the shared environment that will be passed to every action.
const context = {
    MODULE_NAME: 'Gaming.AdvancedLighting.dll',
    baseAddress: null,
    nativeFunctions: {}, // Will contain ALL native functions, core and action-specific
    hwObjectPtr: null,   // The fundamental hardware context pointer
    log: log
};

/**
 * A central function to define and create a Frida NativeFunction.
 * It's available for both the core and for individual actions.
 * @param {string} name - The friendly name for the function (e.g., 'getBrightness').
 * @param {object} definition - An object with { rva?, export?, signature }.
 */
function defineNativeFunction(name, definition) {
    if (context.nativeFunctions[name] || !context.baseAddress) {
        return;
    }
    const address = definition.export 
        ? Module.getExportByName(context.MODULE_NAME, definition.export) 
        : context.baseAddress.add(definition.rva);
    
    context.nativeFunctions[name] = new NativeFunction(address, definition.signature[0], definition.signature[1]);
    log(`  -> Native function '${name}' defined at ${address}`);
}

/**
 * Performs the initial, one-time setup of the agent.
 * Finds the module base address and initializes CORE, SHARED native functions.
 */
function initialize() {
    log('Initializing agent core...');
    const module = Process.getModuleByName(context.MODULE_NAME);
    if (!module) {
        log('ERROR: Module not found. The agent will be unusable.');
        return false;
    }
    context.baseAddress = module.base;
    context.hwObjectPtr = context.baseAddress.add(0x7E840); // Fundamental pointer
    log(`Module ${context.MODULE_NAME} found. Base: ${context.baseAddress}, HW Object: ${context.hwObjectPtr}`);

    // --- Define CORE, SHARED native functions that almost every action will need ---
    log('Defining core native functions...');
    defineNativeFunction('getInstance', { 
        export: 'get_instance', 
        signature: ['pointer', []] 
    });
    defineNativeFunction('initProfileDetail', { 
        rva: 0x14630, 
        signature: ['void', ['pointer', 'pointer', 'pointer', 'pointer']] 
    });
    // --- End of core function definitions ---
    
    return true;
}

/**
 * Called by the bundled script for each action file.
 * It registers the action's SPECIFIC dependencies and exports its function to RPC.
 * @param {object} actionObject - The object exported by an action file.
 */
function registerAction(actionObject) {
    if (!actionObject || !actionObject.name || typeof actionObject.action !== 'function') {
        log('ERROR: Invalid action object passed to registerAction.');
        return;
    }

    // 1. Let the action declare only the NATIVE FUNCTIONS IT SPECIFICALLY NEEDS.
    if (actionObject.dependencies && typeof actionObject.dependencies === 'object') {
        log(`Defining dependencies for action: ${actionObject.name}...`);
        for (const funcName in actionObject.dependencies) {
            defineNativeFunction(funcName, actionObject.dependencies[funcName]);
        }
    }

    // 2. Create the final RPC function by passing the fully populated context to the factory.
    log(`Registering RPC export: ${actionObject.name}`);
    rpc.exports[actionObject.name] = actionObject.action(context);
}


// --- Agent Startup ---
if (initialize()) {
    log('Agent core initialized. Ready to register actions.');
    rpc.exports = {};
} else {
    log('Agent initialization failed. RPC will not be available.');
    rpc.exports = {
        error: "Agent initialization failed. Check logs."
    };
}