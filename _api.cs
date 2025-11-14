const edge = require('edge-js');
const path = require('path');
const process = require('process');

// --- Configuration ---
// Define the path to the DLL here.
const ledDllPath = 'C:\\ProgramData\\Lenovo\\Vantage\\Addins\\LenovoGamingSystemAddin\\1.3.1.34\\LED.dll';

// Automatically determine the directory where the DLL resides.
const ledDllDirectory = path.dirname(ledDllPath);

// --- Edge.js Setup ---
// Point edge-js to our C# file. It will compile it automatically.
const getLedHandle = edge.func({
    source: path.join(__dirname, 'api.cs')
});

// Helper class to manage the native IntPtr handle in JavaScript
class IntPtr {
    static Zero = new IntPtr(0);
    constructor(value) { this.value = BigInt(value); }
    ToInt64() { return this.value; }
    toString() { return `0x${this.value.toString(16)}`; }
    toJSON() { return this.value; }
}

async function main() {
    let handle = IntPtr.Zero;
    const originalDirectory = process.cwd(); // Store our starting directory

    try {
        console.log(`Original working directory: ${originalDirectory}`);
        
        // --- THIS IS THE CRITICAL FIX ---
        // Change the working directory to the DLL's location.
        process.chdir(ledDllDirectory);
        console.log(`Changed working directory to: ${process.cwd()}`);
        
        console.log("Attempting to call LedCreate()...");
        const result = await getLedHandle({ command: 'open' });

        if (result === undefined || result === null) {
            throw new Error("LedCreate() returned a null/undefined handle. The service may have failed to start or the device driver is not available.");
        }
        
        handle = new IntPtr(result);

        if (handle.ToInt64() <= 0n) { // Check for 0 or -1
            console.error("Failed to get a valid handle from LedCreate(). Result was: " + result);
        } else {
            console.log(`SUCCESS! LED handle opened at: ${handle}`);
        }

    } catch (error) {
        console.error("An error occurred during the test:");
        console.error(error.message);
    } finally {
        if (handle.ToInt64() > 0n) {
            console.log("Closing handle...");
            await getLedHandle({ command: 'close', handle: handle });
            console.log("Handle closed.");
        }
        
        // Always change back to our original directory.
        process.chdir(originalDirectory);
        console.log(`Restored working directory to: ${process.cwd()}`);
    }
}

main();