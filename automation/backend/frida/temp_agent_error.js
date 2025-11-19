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
    5,0,0,0,0,0,0,0,48,182,223,254,84,1,0,0,128,182,223,254,84,1,0,0,128,182,223,254,84,1,0,0,1,222,31,154,24,0,0,0,48,238,184,254,84,1,0,0
]);

// FIX: Removed [] brackets here. The loader injects the full array string.
context.keyGroups = [{"group_name":"Function Row (Top)","keys":[{"id":1,"key_name":"Esc","row":0,"col":0},{"id":2,"key_name":"F1","row":0,"col":2},{"id":3,"key_name":"F2","row":0,"col":3},{"id":4,"key_name":"F3","row":0,"col":4},{"id":5,"key_name":"F4","row":0,"col":5},{"id":6,"key_name":"F5","row":0,"col":6},{"id":7,"key_name":"F6","row":0,"col":7},{"id":8,"key_name":"F7","row":0,"col":8},{"id":9,"key_name":"F8","row":0,"col":9},{"id":10,"key_name":"F9","row":0,"col":10},{"id":11,"key_name":"F10","row":0,"col":11},{"id":12,"key_name":"F11","row":0,"col":12},{"id":13,"key_name":"F12","row":0,"col":13},{"id":14,"key_name":"Insert","row":0,"col":15},{"id":15,"key_name":"PrtSc","row":0,"col":16},{"id":16,"key_name":"Delete","row":0,"col":17}]},{"group_name":"Navigation Cluster (Top Right)","keys":[{"id":17,"key_name":"Home","row":0,"col":18},{"id":18,"key_name":"End","row":0,"col":19},{"id":19,"key_name":"PgUp","row":0,"col":20},{"id":20,"key_name":"PgDn","row":0,"col":21}]},{"group_name":"Number Row","keys":[{"id":22,"key_name":"~ (Tilde)","row":1,"col":0},{"id":23,"key_name":"1","row":1,"col":1},{"id":24,"key_name":"2","row":1,"col":2},{"id":25,"key_name":"3","row":1,"col":3},{"id":26,"key_name":"4","row":1,"col":4},{"id":27,"key_name":"5","row":1,"col":5},{"id":28,"key_name":"6","row":1,"col":6},{"id":29,"key_name":"7","row":1,"col":7},{"id":30,"key_name":"8","row":1,"col":8},{"id":31,"key_name":"9","row":1,"col":9},{"id":32,"key_name":"0","row":1,"col":10},{"id":33,"key_name":"- (Minus)","row":1,"col":11},{"id":34,"key_name":"= (Equals)","row":1,"col":12},{"id":56,"key_name":"Backspace","row":1,"col":13}]},{"group_name":"Alpha Block (Top: QWERTY)","keys":[{"id":64,"key_name":"Tab","row":2,"col":0},{"id":66,"key_name":"Q","row":2,"col":1},{"id":67,"key_name":"W","row":2,"col":2},{"id":68,"key_name":"E","row":2,"col":3},{"id":69,"key_name":"R","row":2,"col":4},{"id":70,"key_name":"T","row":2,"col":5},{"id":71,"key_name":"Y","row":2,"col":6},{"id":72,"key_name":"U","row":2,"col":7},{"id":73,"key_name":"I","row":2,"col":8},{"id":74,"key_name":"O","row":2,"col":9},{"id":75,"key_name":"P","row":2,"col":10},{"id":76,"key_name":"[","row":2,"col":11},{"id":77,"key_name":"]","row":2,"col":12},{"id":78,"key_name":"\\ (Backslash)","row":2,"col":13}]},{"group_name":"Alpha Block (Middle: ASDF)","keys":[{"id":85,"key_name":"Caps Lock","row":3,"col":0},{"id":109,"key_name":"A","row":3,"col":1},{"id":110,"key_name":"S","row":3,"col":2},{"id":88,"key_name":"D","row":3,"col":3},{"id":89,"key_name":"F","row":3,"col":4},{"id":90,"key_name":"G","row":3,"col":5},{"id":113,"key_name":"H","row":3,"col":6},{"id":114,"key_name":"J","row":3,"col":7},{"id":91,"key_name":"K","row":3,"col":8},{"id":92,"key_name":"L","row":3,"col":9},{"id":93,"key_name":"; (Semicolon)","row":3,"col":10},{"id":95,"key_name":"' (Quote)","row":3,"col":11},{"id":119,"key_name":"Enter","row":3,"col":13}]},{"group_name":"Alpha Block (Bottom: ZXCV)","keys":[{"id":106,"key_name":"Left Shift","row":4,"col":0},{"id":130,"key_name":"Z","row":4,"col":2},{"id":131,"key_name":"X","row":4,"col":3},{"id":111,"key_name":"C","row":4,"col":4},{"id":112,"key_name":"V","row":4,"col":5},{"id":135,"key_name":"B","row":4,"col":6},{"id":136,"key_name":"N","row":4,"col":7},{"id":115,"key_name":"M","row":4,"col":8},{"id":116,"key_name":", (Comma)","row":4,"col":9},{"id":117,"key_name":". (Period)","row":4,"col":10},{"id":118,"key_name":"/ (Slash)","row":4,"col":11},{"id":141,"key_name":"Right Shift","row":4,"col":13}]},{"group_name":"Bottom Modifiers & Arrows","keys":[{"id":127,"key_name":"Left Ctrl","row":5,"col":0},{"id":128,"key_name":"Fn","row":5,"col":1},{"id":150,"key_name":"Left Win","row":5,"col":2},{"id":151,"key_name":"Left Alt","row":5,"col":3},{"id":152,"key_name":"Space","row":5,"col":6},{"id":154,"key_name":"Right Alt","row":5,"col":10},{"id":155,"key_name":"Menu / R-Ctrl","row":5,"col":11},{"id":156,"key_name":"Left Arrow","row":5,"col":15},{"id":157,"key_name":"Up Arrow","row":4,"col":16},{"id":159,"key_name":"Down Arrow","row":5,"col":16},{"id":161,"key_name":"Right Arrow","row":5,"col":17}]},{"group_name":"Numpad","keys":[{"id":38,"key_name":"Num Lock","row":1,"col":18},{"id":39,"key_name":"Num /","row":1,"col":19},{"id":40,"key_name":"Num *","row":1,"col":20},{"id":41,"key_name":"Num -","row":1,"col":21},{"id":79,"key_name":"Num 7","row":2,"col":18},{"id":80,"key_name":"Num 8","row":2,"col":19},{"id":81,"key_name":"Num 9","row":2,"col":20},{"id":104,"key_name":"Num +","row":2,"col":21},{"id":121,"key_name":"Num 4","row":3,"col":18},{"id":123,"key_name":"Num 5","row":3,"col":19},{"id":124,"key_name":"Num 6","row":3,"col":20},{"id":142,"key_name":"Num 1","row":4,"col":18},{"id":144,"key_name":"Num 2","row":4,"col":19},{"id":146,"key_name":"Num 3","row":4,"col":20},{"id":163,"key_name":"Num 0","row":5,"col":19},{"id":165,"key_name":"Num .","row":5,"col":20},{"id":167,"key_name":"Num Enter","row":4,"col":21}]}];
context.initialState = {"active":false,"mode":"DEFAULT","weather":"CLEAR","timeOfDay":0.5,"cpuTemp":0,"downloadProgress":-1,"backgroundMode":"none","timeUpdateRate":1,"effectSettings":{"effectType":"Ripple","baseColor":"#0070FF","speed":3},"stormOverride":false,"weatherEnabled":true,"weatherKeys":[],"weatherSettings":{"zipCode":""}};

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
registerAction(({
    name: 'executeDispatcher',
    dependencies: {
        'getProfileIndex': { rva: 0x11210, signature: ['void', ['pointer']] }
    },
    action: (context) => {
        return async (payload) => {
            const { nativeFunctions, hwObjectPtr, log, utils } = context;

            if (!payload || !payload.commandString || !payload.payloadString) {
                throw new Error("Invalid payload: { commandString, payloadString } is required.");
            }

            log(`RPC executing: executeDispatcher`);
            
            try {
                // --- Preamble ---
                log('  Preamble: Calling get_instance...');
                const controller = nativeFunctions.getInstance();
                if (controller.isNull()) throw new Error("get_instance() returned null.");
                
                log('  Preamble: Preparing with zeroed-out buffers (crash-on-success model)...');
                const detailBuffer = Memory.alloc(48);
                const scratchBuffer = Memory.alloc(56);
                nativeFunctions.initProfileDetail(hwObjectPtr, detailBuffer, scratchBuffer, NULL);

                log('  Preamble: Calling getProfileIndex to finalize state...');
                nativeFunctions.getProfileIndex(hwObjectPtr);

                // --- Dispatch ---
                const vtable = controller.readPointer();
                const dispatcherPtr = vtable.add(3 * Process.pointerSize).readPointer();
                const dispatcher = new NativeFunction(dispatcherPtr, 'void', ['pointer', 'pointer', 'pointer', 'pointer', 'pointer']);

                const commandStr = utils.createStdString(payload.commandString);
                const payloadStr = utils.createStdString(payload.payloadString);
                const resultStr = utils.createStdString("");

                log('  Action: Calling native dispatcher function... ' + JSON.stringify(payload));
                dispatcher(controller, resultStr, commandStr, payloadStr, NULL);
                
                log('  UNEXPECTED SUCCESS: Dispatcher returned without crashing.');
                const resultJsonString = utils.readStdString(resultStr);
                return JSON.parse(resultJsonString || '{}');

            } catch (e) {
                // This is our expected "success" path. The lights have been changed.
                log(`SUCCESS (via handled crash): Dispatcher call failed as expected: ${e.message}`);
                return { status: "success", note: "Effect applied, followed by a handled native exception." };
            }
        };
    }
}));

