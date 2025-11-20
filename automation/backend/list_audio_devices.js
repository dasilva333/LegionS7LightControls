const portAudio = require('naudiodon');

console.log("--- Audio Device Probe ---");
const devices = portAudio.getDevices();

if (devices.length === 0) {
    console.log("No devices found.");
} else {
    devices.forEach(d => {
        console.log(`\n[ID: ${d.id}] ${d.name}`);
        console.log(`    API: ${d.hostAPIName}`);
        console.log(`    Max Inputs: ${d.maxInputChannels}`);
        console.log(`    Max Outputs: ${d.maxOutputChannels}`);
        console.log(`    Sample Rates: ${d.defaultSampleRate}`);
    });
}

console.log("\n--- End Probe ---");