const fs = require('fs');
const path = require('path');

/**
 * Dumps the contents of a binary file as a formatted hex string.
 * @param {string} filePath - The path to the binary file.
 */
function hexDump(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`ERROR: File not found at ${filePath}`);
        return;
    }

    const buffer = fs.readFileSync(filePath);
    const lines = [];

    for (let i = 0; i < buffer.length; i += 16) {
        const chunk = buffer.slice(i, i + 16);
        
        // 1. The offset
        const offset = i.toString(16).padStart(8, '0');
        
        // 2. The hex values
        const hex = Array.from(chunk)
            .map(b => b.toString(16).padStart(2, '0'))
            .join(' ');
        
        // 3. The ASCII representation
        const ascii = Array.from(chunk)
            .map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.')
            .join('');

        lines.push(`${offset}  ${hex.padEnd(48)} |${ascii}|`);
    }
    
    console.log(`--- Hex Dump of ${path.basename(filePath)} (${buffer.length} bytes) ---`);
    console.log(lines.join('\n'));
}


// --- Main Execution ---
const targetFile = process.argv[2];
if (!targetFile) {
    console.error('Usage: node dump_hex.js <path_to_binary_file>');
    process.exit(1);
}

hexDump(targetFile);