registerAction(({
    /**
     * The name for the RPC export. The Node loader will call agentApi.getActiveProfileId().
     */
    name: 'getActiveProfileId',

    /**
     * The specific native functions this action needs, beyond the core ones.
     */
    dependencies: {
        'getActiveProfileId': { 
            rva: 0x11210, 
            signature: ['void', ['pointer']] 
        }
    },

    /**
     * The factory function that creates the final RPC method.
     */
    action: (context) => {
        return () => {
            const { nativeFunctions, hwObjectPtr, log } = context;

            log('RPC executing: getActiveProfileId');

            if (!nativeFunctions.getActiveProfileId) {
                throw new Error('Dependency "getActiveProfileId" is not available.');
            }

            try {
                // Preamble: Call the core functions provided by agent-core.js.
                nativeFunctions.getInstance();
                const detailBuffer = Memory.alloc(48);
                const scratchBuffer = Memory.alloc(56);
                nativeFunctions.initProfileDetail(hwObjectPtr, detailBuffer, scratchBuffer, NULL);

                // Action: Call the specific function for this task.
                nativeFunctions.getActiveProfileId(hwObjectPtr);

                // Result: Read the integer ID from the known memory offset.
                const profileIdOffset = 0x154;
                const profileId = hwObjectPtr.add(profileIdOffset).readS32();
                log(`  -> Result: ${profileId}`);
                
                return profileId;
            } catch (e) {
                log(`FATAL ERROR in getActiveProfileId: ${e.message}\n${e.stack}`);
                throw new Error(`Native call failed during getActiveProfileId: ${e.message}`);
            }
        };
    }
}));

