const path = require('path');
const { spawn } = require('child_process');

// --- Configuration ---
// Path to the NEW WORKER EXECUTABLE we are creating
const workerExePath = path.join(
  __dirname,
  '..',
  'SwitchProfileWrapper',
  'bin',
  'x64',
  'Debug',
  'net7.0',
  'SwitchProfileWrapper.exe' // Note the .exe extension
);

// --- Main Execution Logic ---
async function main() {
  const profileName = process.argv[2];

  if (!profileName) {
    console.error('ERROR: Please provide the name of the profile to apply (without .json).');
    console.error('Usage: node apply.js <profileName>');
    process.exit(1);
  }

  console.log(`--- Applying Lighting Profile ---`);
  console.log(`Profile Name: '${profileName}'`);
  console.log(`Executing worker: ${workerExePath}`);

  // Spawn the worker process, passing the profile name as an argument
  const worker = spawn(workerExePath, [profileName]);

  // Capture and display output from the worker
  worker.stdout.on('data', (data) => {
    const message = data.toString().trim();
    console.log(`[Worker] ${message}`);
  });

  worker.stderr.on('data', (data) => {
    const message = data.toString().trim();
    console.error(`[Worker] ${message}`);
  });

  // Wait for the worker to exit and report the final result
  const exitCode = await new Promise((resolve, reject) => {
    worker.on('close', resolve);
    worker.on('error', reject);
  });

  console.log(`--- Worker process exited with code ${exitCode} ---`);

  if (exitCode === 0) {
    console.log('\nSUCCESS: Profile likely applied. Check your keyboard.');
    console.log('Check %LOCALAPPDATA%\\ProfileBridge\\switch_profile_by_filename.log for native details.');
  } else {
    console.error('\nERROR: The worker process reported a failure.');
  }
}

main();