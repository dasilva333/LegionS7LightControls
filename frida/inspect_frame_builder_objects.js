const fs = require('fs');
const path = require('path');

// --- Configuration ---
const DUMPS_DIR = path.join(process.env.TEMP, 'frame_builder_dumps');
const POINTER_SIZE = 8; // We are on a 64-bit system

/**
 * Reads a 64-bit pointer from a buffer at a given offset.
 * @param {Buffer} buffer - The buffer to read from.
 * @param {number} offset - The byte offset to start reading.
 * @returns {bigint|null} The pointer value as a BigInt, or null if out of bounds.
 */
function readPointer(buffer, offset) {
    if (offset + POINTER_SIZE > buffer.length) {
        return null;
    }
    // readBigUInt64LE is the method to read 8-byte little-endian pointers
    return buffer.readBigUInt64LE(offset);
}

/**
 * Dumps a small preview of memory from a given pointer.
 * Note: This function can only work if the Frida script is also dumping the memory
 * that these pointers point to. For now, it will show us the pointer values.
 * In the next step, we would modify the hook to dump these regions.
 */
function dumpPointedToMemory(ptrValue, prefix) {
    // This is a placeholder for future analysis. For now, we just print the address.
    if (ptrValue !== 0n) {
        console.log(`    -> ${prefix} points to address: 0x${ptrValue.toString(16)}`);
    } else {
        console.log(`    -> ${prefix} is a NULL pointer.`);
    }
}


function main() {
    console.log(`--- Frame Builder Object Inspector ---`);
    console.log(`Analyzing files in: ${DUMPS_DIR}`);

    if (!fs.existsSync(DUMPS_DIR)) {
        console.error('ERROR: Directory not found. Did you run the hook?');
        return;
    }

    const files = fs.readdirSync(DUMPS_DIR)
        .filter(f => f.endsWith('.bin'))
        .sort();

    if (files.length === 0) {
        console.log('No .bin files found to analyze.');
        return;
    }

    console.log(`Found ${files.length} object dump files to analyze.\n`);

    // We only need to inspect one or two files to find the pattern.
    const fileToInspect = files[0];
    console.log(`--- Inspecting First File: ${fileToInspect} ---`);

    const buffer = fs.readFileSync(path.join(DUMPS_DIR, fileToInspect));

    // Interpret the first 32 bytes as four 8-byte pointers
    const ptr_0x00 = readPointer(buffer, 0x00);
    const ptr_0x08 = readPointer(buffer, 0x08);
    const ptr_0x10 = readPointer(buffer, 0x10); // We know this one
    const ptr_0x18 = readPointer(buffer, 0x18); // We know this one

    console.log(`[+] Pointers found in the object structure:`);
    console.log(`  - [Offset +0x00]: 0x${ptr_0x00.toString(16).padStart(16, '0')}`);
    console.log(`  - [Offset +0x08]: 0x${ptr_0x08.toString(16).padStart(16, '0')}`);
    console.log(`  - [Offset +0x10]: 0x${ptr_0x10.toString(16).padStart(16, '0')} (Known: Buffer Info Ptr)`);
    console.log(`  - [Offset +0x18]: 0x${ptr_0x18.toString(16).padStart(16, '0')} (Known: Null or other data)`);

    console.log('\n--- Analysis ---');
    console.log('The "Buffer Info Ptr" at offset +0x10 points to the final, packed 960-byte HID report.');
    console.log('One of the other pointers (likely at +0x00 or +0x08) is the candidate for the "clean" input data.');
    console.log('The next step is to modify the Frida hook to dump the memory that these pointers point to.');
}

main();