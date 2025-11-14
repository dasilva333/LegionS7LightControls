'use strict';

const MODULE_NAME = "Gaming.AdvancedLighting.dll";
const VFTABLE_INDEX = 3; // The dispatcher method we found

function main() {
    const module = Process.findModuleByName(MODULE_NAME);
    if (!module) {
        console.log(`[!] ${MODULE_NAME} not found. Waiting...`);
        setTimeout(main, 1000);
        return;
    }

    console.log(`[+] ${MODULE_NAME} found at base: ${module.base}`);

    // We need to find get_instance to get the object and its vftable
    const getInstance = module.getExportByName('get_instance');
    if (!getInstance) {
        console.error("[!] Could not find export: get_instance");
        return;
    }
    console.log(`[+] Found get_instance at: ${getInstance}`);

    // Create a native function we can call from JavaScript
    const getInstanceFunc = new NativeFunction(getInstance, 'pointer', []);

    // Call get_instance() to get the controller object pointer
    const pControllerObject = getInstanceFunc();
    console.log(`[+] Controller object instance is at: ${pControllerObject}`);

    // The first pointer in a C++ object is its vftable
    const pVftable = pControllerObject.readPointer();
    console.log(`[+] Vftable is at: ${pVftable}`);

    // Get the address of the target method from the vftable
    const pTargetMethod = pVftable.add(VFTABLE_INDEX * Process.pointerSize).readPointer();
    console.log(`[+] Vftable[${VFTABLE_INDEX}] is at: ${pTargetMethod}. Hooking now...`);

    Interceptor.attach(pTargetMethod, {
        onEnter: function (args) {
            console.log("\n=======================================================");
            console.log(`[>>] Vftable[${VFTABLE_INDEX}] (FUN_18004e570) CALLED`);
            console.log("=======================================================");

            // According to Ghidra's __fastcall analysis:
            // RCX = thisPtr, RDX = outJson, R8 = inCommand, R9 = inPayload
            this.pOutJson = args[1];
            this.pInCommand = args[2];
            this.pInPayload = args[3];

            console.log("  [->] Inbound Command Object Pointer:", this.pInCommand);
            try {
                // The object is a std::string. If length <= 15, it's inline.
                // Otherwise, the first 8 bytes are a pointer to the string data.
                let commandStr;
                const commandLen = this.pInCommand.add(16).readU64();
                if (commandLen.valueOf() > 15) {
                    commandStr = this.pInCommand.readPointer().readAnsiString();
                } else {
                    commandStr = this.pInCommand.readAnsiString();
                }
                console.log("    [+] Command JSON:", commandStr);
            } catch (e) { console.log("    [!] Failed to read command string:", e.message); }

console.log("\n  [->] Inbound Payload Object Pointer:", this.pInPayload);
            try {
                let payloadPointer;
                let payloadLength;

                // First, get the length of the string from the std::string object.
                const stringLength = this.pInPayload.add(16).readU64().toNumber();
                payloadLength = stringLength;

                // Then, determine if the string is stored inline or on the heap.
                if (stringLength > 15) {
                    // Long string: the first 8 bytes of the object are a pointer to the data.
                    payloadPointer = this.pInPayload.readPointer();
                } else {
                    // Short string (SSO): the data starts at the beginning of the object itself.
                    payloadPointer = this.pInPayload;
                }
                
                console.log(`    [+] Payload as String (${payloadLength} bytes):`, payloadPointer.readAnsiString(payloadLength));
                
                // Now, perform a hexdump of the string *content*.
                console.log("\n    [+] Payload as Hex:");
                console.log(hexdump(payloadPointer, {
                    length: payloadLength > 0 ? payloadLength : 16, // Dump the full length, or 16 bytes if empty
                    ansi: true
                }));
 
            } catch (e) {
                // If anything goes wrong, we fall back to dumping the object itself.
                console.log("    [!] Failed to read as string object. Performing hexdump of the object structure (32 bytes):");
                console.log(hexdump(this.pInPayload, {
                    length: 32,
                    ansi: true
                }));
            }
        },
        onLeave: function (retval) {
            console.log("\n  [<-] Vftable method is returning.");
            console.log("  [<-] Outbound Result Object Pointer:", this.pOutJson);
            try {
                let resultStr;
                const resultLen = this.pOutJson.add(16).readU64();
                if (resultLen.valueOf() > 15) {
                    resultStr = this.pOutJson.readPointer().readAnsiString();
                } else {
                    resultStr = this.pOutJson.readAnsiString();
                }
                console.log("    [+] Result JSON:", resultStr);
            } catch (e) { console.log("    [!] Failed to read result string:", e.message); }
            console.log("=======================================================\n");
        }
    });

    console.log("\n[+] Hook installed successfully. Waiting for calls...");
    console.log("Go to the Lenovo Vantage UI and change a lighting setting.");
}

main();