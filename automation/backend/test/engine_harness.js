const fs = require('fs');
const path = require('path');

// --- 1. Mock Context ---
const KEY_GROUPS = require('../seeds/key_groups.json');
const { DEFAULT_GODMODE_STATE } = require('../services/godmodeConfigStore');

// Mock Frida Context
const context = {
    baseAddress: { add: () => 0 }, // Mock pointer math
    log: console.log,
    keyGroups: KEY_GROUPS,
    initialState: JSON.parse(JSON.stringify(DEFAULT_GODMODE_STATE)),
    godMode: { utils: {}, layers: {} }
};

// --- 2. Load Modules (Mini-Loader) ---
const GODMODE_DIR = path.join(__dirname, '../frida/godmode');

function loadModule(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    // The files are already IIFEs or have a top-level return statement meant for the loader's wrapper.
    // If they are IIFEs (start with '('), eval directly.
    // If they use top-level return (like color_math.js), we MUST wrap them.
    
    if (code.trim().startsWith('(')) {
        return eval(code);
    } else {
        const wrapped = `(function() { ${code} \n})()`;
        return eval(wrapped);
    }
}

// Load Utils
context.godMode.utils.color_math = loadModule(path.join(GODMODE_DIR, 'utils/color_math.js'));
context.godMode.utils.geometry = loadModule(path.join(GODMODE_DIR, 'utils/geometry.js'));

// Load Layers
context.godMode.layers.layer1_background = loadModule(path.join(GODMODE_DIR, 'layers/layer1_background.js'));
context.godMode.layers.layer2_context = loadModule(path.join(GODMODE_DIR, 'layers/layer2_context.js'));
context.godMode.layers.layer3_widgets = loadModule(path.join(GODMODE_DIR, 'layers/layer3_widgets.js'));
context.godMode.layers.layer4_interrupts = loadModule(path.join(GODMODE_DIR, 'layers/layer4_interrupts.js'));
context.godMode.layers.layer5_fx = loadModule(path.join(GODMODE_DIR, 'layers/layer5_fx.js'));

// --- 3. Load Orchestrator ---
const godModeSource = fs.readFileSync(path.join(__dirname, '../frida/actions/godMode.js'), 'utf8');

// The file is already formatted as an expression: ({ ... })
// We can evaluate it directly without string manipulation.
const godModeAction = eval(godModeSource); 

// --- 4. Initialize Engine ---
console.log("\n--- Initializing Engine ---");

// Mock Interceptor
global.Interceptor = {
    attach: (addr, callbacks) => {
        console.log("[Mock] Interceptor attached.");
        context.callbacks = callbacks; // Save for manual triggering
    }
};
global.Memory = { alloc: () => {} };
global.NativeFunction = () => {};

// Initialize
const rpcExports = godModeAction.action(context);
rpcExports.enable(); // Turn it on

// --- 5. Run Frame Simulation ---
console.log("\n--- Running Simulation Frame 1 ---");

// Mock Buffer pointers
let mockDataPtr = {
    readU8: () => 0x07, // Valid Header
    add: (offset) => {
        // Mock cursor logic... simplistic for test
        return {
            readU8: () => (offset === 1 ? 0xA1 : 0),
            readU16: () => 0, // Needs complex mocking to iterate keys
            writeU8: (val) => { /* console.log(`Write: ${val}`) */ }
        }
    }
};

// Instead of mocking pointers (hard), let's inspect the INTERNAL state and run layers manually
// We want to see if layers return Black.

// Setup State for Test
// Enable Time of Day
rpcExports.updateState({ 
    backgroundMode: 'TIME', 
    timeOfDay: 0.5, // Noon (Should be Cyan/White)
    widgets: { temperature: { enabled: false } }
});

// Verify State
// console.log("State:", context.initialState); // Wait, action() clones this. We can't see inside easily.

// Let's run Layer 1 manually to verify logic
const layer1 = context.godMode.layers.layer1_background;
const utils = { ...context.godMode.utils.color_math, ...context.godMode.utils.geometry };

// Mock State passed to layer
const testState = {
    backgroundMode: 'TIME',
    timeOfDay: 0.5,
    weather: 'CLEAR',
    effectSettings: {}
};

// Test Key 66 (Q)
const testPos = { col: 2, row: 2, keyId: 66 }; 

console.log(`Testing Layer 1 with State:`, testState);
const result = layer1(testState, testPos, 0, {r:0,g:0,b:0}, utils);

console.log("--- Layer 1 Result ---");
console.log(result);

if (result.r === 0 && result.g === 0 && result.b === 0) {
    console.error("FAIL: Layer 1 returned Black for Noon Time.");
} else {
    console.log("SUCCESS: Layer 1 returned color.");
}

// ... after the Layer 1 test ...

console.log("\n--- Running Full Pipeline (Mocking Interceptor) ---");

// 1. Create a Mock Buffer that simulates a valid Aurora Sync Packet
// Header: 07 A1 C0 03
// Key 1 (ID 66 - Q): [66, 00, 00, 00, 00]
const mockBuffer = new Uint8Array(960);
mockBuffer[0] = 0x07;
mockBuffer[1] = 0xA1; // Valid Sync
mockBuffer[4] = 66;   // Key ID Low (66 = Q)
mockBuffer[5] = 0;    // Key ID High

// 2. Mock the Pointer Logic needed by the callback
// The callback does: bufferInfoPtr.readPointer() -> dataPtr
// Then dataPtr.readU8()... .add()...
mockDataPtr = {
    isNull: () => false,
    readU8: () => mockBuffer[0], // Header[0]
    add: (offset) => {
        // Return an object that behaves like a pointer at that offset
        return {
            readU8: () => mockBuffer[offset],
            readU16: () => {
                // Read Little Endian U16 at offset
                return mockBuffer[offset] | (mockBuffer[offset+1] << 8);
            },
            writeU8: (val) => {
                // Capture the write!
                mockBuffer[offset] = val; 
                console.log(`[Pipeline] Write at offset ${offset}: ${val}`);
            }
        };
    }
};

const mockBufferInfoPtr = {
    isNull: () => false,
    readPointer: () => mockDataPtr
};

const mockArgs = [null, null, mockBufferInfoPtr]; // args[2] is bufferInfo

// 3. Trigger the Hook
if (context.callbacks && context.callbacks.onEnter) {
    console.log("Triggering onEnter...");
    
    // Setup State: Enable Day Bar to test Layer 3 override
    rpcExports.updateState({ 
        widgets: { 
            dayBar: { enabled: true, activeColor: '#00FF00', inactiveColor: '#FF0000' } 
        } 
    });

    // Q (ID 66) is in the Alpha Block, not Function Row.
    // So Layer 3 (Day Bar) should ignore it.
    // Layer 1 (Background) should paint it Pink/Purple (Time of Day).
    
    context.callbacks.onEnter(mockArgs);

    // 4. Verify Output
    // We expect writes at Offset 4+2 (R), 4+3 (G), 4+4 (B) -> Offsets 6, 7, 8
    const r = mockBuffer[6];
    const g = mockBuffer[7];
    const b = mockBuffer[8];

    console.log(`Final Color for Key 66: RGB(${r}, ${g}, ${b})`);
    
    if (r === 200 && g === 50 && b === 100) {
        console.log("SUCCESS: Pipeline preserved Layer 1 color (Layer 3 ignored correctly).");
    } else if (r === 0 && g === 255 && b === 0) {
        console.log("FAIL: Layer 3 incorrectly overwrote Key 66.");
    } else {
        console.log("RESULT: Color modified by pipeline.");
    }

} else {
    console.error("FAIL: Interceptor callback not captured.");
}