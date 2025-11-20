'use strict';

function log(message) {
    send({ type: 'log', payload: `[Agent] ${message}` });
}

function createStdString(text) {
    const strPtr = Memory.alloc(32); 
    if (text.length < 16) {
        strPtr.writeUtf8String(text);
        strPtr.add(0x10).writeU64(text.length);
        strPtr.add(0x18).writeU64(15); 
    } else {
        const textBuffer = Memory.allocUtf8String(text);
        strPtr.writePointer(textBuffer);
        strPtr.add(0x10).writeU64(text.length);
        strPtr.add(0x18).writeU64(text.length);
    }
    return strPtr;
}

function readStdString(ptr) {
    if (!ptr || ptr.isNull()) throw new Error("readStdString received a null pointer.");
    const length = ptr.add(0x10).readU64().toNumber();
    const capacity = ptr.add(0x18).readU64().toNumber();
    if (length === 0) return "";
    const dataPtr = (capacity < 16) ? ptr : ptr.readPointer();
    if (dataPtr.isNull()) {
        log(`WARNING: readStdString found a null data pointer.`);
        return "";
    }
    return dataPtr.readUtf8String(length);
}

const context = {
    MODULE_NAME: 'Gaming.AdvancedLighting.dll',
    baseAddress: null,
    nativeFunctions: {},
    hwObjectPtr: null,
    log: log,
    goldenBuffers: { details: null },
    keyGroups: {},
    utils: { readStdString, createStdString }
};

context.goldenBuffers.details = new Uint8Array([
    // __GOLDEN_DETAILS_BUFFER__
]);

// FIX: Removed [] brackets here. The loader injects the full array string.
context.keyGroups = /* __KEY_GROUPS__ */ [];
context.initialState = /* __INITIAL_STATE__ */ {};
context.godMode = /* __GODMODE_MODULES__ */ {};

function defineNativeFunction(name, definition) {
    if (context.nativeFunctions[name] || !context.baseAddress) return;
    const address = definition.export
        ? Module.getExportByName(context.MODULE_NAME, definition.export)
        : context.baseAddress.add(definition.rva);
    context.nativeFunctions[name] = new NativeFunction(address, definition.signature[0], definition.signature[1]);
    log(`  -> Native function '${name}' defined at ${address}`);
}

function initialize() {
    log('Initializing agent core...');
    const module = Process.getModuleByName(context.MODULE_NAME);
    if (!module) {
        log('ERROR: Module not found.');
        return false;
    }
    context.baseAddress = module.base;
    context.hwObjectPtr = context.baseAddress.add(0x7E840);
    log(`Module ${context.MODULE_NAME} found. Base: ${context.baseAddress}`);

    defineNativeFunction('getInstance', { export: 'get_instance', signature: ['pointer', []] });
    defineNativeFunction('initProfileDetail', { rva: 0x14630, signature: ['void', ['pointer', 'pointer', 'pointer', 'pointer']] });

    return true;
}

function registerAction(actionObject) {
    if (!actionObject || !actionObject.name || typeof actionObject.action !== 'function') {
        log('ERROR: Invalid action object passed to registerAction.');
        return;
    }

    if (actionObject.dependencies) {
        log(`Defining dependencies for action: ${actionObject.name}...`);
        for (const funcName in actionObject.dependencies) {
            defineNativeFunction(funcName, actionObject.dependencies[funcName]);
        }
    }

    log(`Registering RPC export: ${actionObject.name}`);
    const result = actionObject.action(context);
    
    // This logic now works because godMode.js returns a plain Object, not a function.
    if (typeof result === 'object') {
        Object.assign(rpc.exports, result); 
    } else {
        rpc.exports[actionObject.name] = result;
    }    
}

if (initialize()) {
    log('Agent core initialized. Ready to register actions.');
    rpc.exports = {};
} else {
    log('Agent initialization failed.');
    rpc.exports = { error: "Agent initialization failed." };
}
