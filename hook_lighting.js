'use strict';

const MODULE_NAME = "Gaming.AdvancedLighting.dll";
const VFTABLE_INDEX = 3;

// --- Helper function to get the Windows temporary directory ---
function getTempDir() {
    const pGetTempPathW = Process.getModuleByName('kernel32.dll').getExportByName('GetTempPathW');
    const getTempPathW = new NativeFunction(pGetTempPathW, 'uint32', ['uint32', 'pointer']);
    const buffer = Memory.alloc(512 * 2);
    const length = getTempPathW(512, buffer);
    if (length === 0) return "C:\\Temp";
    return buffer.readUtf16String(length);
}

// --- File Logging Setup ---
const logDir = getTempDir();
const trafficDir = `${logDir}\\traffic`;
try {
    const pCreateDirectoryW = Process.getModuleByName('kernel32.dll').getExportByName('CreateDirectoryW');
    const createDirectoryW = new NativeFunction(pCreateDirectoryW, 'bool', ['pointer', 'pointer']);
    createDirectoryW(Memory.allocUtf16String(trafficDir), NULL);
    console.log(`[+] Log files will be saved to: ${trafficDir}`);
} catch (e) {
    console.error(`[!] Failed to create log directory: ${e.message}`);
}

function writeLogFile(filename, content) {
    const fullPath = `${trafficDir}\\${filename}`;
    try {
        const file = new File(fullPath, "wb");
        if (typeof content === 'string') { file.write(content); }
        else { file.write(content); }
        file.close();
        console.log(`    [+] Logged to: ${filename}`);
    } catch (e) {
        console.error(`    [!] Failed to write to ${filename}: ${e.message}`);
    }
}

// Helper to read the proprietary std::string-like object
function readVendorString(pointer) {
    try {
        if (!pointer || pointer.isNull()) return { str: "(null pointer)", ptr: null, len: 0 };
        const length = pointer.add(16).readU64().toNumber();
        if (length === 0) return { str: "", ptr: null, len: 0 };
        
        let dataPtr;
        if (length > 15) { dataPtr = pointer.readPointer(); }
        else { dataPtr = pointer; }
        
        // Final safety check for invalid pointers like -1
        if (!dataPtr || dataPtr.isNull() || dataPtr.equals(ptr(-1))) {
            return { str: "(invalid data pointer)", ptr: dataPtr, len: length };
        }
        
        const str = dataPtr.readAnsiString(length);
        return { str: str, ptr: dataPtr, len: length };
    } catch (e) {
        return { str: `(error: ${e.message})`, ptr: pointer, len: -1 };
    }
}


function main() {
    const module = Process.getModuleByName(MODULE_NAME);
    if (!module) {
        setTimeout(main, 1000);
        return;
    }

    const getInstance = module.getExportByName('get_instance');
    const getInstanceFunc = new NativeFunction(getInstance, 'pointer', []);
    const pControllerObject = getInstanceFunc();
    const pVftable = pControllerObject.readPointer();
    const pTargetMethod = pVftable.add(VFTABLE_INDEX * Process.pointerSize).readPointer();
    
    console.log(`[+] Hooking dispatcher at: ${pTargetMethod}. Waiting for traffic...`);
    console.log("Go to the Lenovo Vantage UI and change a lighting setting.");

    Interceptor.attach(pTargetMethod, {
        onEnter: function(args) {
            const timestamp = Date.now();
            this.timestamp = timestamp;
            this.pOutJson = args[1];

            console.log(`\n--- Intercepted Call [${timestamp}] ---`);
            
            const pInCommand = args[2];
            const pInPayload = args[3];

            // --- Process Inbound Command ---
            const commandInfo = readVendorString(pInCommand);
            const commandManifest = { timestamp, direction: "inbound", type: "command", object_pointer: pInCommand.toString(), string_content: commandInfo.str };
            writeLogFile(`inbound_command_${timestamp}.json`, JSON.stringify(commandManifest, null, 2));
            if (commandInfo.ptr && !commandInfo.ptr.isNull() && !commandInfo.ptr.equals(ptr(-1)) && commandInfo.len > 0) {
                writeLogFile(`inbound_command_${timestamp}.binary`, commandInfo.ptr.readByteArray(commandInfo.len));
            }
            
            // --- Process Inbound Payload ---
            const payloadInfo = readVendorString(pInPayload);
            const payloadManifest = { timestamp, direction: "inbound", type: "payload", object_pointer: pInPayload.toString(), string_content: payloadInfo.str };
            writeLogFile(`inbound_payload_${timestamp}.json`, JSON.stringify(payloadManifest, null, 2));
            
            // --- THIS IS THE FINAL FIX ---
            // Add a multi-layer safety check to prevent the crash
            if (payloadInfo.ptr && !payloadInfo.ptr.isNull() && !payloadInfo.ptr.equals(ptr(-1)) && payloadInfo.len > 0) {
                try {
                    writeLogFile(`inbound_payload_${timestamp}.binary`, payloadInfo.ptr.readByteArray(payloadInfo.len));
                } catch (e) {
                    console.error(`    [!] CRASH AVERTED: Failed to read payload binary data. Error: ${e.message}`);
                }
            }
        },
        onLeave: function(retval) {
            const timestamp = this.timestamp;
            const pOutJson = this.pOutJson;

            console.log(`--- Call Return [${timestamp}] ---`);

            const resultInfo = readVendorString(pOutJson);
            const resultManifest = { timestamp, direction: "outbound", type: "result", object_pointer: pOutJson.toString(), string_content: resultInfo.str };
            writeLogFile(`outbound_result_${timestamp}.json`, JSON.stringify(resultManifest, null, 2));
            if (resultInfo.ptr && !resultInfo.ptr.isNull() && !resultInfo.ptr.equals(ptr(-1)) && resultInfo.len > 0) {
                writeLogFile(`outbound_result_${timestamp}.binary`, resultInfo.ptr.readByteArray(resultInfo.len));
            }
        }
    });
}

setTimeout(main, 500);