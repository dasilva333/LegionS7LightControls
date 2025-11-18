'use strict';

const TARGET_MODULE = 'Gaming.AdvancedLighting.dll';
const PRIMITIVE_RVA = 0x209b0; // FUN_1800209b0, our target

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

function main() {
    trafficDir = `${getTempDir()}\\hid_reports`;
    ensureDirectory(trafficDir);
    console.log(`[+] HID reports will be saved to: ${trafficDir}`);
    
    const module = Process.getModuleByName(TARGET_MODULE);
    if (!module) {
        console.log(`[!] ${TARGET_MODULE} not found. Waiting...`);
        setTimeout(main, 1000);
        return;
    }
    console.log(`[+] Found ${TARGET_MODULE} at ${module.base}`);

    const primitiveAddress = module.base.add(PRIMITIVE_RVA);
    
    console.log(`[+] Hooking Primitive HID Writer at ${primitiveAddress}`);
    
    Interceptor.attach(primitiveAddress, {
        onEnter(args) {
            // From Ghidra: FUN_1800209b0(longlong param_1, longlong *param_2, longlong *param_3)
            // param_3 seems to hold the buffer info. It's a pointer to an array/struct.
            const bufferInfoPtr = args[2];
            
            try {
                // Read the pointer to the actual data from the start of the struct.
                const dataPtr = bufferInfoPtr.readPointer();
                
                // Read the pointer to the end of the data.
                const endPtr = bufferInfoPtr.add(Process.pointerSize).readPointer();
                
                // Calculate the size.
                const size = endPtr.sub(dataPtr).toInt32();

                if (size > 0 && size < 1024) { // Sanity check the size
                    const timestamp = Date.now();
                    const filename = `hid_report_${timestamp}.bin`;
                    
                    console.log(`\n--- Intercepted Primitive Call [${timestamp}] ---`);
                    console.log(`  -> Buffer Size: ${size} bytes`);
                    
                    const data = dataPtr.readByteArray(size);
                    writeBinaryFile(filename, data);
                    
                    console.log(`  -> Dumped report to ${filename}`);
                    console.log(`  -> Preview: ${Array.from(new Uint8Array(data.slice(0, 16))).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
                }
            } catch (e) {
                // Log errors but don't crash the script
                console.error(`  [!] Error parsing arguments for primitive call: ${e.message}`);
            }
        }
    });

    console.log('[+] Hook installed. Enable a software-controlled effect (like Audio Visualizer or Aurora Sync) in Vantage.');
}

setImmediate(main);