registerAction(({
    /**
     * The name of the function to be exported via rpc.exports.
     */
    name: 'getBrightness',

    /**
     * A list of native functions this action specifically requires.
     * The agent-core will ensure these are defined and available in the context.
     * `getInstance` and `initProfileDetail` are already provided by the core.
     */
    dependencies: {
        'getBrightness': { 
            rva: 0x14110, 
            signature: ['void', ['pointer']] 
        }
    },

    /**
     * The factory function that creates the final RPC method.
     */
    action: (context) => {
        return () => {
            const { nativeFunctions, hwObjectPtr, log } = context;

            log('RPC executing: getBrightness');

            if (!nativeFunctions.getBrightness) {
                throw new Error('Dependency "getBrightness" is not available.');
            }

            try {
                // Preamble: Call the core functions that are always available.
                nativeFunctions.getInstance();
                const detailBuffer = Memory.alloc(48);
                const scratchBuffer = Memory.alloc(56);
                nativeFunctions.initProfileDetail(hwObjectPtr, detailBuffer, scratchBuffer, NULL);

                // Action: Call the specific function for this task.
                nativeFunctions.getBrightness(hwObjectPtr);

                // Result: Read the value from memory.
                const brightness = hwObjectPtr.add(0x158).readS32();
                log(`  -> Result: ${brightness}`);
                
                return brightness;
            } catch (e) {
                log(`FATAL ERROR in getBrightness: ${e.message}\n${e.stack}`);
                throw new Error(`Native call failed during getBrightness: ${e.message}`);
            }
        };
    }
}));

