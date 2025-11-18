const fs = require('fs');
const path = require('path');

const REPORTS_DIR = path.join(process.env.TEMP, 'hid_reports');

/**
 * Finds the longest common starting sequence of bytes across all provided buffers.
 * @param {Buffer[]} buffers - An array of Node.js Buffer objects.
 * @returns {Buffer} A buffer containing the longest common prefix.
 */
function findLongestCommonHeader(buffers) {
    if (!buffers || buffers.length < 2) {
        return Buffer.alloc(0); // Cannot compare if there are fewer than 2 files
    }

    // Start by assuming the header is the first 20 bytes of the first file.
    let commonHeader = buffers[0].slice(0, 20);

    // Iterate through all other files to shorten the common header if a mismatch is found.
    for (let i = 1; i < buffers.length; i++) {
        const currentBuffer = buffers[i];
        
        // Find the first byte where the current file differs from our candidate header.
        let firstDifferenceIndex = -1;
        for (let j = 0; j < commonHeader.length; j++) {
            if (j >= currentBuffer.length || commonHeader[j] !== currentBuffer[j]) {
                firstDifferenceIndex = j;
                break;
            }
        }

        // If a difference was found, shorten our common header candidate.
        if (firstDifferenceIndex !== -1) {
            commonHeader = commonHeader.slice(0, firstDifferenceIndex);
        }
    }

    return commonHeader;
}

function main() {
    console.log(`--- HID Report Protocol Validator ---`);
    console.log(`Analyzing files in: ${REPORTS_DIR}`);

    if (!fs.existsSync(REPORTS_DIR)) {
        console.error('ERROR: Directory not found.');
        return;
    }

    const files = fs.readdirSync(REPORTS_DIR).filter(f => f.endsWith('.bin')).sort();

    if (files.length < 2) {
        console.log('Need at least two .bin files to determine a common header. Please generate more traffic.');
        return;
    }
    console.log(`Found ${files.length} report files to analyze.`);

    // Read all files into memory
    const allBuffers = files.map(file => fs.readFileSync(path.join(REPORTS_DIR, file)));

    // --- Analysis ---
    console.log('\n--- Analysis Results ---');

    const header = findLongestCommonHeader(allBuffers);

    if (header.length > 0) {
        console.log(`[1] Longest Common Header Found:`);
        console.log(`    -> Length: ${header.length} bytes`);
        console.log(`    -> Hex:    ${header.toString('hex')}`);
    } else {
        console.log(`[1] No consistent header found across all files.`);
        console.log(`    -> This may indicate the protocol has no static header, or the capture contains different report types.`);
    }

    // Now, we can re-run the key parsing with the *correct* header size.
    const HEADER_SIZE = header.length;
    const BYTES_PER_KEY = 5;
    let totalKeysWithColor = 0;
    
    for (const buffer of allBuffers) {
        if (buffer.length <= HEADER_SIZE) continue;
        const body = buffer.slice(HEADER_SIZE);
        for (let i = 0; i < body.length; i += BYTES_PER_KEY) {
            const chunk = body.slice(i, i + BYTES_PER_KEY);
            if (chunk.length < BYTES_PER_KEY) continue;
            
            const keyId = chunk.readUInt16LE(0);
            if (keyId > 0) {
                totalKeysWithColor++;
            }
        }
    }
    
    if(allBuffers.length > 0) {
        const avgKeys = totalKeysWithColor / allBuffers.length;
        console.log(`[2] Average Key Count (per report): ${avgKeys.toFixed(2)} keys have an ID.`);
        console.log(`    -> Based on a 5-byte structure (2-byte ID, 3-byte RGB).`);
    }
}

main();