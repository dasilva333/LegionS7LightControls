'use strict';

const TARGET_MODULE = 'Gaming.AdvancedLighting.dll';
const RVA_FRAME_BUILDER = 0x37990;

const DUMP_SIZE = 256; // Let's dump 256 bytes from each pointed-to location

let trafficDir = '';
let callCount = 0;
const MAX_CAPTURES = 10; // Let's only capture a few times to avoid flooding the disk

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

function main() {
    trafficDir = `${getTempDir()}\\deep_dive_dumps`;
    ensureDirectory(trafficDir);
    console.log(`[+] Deep Dive dumps will be saved to: ${trafficDir}`);
    
    const module = Process.getModuleByName(TARGET_MODULE);
    if (!module) {
        setTimeout(main, 1000);
        return;
    }
    console.log(`[+] Found ${TARGET_MODULE} at ${module.base}`);

    const builderAddress = module.base.add(RVA_FRAME_BUILDER);
    console.log(`[+] Hooking FrameBuilder function at ${builderAddress}`);
    
    Interceptor.attach(builderAddress, {
        onEnter(args) {
            if (callCount >= MAX_CAPTURES) {
                return;
            }
            callCount++;
            
            const timestamp = Date.now();
            console.log(`\n--- HIT: FrameBuilder CALLED [${timestamp}] ---`);

            const objectPtr = args[0];
            
            // --- Dereference the pointers we discovered ---
            try {
                // Pointer at Offset +0x00
                const ptr_0x00 = objectPtr.readPointer();
                console.log(`  -> Pointer at +0x00: ${ptr_0x00}`);
                if (!ptr_0x00.isNull()) {
                    const data = ptr_0x00.readByteArray(DUMP_SIZE);
                    writeBinaryFile(`dump_0x00_${timestamp}.bin`, data);
                    console.log(`    -> Dumped 256 bytes to dump_0x00_${timestamp}.bin`);
                }

                // Pointer at Offset +0x08
                const ptr_0x08 = objectPtr.add(8).readPointer();
                console.log(`  -> Pointer at +0x08: ${ptr_0x08}`);
                if (!ptr_0x08.isNull()) {
                    const data = ptr_0x08.readByteArray(DUMP_SIZE);
                    writeBinaryFile(`dump_0x08_${timestamp}.bin`, data);
                    console.log(`    -> Dumped 256 bytes to dump_0x08_${timestamp}.bin`);
                }

            } catch (e) {
                console.error(`  [!] Error during deep dive: ${e.message}`);
            }

            if (callCount === MAX_CAPTURES) {
                console.log('\n[+] Max captures reached. Detaching hooks to prevent log spam.');
                Interceptor.detachAll();
            }
        }
    });

    console.log('\n[+] Hooks installed. Enable a software-controlled effect to trigger the dump.');
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