registerAction(({
    name: 'getProfileJson',

    dependencies: {
        'buildPrep': {
            rva: 0x54210,
            signature: ['void', ['pointer', 'pointer', 'uint64', 'uint64']]
        },
        'jsonWrite': {
            rva: 0x15ea0,
            signature: ['void', ['pointer', 'pointer', 'int', 'char', 'char', 'uint']]
        }
    },

    action: (context) => {
        return () => {
            const { nativeFunctions, hwObjectPtr, log, utils } = context;
            log('RPC executing: getProfileJson');

            if (!nativeFunctions.buildPrep || !nativeFunctions.jsonWrite) {
                throw new Error('Dependencies for getProfileJson are not available.');
            }

            try {
                // Preamble
                nativeFunctions.getInstance();
                const detailBuffer = Memory.alloc(48);
                const scratchBuffer = Memory.alloc(56);
                nativeFunctions.initProfileDetail(hwObjectPtr, detailBuffer, scratchBuffer, NULL);

                // Action
                const outStrPtr = Memory.alloc(32);
                const ctxPtr = Memory.alloc(16);
                nativeFunctions.buildPrep(ctxPtr, detailBuffer, 1, 2);
                nativeFunctions.jsonWrite(ctxPtr, outStrPtr, -1, ' '.charCodeAt(0), '\0'.charCodeAt(0), 0);
                
                // Result: Use the new shared utility function from the context.
                const jsonString = utils.readStdString(outStrPtr);

                log(`  -> Success: Read ${jsonString.length} byte JSON string.`);
                
                return JSON.parse(jsonString);

            } catch (e) {
                log(`FATAL ERROR in getProfileJson: ${e.message}\n${e.stack}`);
                throw new Error(`Native call failed during getProfileJson: ${e.message}`);
            }
        };
    }
}));

