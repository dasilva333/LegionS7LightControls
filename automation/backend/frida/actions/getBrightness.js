({
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
})