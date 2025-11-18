const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// --- Configuration ---
// Path to the .NET executable
const DOTNET_EXE_PATH = 'C:\\Program Files\\dotnet\\dotnet.exe';
// Path to the known-working C# project file
const PROJECT_PATH = path.resolve(__dirname, '..', '..', '..', '..', 'SwitchProfilesByFilename', 'SwitchProfileTest', 'SwitchProfileTest.csproj');

/**
 * Executes the SwitchProfileTest project via `dotnet run`.
 * @param {string} profileName - The name of the profile file (without .json) to apply.
 * @returns {Promise<void>} - A promise that resolves when the worker terminates.
 */
// In automation/backend/profileExecutor/index.js

function profileExecutor(profileName) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(PROJECT_PATH)) {
            return reject(new Error(`Worker project file not found at: ${PROJECT_PATH}`));
        }

        // THE FIX: Define the C# project's directory as the working directory.
        const projectDirectory = path.dirname(PROJECT_PATH);

        const args = [
            'run',
            // We no longer need --project because 'dotnet run' will find the .csproj
            // in the new working directory.
            '--', 
            profileName
        ];
        
        console.log(`[Executor] Spawning: ${DOTNET_EXE_PATH} ${args.join(' ')}`);
        console.log(`[Executor] Using working directory: ${projectDirectory}`);
        
        // THE FIX: Spawn 'dotnet.exe' with the 'cwd' option set to the project's folder.
        const worker = spawn(DOTNET_EXE_PATH, args, { cwd: projectDirectory });

        worker.stdout.on('data', (data) => {
            console.log(`[Worker STDOUT] ${data.toString().trim()}`);
        });

        worker.stderr.on('data', (data) => {
            console.error(`[Worker STDERR] ${data.toString().trim()}`);
        });

        worker.on('close', (code) => {
            console.log(`[Executor] Worker process has terminated (Code: ${code}). This is the expected outcome.`);
            resolve();
        });

        worker.on('error', (err) => {
            console.error('[Executor] Failed to start dotnet process.', err);
            reject(err);
        });
    });
}

module.exports = { profileExecutor };

// --- Main Execution Logic (CLI Support) ---
// This block only runs if this file is executed directly via node (not required as a module)
if (require.main === module) {
    async function main() {
        const profileToApply = process.argv[2];

        if (!profileToApply) {
            console.error('ERROR: Please provide a profile name to apply.');
            console.error('Usage: node index.js <profileName>');
            process.exit(1);
        }
        
        try {
            await profileExecutor(profileToApply);
            console.log("process exited gracefully");
        } catch (err) {
            console.error("Executor failed with an unrecoverable error:", err);
        }
    }

    main();
}