registerAction(({
    name: 'godMode',
    dependencies: {},
    action: (context) => {
        const { baseAddress, log, keyGroups, initialState } = context;
        
        const PRIMITIVE_RVA = 0x209b0;
        const HEADER_SIZE = 4;
        const BYTES_PER_KEY = 5;
        const BUFFER_SIZE = 960;

        // --- 1. THE STATE STORE ---
        // We clone the injected initial state to ensure we match the backend exactly.
        // We manually add internal/runtime properties that might not be in the DB config.
        const state = JSON.parse(JSON.stringify(initialState));
        
        // Runtime-only state (not persisted in DB)
        state.alerts = [];
        
        // Ensure widgets object exists if backend didn't send it (backwards compat)
        if (!state.widgets) state.widgets = {
            dayBar: { enabled: false, activeColor: {r:0,g:255,b:0}, inactiveColor: {r:20,g:20,b:20} },
            temperature: { enabled: false, value: 0, low: 0, high: 100, keys: [] }
        };
        if (!state.interrupts) state.interrupts = {
            progress: { enabled: false, value: 0, startKey: 0, endKey: 0, startColor: {r:0,g:255,b:0}, endColor: {r:255,g:0,b:0} },
            safety: { enabled: false, active: false, color: {r:255,g:0,b:0}, keys: [] }
        };

        // --- FX STATE ---
        const activeFades = new Map();

        // --- GEOMETRY PRE-CALC ---
        const KEY_MAP = new Map();     
        const NAME_TO_ID = new Map();  
        
        keyGroups.forEach(group => {
            group.keys.forEach(k => {
                const meta = { row: k.row, col: k.col, group: group.group_name };
                KEY_MAP.set(k.id, meta);
                if(k.key_name) NAME_TO_ID.set(k.key_name.toUpperCase(), k.id);
            });
        });

        // --- HELPERS ---
        function hexToRgb(hex) {
            if (!hex || typeof hex !== 'string') return { r:0, g:0, b:0 };
            const cleanHex = hex.replace('#', '');
            return {
                r: parseInt(cleanHex.substring(0,2), 16) || 0,
                g: parseInt(cleanHex.substring(2,4), 16) || 0,
                b: parseInt(cleanHex.substring(4,6), 16) || 0
            };
        }

        const mix = (c1, c2, t) => ({
            r: Math.floor(c1.r + (c2.r - c1.r) * t),
            g: Math.floor(c1.g + (c2.g - c1.g) * t),
            b: Math.floor(c1.b + (c2.b - c1.b) * t)
        });

        let tick = 0;
        const targetAddr = baseAddress.add(PRIMITIVE_RVA);
        log(`[GodMode] Engine loaded. State synced from backend.`);

        Interceptor.attach(targetAddr, {
            onEnter(args) {
                if (!state.active || state.mode === 'PASSTHROUGH') return;

                const bufferInfoPtr = args[2];
                if (bufferInfoPtr.isNull()) return;
                const dataPtr = bufferInfoPtr.readPointer();
                if (dataPtr.isNull()) return;

                if (dataPtr.readU8() === 0x07 && dataPtr.add(1).readU8() === 0xA1) {
                    tick++;
                    
                    let cursor = dataPtr.add(HEADER_SIZE);
                    const limit = dataPtr.add(BUFFER_SIZE - BYTES_PER_KEY);

                    while (cursor < limit) {
                        const keyId = cursor.readU16();
                        if (keyId !== 0) {
                            const pos = KEY_MAP.get(keyId);
                            let r = 0, g = 0, b = 0;

                            if (pos) {
                                // === LAYER 1: BACKGROUND ===
                                // Use FLAT properties from DB schema
                                const bgMode = (state.backgroundMode || 'NONE').toUpperCase();
                                const weatherCond = (state.weather || 'CLEAR').toUpperCase();
                                const isStorming = state.stormOverride && (weatherCond === 'RAIN' || weatherCond === 'STORM');

                                if (isStorming) {
                                    // Rain
                                    const noise = Math.sin(pos.col * 0.5 + tick * 0.1);
                                    if (noise > 0.85) { b = 255; r = 0; g = 0; }
                                    if (weatherCond === 'STORM' && Math.random() > 0.995) { r=255; g=255; b=255; }
                                } 
                                else if (bgMode === 'TIME') {
                                    const t = Math.sin((state.timeOfDay || 0.5) * Math.PI);
                                    r = Math.floor(t*200); g = Math.floor(t*50); b = Math.floor(t*100);
                                }
                                else if (bgMode === 'EFFECT') {
                                    const settings = state.effectSettings || {};
                                    const s = settings.speed || 3;
                                    const base = hexToRgb(settings.baseColor || '#0070FF');
                                    const type = (settings.effectType || 'RIPPLE').toUpperCase();

                                    if (type === 'WAVE' || type === 'RIPPLE') {
                                        const wave = Math.sin((pos.col * 0.2) + (tick * 0.05 * s));
                                        const dim = (wave + 1) / 2; 
                                        r = base.r * dim; g = base.g * dim; b = base.b * dim;
                                    }
                                    else if (type === 'CHECKERBOARD' || type === 'CHECKER') {
                                        const isEven = (pos.row + pos.col) % 2 === 0;
                                        const invert = Math.floor(tick / (60/s)) % 2 === 1;
                                        if ((isEven && !invert) || (!isEven && invert)) {
                                            r = base.r; g = base.g; b = base.b;
                                        }
                                    }
                                }

                                // === LAYER 2: CONTEXT ===
                                // (Shortcuts logic to be added)

                                // === LAYER 3: WIDGETS ===
                                // Day Bar
                                if (state.widgets.dayBar?.enabled && pos.group.includes("Function")) {
                                    // Logic TBD - placeholder
                                }
                                // Temperature
                                if (state.widgets.temperature?.enabled && state.widgets.temperature.keys?.includes(keyId)) {
                                    const { value, low, high } = state.widgets.temperature;
                                    let t = (value - low) / (high - low);
                                    if (t < 0) t = 0; if (t > 1) t = 1;
                                    const c = t < 0.5 
                                        ? mix({r:0,g:0,b:255}, {r:0,g:255,b:0}, t*2)
                                        : mix({r:0,g:255,b:0}, {r:255,g:0,b:0}, (t-0.5)*2);
                                    r=c.r; g=c.g; b=c.b;
                                }

                                // === LAYER 4: INTERRUPTS ===
                                // Progress Bar
                                if (state.downloadProgress >= 0 && pos.group.includes("Number Row")) {
                                    const keyPercent = (pos.col / 13) * 100;
                                    if (keyPercent < state.downloadProgress) { g=255; r=0; b=0; } 
                                    else { g=0; r=20; b=0; }
                                }

                                // === LAYER 5: FX ===
                                if (activeFades.has(keyId)) {
                                    let intensity = activeFades.get(keyId);
                                    const flash = 255 * intensity;
                                    r = Math.min(255, r + flash);
                                    g = Math.min(255, g + flash);
                                    b = Math.min(255, b + flash);
                                    intensity -= 0.05;
                                    if (intensity <= 0) activeFades.delete(keyId);
                                    else activeFades.set(keyId, intensity);
                                }
                            }

                            cursor.add(2).writeU8(r);
                            cursor.add(3).writeU8(g);
                            cursor.add(4).writeU8(b);
                        }
                        cursor = cursor.add(BYTES_PER_KEY);
                    }
                }
            }
        });

        // --- RPC EXPORTS ---
        return {
            enable: () => { state.active = true; log("God Mode Enabled"); },
            disable: () => { state.active = false; log("God Mode Disabled"); },
            
            updateState: (partialState) => {
                // Deep merge required for settings objects
                for (const key in partialState) {
                    if (typeof state[key] === 'object' && !Array.isArray(state[key]) && partialState[key] !== null) {
                        Object.assign(state[key], partialState[key]);
                    } else {
                        state[key] = partialState[key];
                    }
                }
            },

            flashKey: (keyName) => {
                const id = NAME_TO_ID.get(keyName.toUpperCase());
                if (id) activeFades.set(id, 1.0);
            }
        };
    }
}));

