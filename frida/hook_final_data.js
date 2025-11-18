'use strict';

const TARGET_MODULE = 'Gaming.AdvancedLighting.dll';
const RVA_FRAME_BUILDER = 0x37990; // FUN_180037990

let trafficDir = '';
let callCount = 0;
const MAX_CAPTURES = 20; // Let's capture a decent number of frames

// --- Proven Helper Functions ---
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
// --- End Helpers ---

function main() {
    trafficDir = `${getTempDir()}\\final_data_dumps`;
    ensureDirectory(trafficDir);
    console.log(`[+] Final data dumps will be saved to: ${trafficDir}`);
    
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

            // param_1 is the main object pointer
            const objectPtr = args[0];
            
            try {
                // --- THE DEEPEST DIVE ---
                // 1. Get the pointer to the data structure (at offset +0x08).
                const dataStructPtr = objectPtr.add(8).readPointer();
                console.log(`  -> Data Struct Ptr: ${dataStructPtr}`);

                if (dataStructPtr.isNull()) {
                    console.log('  -> Data Struct Ptr is NULL.');
                    return;
                }
                
                // 2. Dereference it to get the pointer to the clean data array.
                const cleanDataPtr = dataStructPtr.readPointer();
                console.log(`  -> Clean Data Ptr:  ${cleanDataPtr}`);

                if (cleanDataPtr.isNull()) {
                    console.log('  -> Clean Data Ptr is NULL.');
                    return;
                }

                // 3. Read the size/count. It's likely the 64-bit integer at offset +0x08
                //    in the data structure. Let's assume it's a count of items.
                const itemCount = dataStructPtr.add(8).readU64().toNumber();
                console.log(`  -> Item Count:      ${itemCount}`);
                
                // Let's assume the data is a simple struct of 4 bytes: [KeyID, R, G, B] or [R, G, B, A]
                // We'll dump a reasonable amount of data to analyze.
                const bytesToDump = itemCount * 4; // A good guess
                if (bytesToDump > 0 && bytesToDump < 4096) { // Sanity check
                    const data = cleanDataPtr.readByteArray(bytesToDump);
                    const filename = `clean_data_${timestamp}.bin`;
                    writeBinaryFile(filename, data);
                    console.log(`  -> Dumped ${bytesToDump} bytes of clean data to ${filename}`);
                } else if (itemCount > 0) {
                    console.log(`  -> Item count (${itemCount}) seems too large, skipping dump.`);
                }

            } catch (e) {
                console.error(`  [!] Error during deep dive: ${e.message}`);
            }

            if (callCount === MAX_CAPTURES) {
                console.log('\n[+] Max captures reached. Detaching hooks.');
                Interceptor.detachAll();
            }
        }
    });

    console.log('\n[+] Hooks installed. Enable a software-controlled effect to trigger the dump.');
}

setImmediate(main);