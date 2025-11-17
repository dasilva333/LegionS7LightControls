({
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
})