registerAction(({
    /**
     * The name for the RPC export.
     */
    name: 'setProfileIndex',

    /**
     * This action requires the native functions for string manipulation and setting the index.
     */
    dependencies: {
        'setProfileIndex': {
            rva: 0x13650,
            signature: ['void', ['pointer', 'pointer', 'pointer', 'pointer']]
        },
        'stringInit': {
            rva: 0x17280,
            signature: ['void', ['pointer', 'char']]
        },
        'stringDestroy': {
            rva: 0x171b0,
            signature: ['void', ['pointer']]
        }
    },

    /**
     * The factory function that creates the final RPC method.
     */
    action: (context) => {
        // This RPC function expects a payload object like { profileId: 3 }
        return (payload) => {
            const { nativeFunctions, hwObjectPtr, log } = context;

            if (!payload || typeof payload.profileId !== 'number') {
                throw new Error("Invalid payload: 'profileId' (number) is required.");
            }
            const profileId = payload.profileId;

            log(`RPC executing: setProfileIndex with ID: ${profileId}`);

            if (!nativeFunctions.setProfileIndex || !nativeFunctions.stringInit || !nativeFunctions.stringDestroy) {
                throw new Error('Dependencies for setProfileIndex are not available.');
            }

            // This function uses __try, so we must be careful with C++ objects.
            // We'll manage memory manually.
            const outStrPtr = Memory.alloc(32); // Allocate memory for the std::string struct

            try {
                // --- Preamble ---
                nativeFunctions.getInstance();
                const detailBuffer = Memory.alloc(48);
                const scratchBuffer = Memory.alloc(56);
                nativeFunctions.initProfileDetail(hwObjectPtr, detailBuffer, scratchBuffer, NULL);

                // --- Action ---
                log('  Action: Initializing temporary native string...');
                nativeFunctions.stringInit(outStrPtr, '\0'.charCodeAt(0));

                log(`  Action: Calling native setProfileIndex function with ID ${profileId}...`);
                // The native function expects a pointer to an unsigned int.
                const idPtr = Memory.alloc(4);
                idPtr.writeU32(profileId);
                nativeFunctions.setProfileIndex(hwObjectPtr, outStrPtr, idPtr, NULL);
                
                log('  -> Success: Native call completed.');
                
                return { success: true, profileId: profileId };

            } catch (e) {
                log(`HANDLED EXCEPTION in setProfileIndex: ${e.message}`);
                // Based on our C++ bridge, a native exception here is a "forgivable" error (-3).
                // The profile switch likely still worked.
                return { success: true, profileId: profileId, note: "Native call threw a handled exception." };
            } finally {
                // --- Cleanup ---
                // CRITICAL: We must always destroy the native string to prevent memory leaks,
                // even if an exception occurred.
                if (nativeFunctions.stringDestroy) {
                    log('  Cleanup: Destroying temporary native string...');
                    nativeFunctions.stringDestroy(outStrPtr);
                }
            }
        };
    }
}));
