'use strict';

const TARGET_MODULE = 'Gaming.AdvancedLighting.dll';

// The RVAs of the two Frame Builder functions you discovered
const RVA_BUILDER_1 = 0x377e0;
const RVA_BUILDER_2 = 0x37990;

const DUMP_SIZE = 256; // We'll dump 256 bytes of the object to look for pointers

let trafficDir = '';

// --- Proven Helper Functions ---
function getTempDir() {
    try {
        const kernel32 = Process.getModuleByName('kernel32.dll');
        const getTempPathW = new NativeFunction(kernel32.getExportByName('GetTempPathW'), 'uint32', ['uint32', 'pointer']);
        const buffer = Memory.alloc(520 * 2);
        const len = getTempPathW(520, buffer);
        if (len === 0) return 'C:\\Temp';
        return buffer.readUtf16String(len);
    } catch (e) { return null; }
}

function ensureDirectory(path) {
    try {
        const kernel32 = Process.getModuleByName('kernel32.dll');
        const createDirectoryW = new NativeFunction(kernel32.getExportByName('CreateDirectoryW'), 'bool', ['pointer', 'pointer']);
        createDirectoryW(Memory.allocUtf16String(path), NULL);
    } catch (e) {}
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
// --- End Helpers ---

function attachAndLog(module, name, rva) {
    const address = module.base.add(rva);
    console.log(`[+] Hooking ${name} at ${address}`);

    Interceptor.attach(address, {
        onEnter(args) {
            const timestamp = Date.now();
            console.log(`\n--- HIT: ${name} CALLED [${timestamp}] ---`);

            // FUN_1800377e0(longlong param_1, undefined8 *param_2)
            // FUN_180037990(longlong param_1, undefined8 *param_2)
            // param_1 is the 'this' pointer to the object holding the data.
            const objectPtr = args[0];
            
            console.log(`  -> Object Pointer (param_1): ${objectPtr}`);
            
            if (!objectPtr.isNull()) {
                // Let's dump the first 256 bytes of this object to see what's inside.
                // We are looking for pointers to the actual data buffers.
                const filename = `frame_builder_object_${name}_${timestamp}.bin`;
                try {
                    const data = objectPtr.readByteArray(DUMP_SIZE);
                    writeBinaryFile(filename, data);
                    console.log(`  -> Dumped ${DUMP_SIZE} bytes of the object to ${filename}`);
                } catch(e) {
                    console.error(`  [!] Failed to dump object memory: ${e.message}`);
                }

                // Let's also try to read the specific members we identified.
                try {
                    const bufferInfoPtr1 = objectPtr.add(0x10).readPointer();
                    const dataPtr1 = bufferInfoPtr1.readPointer();
                    const endPtr1 = bufferInfoPtr1.add(8).readPointer();
                    const size1 = endPtr1.sub(dataPtr1).toInt32();
                    console.log(`  -> Member at +0x10: Buffer Info Ptr: ${bufferInfoPtr1}, Size: ${size1}`);
                } catch(e) {
                    console.log(`  -> Could not parse member at +0x10: ${e.message}`);
                }

                try {
                    const bufferInfoPtr2 = objectPtr.add(0x18).readPointer();
                    const dataPtr2 = bufferInfoPtr2.readPointer();
                    const endPtr2 = bufferInfoPtr2.add(8).readPointer();
                    const size2 = endPtr2.sub(dataPtr2).toInt32();
                    console.log(`  -> Member at +0x18: Buffer Info Ptr: ${bufferInfoPtr2}, Size: ${size2}`);
                } catch(e) {
                    console.log(`  -> Could not parse member at +0x18: ${e.message}`);
                }
            }
        }
    });
}


function main() {
    trafficDir = `${getTempDir()}\\frame_builder_dumps`;
    ensureDirectory(trafficDir);
    console.log(`[+] Dumps will be saved to: ${trafficDir}`);
    
    const module = Process.getModuleByName(TARGET_MODULE);
    if (!module) {
        setTimeout(main, 1000);
        return;
    }
    console.log(`[+] Found ${TARGET_MODULE} at ${module.base}`);

    attachAndLog(module, 'FrameBuilder1', RVA_BUILDER_1);
    attachAndLog(module, 'FrameBuilder2', RVA_BUILDER_2);
    
    console.log('\n[+] Hooks installed. Enable a software-controlled effect (like Audio Visualizer or Aurora Sync).');
}

// --- Full implementations of helpers for copy-paste ---
function getTempDir() {
    try {
        const k32 = Process.getModuleByName('kernel32.dll');
        const getTmp = new NativeFunction(k32.getExportByName('GetTempPathW'), 'uint32', ['uint32', 'pointer']);
        const buf = Memory.alloc(520 * 2);
        const len = getTmp(520, buf);
        if (len === 0) return 'C:\\Temp';
        return buf.readUtf16String(len);
    } catch (e) { return null; }
}
function ensureDirectory(path) {
    try {
        const k32 = Process.getModuleByName('kernel32.dll');
        const createDir = new NativeFunction(k32.getExportByName('CreateDirectoryW'), 'bool', ['pointer', 'pointer']);
        createDir(Memory.allocUtf16String(path), NULL);
    } catch (e) {}
}
function writeBinaryFile(filename, data) {
    if (!data) return;
    const fullPath = `${trafficDir}\\${filename}`;
    try {
        const f = new File(fullPath, 'wb');
        f.write(data);
        f.close();
    } catch (e) { console.error(`Failed to write file ${filename}: ${e.message}`); }
}

setImmediate(main);