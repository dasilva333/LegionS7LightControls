const edge = require('edge-js');
const process = require('process');
const path = require('path');

// --- Configuration ---
// Define the path to the DLL. This is the only line you might ever need to change.
const ledDllPath = 'C:\\ProgramData\\Lenovo\\Vantage\\Addins\\LenovoGamingSystemAddin\\1.3.1.34\\LED.dll';
const ledDllDirectory = path.dirname(ledDllPath);

// --- C# Source Code ---
// We embed the C# code directly into our script using a template literal (`...`).
// This is the most reliable method as it avoids all file I/O and parsing issues.
const csharpSource = `
    using System;
    using System.Runtime.InteropServices;
    using System.Threading.Tasks;

    public class Startup
    {
        // This is the main entry point that edge-js will call
        public async Task<object> Invoke(dynamic input)
        {
            string command = (string)input.command;

            if (command == "open")
            {
                return LedCreate();
            }
            else if (command == "close")
            {
                IntPtr handleToClose = new IntPtr((long)input.handle);
                LedHandleClose(handleToClose);
                return true;
            }

            return null;
        }

        // --- P/Invoke Signatures for LED.dll ---
        // The path is passed in from the DllImport attribute.
        private const string LedDll = @"${ledDllPath}";

        [DllImport(LedDll, CallingConvention = CallingConvention.Cdecl, EntryPoint = "LedCreate")]
        private static extern IntPtr LedCreate();

        [DllImport(LedDll, CallingConvention = CallingConvention.Cdecl, EntryPoint = "LedHandleClose")]
        private static extern bool LedHandleClose(IntPtr hObject);
    }
`;

// --- Edge.js Function Setup ---
// We replace the placeholder in our C# source with the actual path.
const getLedHandle = edge.func({
    source: csharpSource.replace('${ledDllPath}', ledDllPath.replace(/\\/g, '\\\\'))
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
    const originalDirectory = process.cwd();

    try {
        console.log(`Original working directory: ${originalDirectory}`);
        process.chdir(ledDllDirectory);
        console.log(`Changed working directory to: ${process.cwd()}`);
        
        console.log("Attempting to call LedCreate()...");
        const result = await getLedHandle({ command: 'open' });

        if (result === undefined || result === null) {
            throw new Error("LedCreate() returned null/undefined. Ensure the script is run as Administrator and the DLL path is correct.");
        }
        
        handle = new IntPtr(result);

        if (handle.ToInt64() <= 0n) {
            console.error(`Failed to get a valid handle. Result: ${result}. This can happen if the LED service is stopped or the driver is not responding.`);
        } else {
            console.log("========================================");
            console.log(`      SUCCESS! Handle acquired: ${handle}`);
            console.log("========================================");
        }

    } catch (error) {
        console.error("\n--- AN ERROR OCCURRED ---");
        console.error(error.message);
        console.error("-------------------------\n");
    } finally {
        if (handle.ToInt64() > 0n) {
            console.log("Closing handle...");
            await getLedHandle({ command: 'close', handle: handle });
            console.log("Handle closed.");
        }
        
        process.chdir(originalDirectory);
        console.log(`Restored working directory to: ${originalDirectory}`);
    }
}

main();