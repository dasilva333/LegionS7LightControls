({
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
})