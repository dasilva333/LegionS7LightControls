'use strict';

const MODULE_NAME = 'Gaming.AdvancedLighting.dll';
const RVA_INIT_PROFILE_DETAIL = 0x14630;
const VFTABLE_INDEX = 3;

// --- Configuration ---
const DETAIL_BUFFER_SIZE = 48; // 12 * sizeof(unsigned int)
const SCRATCH_BUFFER_SIZE = 56; // 7 * sizeof(long long)
const STD_STRING_MAX_LEN = 1 * 1024 * 1024; // 1MB safety guard

// ===================================================================
// --- START: Restored Helper Functions (from your working original) ---
// ===================================================================
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
        console.error(e);
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
        console.error(e);
    }
}

function writeTextFile(filename, content) {
    const fullPath = `${trafficDir}\\${filename}`;
    try {
        const file = new File(fullPath, 'wb');
        file.write(content);
        file.close();
    } catch (e) {
        console.error(`    [!] Failed to write ${filename}: ${e.message}`);
    }
}

function writeBinaryFile(filename, data) {
    if (!data) return;
    const fullPath = `${trafficDir}\\${filename}`;
    try {
        const file = new File(fullPath, 'wb');
        file.write(data);
        file.close();
    } catch (e) {
        console.error(`    [!] Failed to write binary file ${filename}: ${e.message}`);
    }
}
// =================================================================
// --- END: Restored Helper Functions ---
// =================================================================

// --- Memory Reading & Dumping ---
function tryReadStdString(ptr) {
    if (!ptr || ptr.isNull()) return { success: false };
    try {
        const length = ptr.add(0x10).readU64().toNumber();
        if (length < 0 || length > STD_STRING_MAX_LEN) return { success: false };
        const capacity = ptr.add(0x18).readU64().toNumber();
        const dataPtr = (capacity < 16) ? ptr : ptr.readPointer();
        if (dataPtr.isNull()) return { success: true, text: '' };
        return { success: true, text: dataPtr.readUtf8String(length) };
    } catch (e) { return { success: false }; }
}

function dumpStdString(ptr, timestamp, prefix) {
    const result = tryReadStdString(ptr);
    const record = { timestamp, object_pointer: ptr.toString() };
    if (result.success) {
        record.string_content = result.text;
    } else {
        record.error = "Failed to read std::string";
    }
    writeTextFile(`${prefix}_${timestamp}.json`, JSON.stringify(record, null, 2));
    console.log(`    [+] Dumped std::string for ${prefix}`);
}

function dumpBuffer(ptr, size, timestamp, prefix) {
    if (!ptr || ptr.isNull()) {
        console.log(`    [!] Buffer pointer for ${prefix} is null. Skipping dump.`);
        return;
    }
    try {
        const data = ptr.readByteArray(size);
        writeBinaryFile(`${prefix}_${timestamp}.bin`, data);
        console.log(`    [+] Dumped ${size}-byte buffer for ${prefix}`);
    } catch (e) {
        console.error(`    [!] Failed to dump buffer for ${prefix}: ${e.message}`);
    }
}

// --- Main Hooking Logic ---
function main() {
    // The restored helpers are now called here.
    ensureDirectory(trafficDir);
    console.log(`[+] Traffic will be saved to: ${trafficDir}`);
    
    const module = Process.getModuleByName(MODULE_NAME);
    if (!module) {
        setTimeout(main, 1000);
        return;
    }
    console.log(`[+] Found ${MODULE_NAME} at ${module.base}`);

    // --- HOOK 1: The Dispatcher (for command and result) ---
    const getInstance = module.getExportByName('get_instance');
    const controller = new NativeFunction(getInstance, 'pointer', [])();
    const vtable = controller.readPointer();
    const dispatcher = vtable.add(VFTABLE_INDEX * Process.pointerSize).readPointer();
    
    console.log(`[+] Hooking dispatcher at ${dispatcher}`);
    Interceptor.attach(dispatcher, {
        onEnter(args) {
            this.timestamp = Date.now();
            this.outResultPtr = args[1];
            
            console.log(`\n--- Dispatcher Call [${this.timestamp}] ---`);
            dumpStdString(args[2], this.timestamp, 'inbound_command');
            dumpStdString(args[3], this.timestamp, 'inbound_payload');
        },
        onLeave(retval) {
            console.log(`--- Dispatcher Return [${this.timestamp}] ---`);
            dumpStdString(this.outResultPtr, this.timestamp, 'outbound_result');
        }
    });

    // --- HOOK 2: init_profile_detail (for the magic buffers) ---
    const initProfileDetailPtr = module.base.add(RVA_INIT_PROFILE_DETAIL);
    
    console.log(`[+] Hooking init_profile_detail at ${initProfileDetailPtr}`);
    Interceptor.attach(initProfileDetailPtr, {
        onEnter(args) {
            // Save pointers to the buffers when the function is called.
            this.detailPtr = args[1];
            this.scratchPtr = args[2];
        },
        onLeave(retval) {
            // A dispatcher call almost always happens right after an init call.
            // We'll use a very recent timestamp for association.
            const timestamp = Date.now();
            console.log(`--- init_profile_detail Populated [${timestamp}] ---`);

            // Dump the buffers AFTER the function has populated them.
            dumpBuffer(this.detailPtr, DETAIL_BUFFER_SIZE, timestamp, 'init_details_buffer');
            dumpBuffer(this.scratchPtr, SCRATCH_BUFFER_SIZE, timestamp, 'init_scratch_buffer');
        }
    });
    
    console.log('[+] Hooks installed. Waiting for lighting commands...');
}

setImmediate(main);