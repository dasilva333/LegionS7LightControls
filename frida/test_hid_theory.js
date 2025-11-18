const fs = require('fs');
const path = require('path');

// --- Configuration ---
const REPORTS_DIR = path.join(process.env.TEMP, 'hid_reports');
const REPORT_SIZE = 960;
const HEADER_SIZE = 6; // Based on the first few bytes: 07 a1 c0 03
const BYTES_PER_KEY = 5;

/**
 * Parses a single 960-byte HID report buffer.
 * @param {Buffer} buffer - The raw binary data from a .bin file.
 * @returns {object|null} An object with header and a map of key colors, or null on failure.
 */
function parseReport(buffer) {
    if (buffer.length !== REPORT_SIZE) {
        return null; // Skip files that aren't the exact size
    }

    const header = buffer.slice(0, HEADER_SIZE);
    const body = buffer.slice(HEADER_SIZE);
    
    const keyColors = new Map();

    for (let i = 0; i < body.length; i += BYTES_PER_KEY) {
        const chunk = body.slice(i, i + BYTES_PER_KEY);
        if (chunk.length < BYTES_PER_KEY) continue;

        // Read Key ID as a 16-bit little-endian integer
        const keyId = chunk.readUInt16LE(0);
        
        // Read the R, G, B values
        const r = chunk[2];
        const g = chunk[3];
        const b = chunk[4];

        // We only care about keys that have a color set
        if (keyId > 0 || r > 0 || g > 0 || b > 0) {
            keyColors.set(keyId, { r, g, b });
        }
    }

    return { header, keyColors };
}

/**
 * Compares two parsed reports to see what changed.
 * @param {Map<number, object>} map1 
 * @param {Map<number, object>} map2 
 * @returns {Array} An array of strings describing the differences.
 */
function compareKeyMaps(map1, map2) {
    const differences = [];
    const allKeys = new Set([...map1.keys(), ...map2.keys()]);

    for (const keyId of allKeys) {
        const color1 = map1.get(keyId);
        const color2 = map2.get(keyId);

        if (!color1 || !color2 || color1.r !== color2.r || color1.g !== color2.g || color1.b !== color2.b) {
            const c1Str = color1 ? `rgb(${color1.r},${color1.g},${color1.b})` : 'none';
            const c2Str = color2 ? `rgb(${color2.r},${color2.g},${color2.b})` : 'none';
            differences.push(`Key ${keyId}: ${c1Str} -> ${c2Str}`);
        }
    }
    return differences;
}


function main() {
    console.log(`--- HID Report Protocol Validator ---`);
    console.log(`Analyzing files in: ${REPORTS_DIR}`);

    if (!fs.existsSync(REPORTS_DIR)) {
        console.error('ERROR: Directory not found. Did you run the sniffer?');
        return;
    }

    const files = fs.readdirSync(REPORTS_DIR)
        .filter(f => f.endsWith('.bin'))
        .sort(); // Sort files chronologically

    if (files.length === 0) {
        console.log('No .bin files found to analyze.');
        return;
    }

    console.log(`Found ${files.length} report files.`);

    const reports = [];
    for (const file of files) {
        const buffer = fs.readFileSync(path.join(REPORTS_DIR, file));
        const parsed = parseReport(buffer);
        if (parsed) {
            reports.push({ filename: file, ...parsed });
        }
    }

    if (reports.length === 0) {
        console.log('No valid 960-byte reports found.');
        return;
    }

    // --- Analysis ---
    console.log('\n--- Analysis Results ---');

    // 1. Check for a consistent header
    const firstHeader = reports[0].header.toString('hex');
    const allHeadersMatch = reports.every(r => r.header.toString('hex') === firstHeader);
    console.log(`[1] Header Consistency: ${allHeadersMatch ? 'OK' : 'FAIL'}`);
    if (allHeadersMatch) {
        console.log(`    -> Common Header: ${firstHeader}`);
    }

    // 2. Report on the number of colored keys
    const firstReportKeyCount = reports[0].keyColors.size;
    console.log(`[2] Key Count in First Report: ${firstReportKeyCount} keys have color.`);
    
    // 3. Compare the first and last reports to see the delta over time
    if (reports.length > 1) {
        const lastReport = reports[reports.length - 1];
        const differences = compareKeyMaps(reports[0].keyColors, lastReport.keyColors);
        console.log(`[3] Comparison (First vs. Last): Found ${differences.length} key color changes.`);
        if (differences.length > 0 && differences.length < 20) { // Only show small diffs
            console.log('    -> Changes:');
            differences.forEach(d => console.log(`       ${d}`));
        } else if (differences.length > 0) {
            console.log('    -> (More than 20 changes, omitting for brevity)');
        }
    }
    
    // 4. Sanity check a specific key (e.g., Key ID 1, often ESC)
    const keyIdToTrack = 1;
    const key1Color = reports[0].keyColors.get(keyIdToTrack);
    if (key1Color) {
        console.log(`[4] Sanity Check: Key ${keyIdToTrack} in the first report has color rgb(${key1Color.r},${key1Color.g},${key1Color.b}).`);
    } else {
        console.log(`[4] Sanity Check: Key ${keyIdToTrack} was not found or had no color in the first report.`);
    }
}

main();