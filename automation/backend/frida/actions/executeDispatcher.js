({
    name: 'executeDispatcher',
    dependencies: {
        'getProfileIndex': { rva: 0x11210, signature: ['void', ['pointer']] }
    },
    action: (context) => {
        return async (payload) => {
            const { nativeFunctions, hwObjectPtr, log, utils } = context;
            // ... (parameter validation) ...
            log(`RPC executing: executeDispatcher`);
            
            // We don't use a try...catch here because if the process terminates,
            // the RPC promise will simply never resolve, and the Node.js client
            // will rely on the worker's 'exit' event.
            
            // --- Preamble ---
            log('  Preamble: Calling get_instance...');
            const controller = nativeFunctions.getInstance();
            if (controller.isNull()) throw new Error("get_instance() returned null.");
            
            log('  Preamble: Calling initProfileDetail...');
            const detailBuffer = Memory.alloc(48);
            const scratchBuffer = Memory.alloc(56);
            nativeFunctions.initProfileDetail(hwObjectPtr, detailBuffer, scratchBuffer, NULL);

            log('  Preamble: Calling getProfileIndex...');
            nativeFunctions.getProfileIndex(hwObjectPtr);

            // --- Dispatch ---
            const vtable = controller.readPointer();
            const dispatcherPtr = vtable.add(3 * Process.pointerSize).readPointer();
            const dispatcher = new NativeFunction(dispatcherPtr, 'void', ['pointer', 'pointer', 'pointer', 'pointer', 'pointer']);

            const commandStr = utils.createStdString(payload.commandString);
            const payloadStr = utils.createStdString(payload.payloadString);
            const resultStr = utils.createStdString("");

            log('  Action: Calling native dispatcher function (expected to terminate process)...');
            dispatcher(controller, resultStr, commandStr, payloadStr, NULL);
            
            // If the code reaches here, it means the process DID NOT terminate,
            // which is unexpected but could happen. We should try to return a result.
            log('  UNEXPECTED SUCCESS: Dispatcher returned without terminating process.');
            const resultJsonString = utils.readStdString(resultStr);
            return JSON.parse(resultJsonString);
        };
    }
})