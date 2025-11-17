'use strict';

/**
 * Sends a log message back to the parent Node.js process.
 */
function log(message) {
    send({ type: 'log', payload: `[Agent] ${message}` });
}

// --- Helper: Create a C++ std::string in the target's memory ---
function createStdString(text) {
    const strPtr = Memory.alloc(32); // sizeof(std::string) on x64

    if (text.length < 16) {
        // For small strings, write the data directly into the buffer.
        strPtr.writeUtf8String(text);
        strPtr.add(0x10).writeU64(text.length);
        strPtr.add(0x18).writeU64(15); // Capacity for SSO is 15
    } else {
        // For long strings, allocate on the heap.
        const textBuffer = Memory.allocUtf8String(text);
        strPtr.writePointer(textBuffer);
        strPtr.add(0x10).writeU64(text.length);
        strPtr.add(0x18).writeU64(text.length);
    }
    return strPtr;
}

/**
 * A robust helper to read a C++ std::string object from memory.
 * Handles Small String Optimization (SSO) on MSVC x64.
 * @param {NativePointer} ptr - A pointer to the 32-byte std::string object.
 * @returns {string} The UTF-8 string content.
 */
function readStdString(ptr) {
    if (!ptr || ptr.isNull()) {
        throw new Error("readStdString received a null pointer.");
    }
    const length = ptr.add(0x10).readU64().toNumber();
    const capacity = ptr.add(0x18).readU64().toNumber();

    if (length === 0) {
        return "";
    }

    // On MSVC x64, if capacity is less than 16, the string data is inline (SSO).
    // Otherwise, the data is on the heap and the first 8 bytes of the struct are a pointer to it.
    const dataPtr = (capacity < 16) ? ptr : ptr.readPointer();

    if (dataPtr.isNull()) {
        log(`WARNING: readStdString found a null data pointer for a string of length ${length}. Returning empty string.`);
        return "";
    }

    return dataPtr.readUtf8String(length);
}

// --- Global Context for Actions ---
// This object is the shared environment that will be passed to every action.
const context = {
    MODULE_NAME: 'Gaming.AdvancedLighting.dll',
    baseAddress: null,
    nativeFunctions: {},
    hwObjectPtr: null,
    log: log,
    goldenBuffers: {
        details: null // This will be populated by the loader
    },
    utils: {
        readStdString: readStdString,
        createStdString: createStdString
    }
};

// This special comment will be replaced by the loader.js script during bundling.
context.goldenBuffers.details = new Uint8Array([
    // __GOLDEN_DETAILS_BUFFER__
]);

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