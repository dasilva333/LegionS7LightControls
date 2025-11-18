const fs = require('fs');
const path = require('path');

// --- Configuration (Based on our proven findings) ---
const REPORTS_DIR = path.join(process.env.TEMP, 'hid_reports');
const HEADER_SIZE = 6;
const BYTES_PER_KEY = 5;
const OUTPUT_FILE = path.join(__dirname, 'key_id_map.json');

function main() {
    console.log(`--- Key ID Cataloger ---`);
    console.log(`Analyzing files in: ${REPORTS_DIR}`);

    if (!fs.existsSync(REPORTS_DIR)) {
        console.error(`ERROR: Directory not found: ${REPORTS_DIR}`);
        return;
    }

    const files = fs.readdirSync(REPORTS_DIR).filter(f => f.endsWith('.bin'));
    if (files.length === 0) {
        console.log('No .bin files found to analyze.');
        return;
    }
    console.log(`Found ${files.length} report files.`);

    // Use a Set to automatically handle uniqueness.
    const uniqueKeyIds = new Set();

    for (const file of files) {
        const buffer = fs.readFileSync(path.join(REPORTS_DIR, file));
        
        // Skip files that are too small
        if (buffer.length <= HEADER_SIZE) continue;
        
        const body = buffer.slice(HEADER_SIZE);

        for (let i = 0; i < body.length; i += BYTES_PER_KEY) {
            const chunk = body.slice(i, i + BYTES_PER_KEY);
            if (chunk.length < BYTES_PER_KEY) continue;

            const keyId = chunk.readUInt16LE(0);
            
            // We only care about valid, non-zero keys.
            if (keyId > 0) {
                uniqueKeyIds.add(keyId);
            }
        }
    }

    // Convert the Set to a sorted array for clean output.
    const sortedKeyIds = Array.from(uniqueKeyIds).sort((a, b) => a - b);

    console.log(`\n--- Analysis Complete ---`);
    console.log(`Found ${sortedKeyIds.length} unique, non-zero Key IDs.`);

    // --- Create the JSON Mapping File ---
    // We will create a simple map where the key is the ID and the value is a placeholder.
    const keyIdMap = {};
    for (const id of sortedKeyIds) {
        keyIdMap[id] = `KEY_NAME_FOR_${id}`; // Placeholder for you to fill in
    }

    try {
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(keyIdMap, null, 4));
        console.log(`\nSUCCESS: Wrote key ID map to: ${OUTPUT_FILE}`);
        console.log('You can now edit this file to map the IDs to their real key names (e.g., "ESC", "W", "Space").');
    } catch (e) {
        console.error(`\nERROR: Failed to write output file: ${e.message}`);
    }
}

main();