'use strict';

const MODULE_NAME = 'Gaming.AdvancedLighting.dll';
const VFTABLE_INDEX = 3;
const STD_STRING_MAX_LEN = 1 * 1024 * 1024; // 1MB safety guard
const CONTEXT_DUMP_SIZE = 512;
const FALLBACK_DUMP_SIZE = 64;
const INLINE_BUFFER_OFFSET = 0x20;

// --- Frida API Helpers ---
function getTempDir() {
    try {
        const kernel32 = Process.getModuleByName('kernel32.dll');
        const getTempPathW = new NativeFunction(kernel32.getExportByName('GetTempPathW'), 'uint32', ['uint32', 'pointer']);
        const buffer = Memory.alloc(520 * 2);
        const len = getTempPathW(520, buffer);
        if (len === 0) return 'C:\\Temp';
        return buffer.readUtf16String(len);
    } catch (e) {
        console.error("[!] FATAL: Could not get temp directory.");
        console.error(e); // Full error dump
        return null;
    }
}

const trafficDir = `${getTempDir()}\\traffic`;

function ensureDirectory(path) {
    try {
        const kernel32 = Process.getModuleByName('kernel32.dll');
        const createDirectoryW = new NativeFunction(kernel32.getExportByName('CreateDirectoryW'), 'bool', ['pointer', 'pointer']);
        createDirectoryW(Memory.allocUtf16String(path), NULL);
    } catch (e) {
        console.error(`[!] Failed to create directory ${path}.`);
        console.error(e); // Full error dump
    }
}

// --- File I/O ---
function writeTextFile(filename, content) {
    const fullPath = `${trafficDir}\\${filename}`;
    let file = null;
    try {
        file = new File(fullPath, 'wb');
        if (file) {
            file.write(content);
            file.close();
        } else {
            throw new Error("new File() returned null.");
        }
    } catch (e) {
        console.error(`    [!] Failed to write ${filename}.`);
        console.error(e); // Full error dump
    }
}

function writeBinaryFile(filename, data) {
    if (!data) return;
    const fullPath = `${trafficDir}\\${filename}`;
    let file = null;
    try {
        file = new File(fullPath, 'wb');
        if (file) {
            file.write(data);
            file.close();
        } else {
            throw new Error("new File() returned null.");
        }
    } catch (e) {
        console.error(`    [!] Failed to write ${filename}.`);
        console.error(e); // Full error dump
    }
}

// --- Memory Parsing ---
function pointerToString(ptr) {
    return (ptr && !ptr.isNull()) ? ptr.toString() : '0x0';
}

// --- THE CORRECTED std::string READER ---
function tryReadStdString(ptr) {
    if (!ptr || ptr.isNull()) return { success: false, error: 'null object pointer' };
    try {
        const length = ptr.add(0x10).readU64().toNumber();
        const capacity = ptr.add(0x18).readU64().toNumber();

        if (length < 0 || length > STD_STRING_MAX_LEN) {
            // Fallback attempt: some structs embed the chars at +0x20 with a 32-bit length.
            try {
                const inlinePtr = ptr.add(INLINE_BUFFER_OFFSET);
                const inlineLen = ptr.add(INLINE_BUFFER_OFFSET + 0x10).readU32();
                if (inlineLen > 0 && inlineLen <= STD_STRING_MAX_LEN) {
                    const bytes = inlinePtr.readByteArray(inlineLen);
                    const text = inlinePtr.readUtf8String(inlineLen);
                    return { success: true, length: inlineLen, text: text || '', bytes };
                }
            } catch (fallbackError) {
                console.error("[!] Fallback inline reader failed:");
                console.error(fallbackError);
            }

            const rawBytes = ptr.readByteArray(FALLBACK_DUMP_SIZE);
            return { success: false, error: `unrealistic length: ${length}`, bytes: rawBytes };
        }

        let dataPtr;
        // This is the logic from the other LLM: check capacity to determine location.
        if (capacity >= 0x10) { // 16 on x64 MSVC
            dataPtr = ptr.readPointer(); // Heap-allocated
        } else {
            dataPtr = ptr; // Inline (SSO)
        }

        if (dataPtr.isNull()) return { success: true, length: 0, text: '', bytes: null };
        
        const bytes = (length > 0) ? dataPtr.readByteArray(length) : null;
        const text = (length > 0) ? dataPtr.readUtf8String(length) : '';
        
        return { success: true, length, text: text || '', bytes };
    } catch (e) {
        console.error("[!] Exception in tryReadStdString:");
        console.error(e); // Full error dump
        try {
            const rawBytes = ptr.readByteArray(FALLBACK_DUMP_SIZE);
            return { success: false, error: e.message, bytes: rawBytes };
        } catch {
            return { success: false, error: e.message };
        }
    }
}

