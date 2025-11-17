({
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
})