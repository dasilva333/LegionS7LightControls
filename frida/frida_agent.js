'use strict';

// --- Constants ---
// We know these from our reverse engineering and C++ bridges.
const MODULE_NAME = 'Gaming.AdvancedLighting.dll';
const RVA_GET_INSTANCE = 'get_instance';
const RVA_INIT_PROFILE_DETAIL = 0x14630;
const RVA_GET_BRIGHTNESS = 0x14110;
const OFFSET_HW_OBJECT = 0x7E840;
const OFFSET_BRIGHTNESS = 0x158;

// Log function for debugging inside the agent
function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[Agent ${timestamp}] ${message}`);
}

// --- Native Function Definitions ---
// We define the signatures of the native functions we need to call.
let initProfileDetail;
let getInstance;
let getBrightnessNative;
let hwObjectPtr;

// --- Main Initialization ---
// This function runs once when the script is injected.
function initialize() {
  log('Initializing agent...');
  const module = Process.getModuleByName(MODULE_NAME);
  if (!module) {
    log('ERROR: Module not found. Retrying...');
    setTimeout(initialize, 1000);
    return;
  }
  log(`Module ${MODULE_NAME} found at ${module.base}`);

  const baseAddress = module.base;
  
  // Get pointers to the functions we need using their names or RVAs.
  const getInstancePtr = module.getExportByName(RVA_GET_INSTANCE);
  const initProfileDetailPtr = baseAddress.add(RVA_INIT_PROFILE_DETAIL);
  const getBrightnessPtr = baseAddress.add(RVA_GET_BRIGHTNESS);
  hwObjectPtr = baseAddress.add(OFFSET_HW_OBJECT);

  // Create callable Frida NativeFunction objects.
  getInstance = new NativeFunction(getInstancePtr, 'pointer', []);
  initProfileDetail = new NativeFunction(initProfileDetailPtr, 'void', ['pointer', 'pointer', 'pointer', 'pointer']);
  getBrightnessNative = new NativeFunction(getBrightnessPtr, 'void', ['pointer']);

  log('Agent initialized successfully.');
  log(`  -> hwObjectPtr: ${hwObjectPtr}`);
  log(`  -> initProfileDetail: ${initProfileDetailPtr}`);
  log(`  -> getBrightness: ${getBrightnessPtr}`);
}

// --- The RPC Exported Function ---
// This is the function our Node.js client will be able to call.
rpc.exports.getBrightness = function () {
  log('RPC call received: getBrightness');

  if (!initProfileDetail || !getBrightnessNative || !hwObjectPtr) {
    log('ERROR: Agent not initialized. Call initialize() first.');
    throw new Error('Agent is not fully initialized. Cannot call getBrightness.');
  }

  try {
    // --- Perform the necessary preamble for this call ---
    // 1. Call get_instance (even though we don't use the result for this specific task).
    log('  Step 1: Calling get_instance...');
    getInstance();

    // 2. Call init_profile_detail to prepare the hardware state.
    // We allocate temporary buffers on the stack, which is fine since we just need to pass valid pointers.
    const detailBuffer = Memory.alloc(12 * 4); // 12 * sizeof(unsigned int)
    const scratchBuffer = Memory.alloc(7 * 8); // 7 * sizeof(long long)
    log('  Step 2: Calling initProfileDetail...');
    initProfileDetail(hwObjectPtr, detailBuffer, scratchBuffer, NULL);

    // 3. Call the actual GetBrightness function.
    log('  Step 3: Calling getBrightnessNative...');
    getBrightnessNative(hwObjectPtr);

    // 4. Read the integer result from the known offset in the hwObject.
    const brightness = hwObjectPtr.add(OFFSET_BRIGHTNESS).readS32();
    log(`  Step 4: Reading brightness from ${hwObjectPtr.add(OFFSET_BRIGHTNESS)} -> Value: ${brightness}`);
    
    return brightness;
  } catch (e) {
    log(`FATAL ERROR in getBrightness RPC call: ${e.message}`);
    // Re-throw the error so the Node.js client receives it.
    throw new Error(`Native call failed: ${e.message}`);
  }
};

// --- Start the agent ---
// Run the initialization function as soon as the script is loaded.
setImmediate(initialize);

log('Frida agent script loaded and waiting for initialization.');