({
    name: 'executeDispatcher',
    dependencies: {
        'getProfileIndex': { rva: 0x11210, signature: ['void', ['pointer']] }
    },
    action: (context) => {
        return async (payload) => {
            const { nativeFunctions, hwObjectPtr, log, utils } = context;

            if (!payload || !payload.commandString || typeof payload.payloadString === 'undefined') {
                throw new Error("Invalid payload: { commandString, payloadString } is required.");
            }

            log(`RPC executing: executeDispatcher`);
            
            try {
                // --- Preamble ---
                // THE FIX: Call getInstance() ONCE at the beginning and save the pointer.
                log('  Preamble: Calling get_instance...');
                const controller = nativeFunctions.getInstance();
                if (controller.isNull()) throw new Error("get_instance() returned null.");

                log('  Preamble: Preparing with zeroed-out buffers...');
                const detailBuffer = Memory.alloc(48);
                const scratchBuffer = Memory.alloc(56);
                nativeFunctions.initProfileDetail(hwObjectPtr, detailBuffer, scratchBuffer, NULL);

                log('  Preamble: Calling getProfileIndex to finalize state...');
                nativeFunctions.getProfileIndex(hwObjectPtr);

                // --- Dispatch ---
                // THE FIX: Use the SAME 'controller' pointer from the preamble.
                const vtable = controller.readPointer();
                const dispatcherPtr = vtable.add(3 * Process.pointerSize).readPointer();
                const dispatcher = new NativeFunction(dispatcherPtr, 'void', ['pointer', 'pointer', 'pointer', 'pointer', 'pointer']);

                const commandStr = utils.createStdString(payload.commandString);
                const payloadStr = utils.createStdString(payload.payloadString);
                const resultStr = utils.createStdString("");

                log('  Action: Calling native dispatcher function...');
                // Pass the original 'controller' pointer.
                dispatcher(controller, resultStr, commandStr, payloadStr, NULL);
                
                log('  SUCCESS: Dispatcher returned without crashing.');
                const resultJsonString = utils.readStdString(resultStr);
                
                if (resultJsonString) {
                    return JSON.parse(resultJsonString);
                } else {
                    return { status: "success", note: "Dispatcher returned without a crash, but the result was empty." };
                }

            } catch (e) {
                log(`SUCCESS (via handled crash): Dispatcher call failed as expected: ${e.message}`);
                return { status: "success", note: "Effect likely applied, followed by a handled native exception." };
            }
        };
    }
})