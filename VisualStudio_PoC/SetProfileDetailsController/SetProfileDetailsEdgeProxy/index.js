// MUST be the very first line
process.env.EDGE_USE_CORECLR = '1';

const edge = require('edge-js');
const path = require('path');

// --- Configuration ---
// Path to the NEW wrapper DLL we are creating
const wrapperDllPath = path.join(
  __dirname,
  '..',
  'SetProfileDetailsWrapper',
  'bin',
  'x64',
  'Debug',
  'net7.0',
  'SetProfileDetailsWrapper.dll'
);

// --- Edge.js Function Definition ---
const replayTimeline = edge.func({
  assemblyFile: wrapperDllPath,
  typeName: 'SetProfileDetailsWrapper.WrapperService',
  methodName: 'ReplayTimeline'
});


// --- Main Execution Logic ---
async function main() {
  // Get all command line arguments after "node index.js"
  const timestamps = process.argv.slice(2);

  if (timestamps.length === 0) {
    console.error('ERROR: Please provide at least one timestamp to replay.');
    console.error('Usage: node index.js <timestamp1> [timestamp2] ...');
    process.exit(1);
  }

  // Join them with a comma, just like the original C# program did
  const timelineString = timestamps.join(',');

  console.log(`--- Replaying Profile Timeline ---`);
  console.log(`Timestamps: ${timelineString}`);

  try {
    const result = await new Promise((resolve, reject) => {
      replayTimeline(timelineString, (error, result) => {
        if (error) return reject(error);
        resolve(result);
      });
    });

    if (result === true) {
      console.log('\nSUCCESS: Replay completed successfully.');
      console.log('Check %LOCALAPPDATA%\\ProfileBridge\\details_setter.log for details from the native bridge.');
    } else {
      console.error('\nERROR: The operation completed but returned an unexpected result:', result);
    }
  } catch (error) {
    console.error('\nFATAL ERROR DURING REPLAY:');
    console.error(error.message || error);
  }
}

main();