// --- Logging Functions ---
function dumpStdString(ptr, timestamp, direction, type, prefix) {
    const dump = tryReadStdString(ptr);
    const record = { timestamp, direction, type, object_pointer: pointerToString(ptr) };
    
    if (dump.success) {
        record.length = dump.length;
        record.string_content = dump.text;
        console.log(`    [+] Logged ${type} string (${dump.length} bytes)`);
    } else {
        record.error = dump.error;
        console.log(`    [!] Failed to read ${type} string: ${dump.error}`);
    }
    
    writeTextFile(`${prefix}_${timestamp}.json`, JSON.stringify(record, null, 2));
    if (dump.bytes) {
        // Write the actual string content for good strings, or the raw struct for bad ones.
        writeBinaryFile(`${prefix}_${timestamp}.binary`, dump.bytes);
    }
}

function dumpContext(ptr, timestamp) {
    const record = { timestamp, direction: 'inbound', type: 'context', object_pointer: pointerToString(ptr) };
    
    if (ptr && !ptr.isNull()) {
        try {
            const data = ptr.readByteArray(CONTEXT_DUMP_SIZE);
            record.captured_bytes = CONTEXT_DUMP_SIZE;
            writeBinaryFile(`inbound_context_${timestamp}.binary`, data);
            console.log(`    [+] Logged context object (${CONTEXT_DUMP_SIZE} bytes)`);
        } catch (e) {
            record.error = e.message;
            console.log(`    [!] Failed to dump context object.`);
            console.error(e);
        }
    } else {
        console.log("    [+] Context object is NULL.");
    }
    writeTextFile(`inbound_context_${timestamp}.json`, JSON.stringify(record, null, 2));
}

// --- Main Hook ---
function main() {
    ensureDirectory(trafficDir);
    const module = Process.getModuleByName(MODULE_NAME);
    if (!module) {
        setTimeout(main, 1000);
        return;
    }
    const getInstance = module.getExportByName('get_instance');
    const getInstanceFunc = new NativeFunction(getInstance, 'pointer', []);
    const controller = getInstanceFunc();
    const vtable = controller.readPointer();
    const dispatcher = vtable.add(VFTABLE_INDEX * Process.pointerSize).readPointer();
    
    console.log(`[+] Hooking dispatcher at ${dispatcher}`);
    console.log('[+] Capturing commands... open Lenovo Vantage and change a profile.');

    Interceptor.attach(dispatcher, {
        onEnter(args) {
            this.timestamp = Date.now();
            this.outPtr = args[1];
            
            console.log(`\n--- Intercepted Call [${this.timestamp}] ---`);
            
            dumpStdString(args[2], this.timestamp, 'inbound', 'command', 'inbound_command');
            dumpStdString(args[3], this.timestamp, 'inbound', 'payload', 'inbound_payload');
            dumpContext(args[4], this.timestamp);
        },
        onLeave(retval) {
            console.log(`--- Call Return [${this.timestamp}] ---`);
            dumpStdString(this.outPtr, this.timestamp, 'outbound', 'result', 'outbound_result');
        }
    });
}

setImmediate(main);
