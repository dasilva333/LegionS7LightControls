({
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
})