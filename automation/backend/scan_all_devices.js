const portAudio = require('naudiodon');

console.log("--- 🔍 Audio Device Brute-Force Scanner ---\n");

const devices = portAudio.getDevices();

// We will store working candidates here
const workingDevices = [];

// Helper to try opening a stream
function tryOpenStream(device, sampleRate) {
    try {
        const ai = new portAudio.AudioIO({
            inOptions: {
                channelCount: Math.min(2, device.maxInputChannels), // Use 1 if device only has 1
                sampleFormat: portAudio.SampleFormat16Bit,
                sampleRate: sampleRate,
                deviceId: device.id,
                closeOnError: false
            }
        });
        // If we get here, it worked!
        ai.quit(); // Close immediately
        return true;
    } catch (e) {
        return false;
    }
}

devices.forEach(d => {
    // Only check Input devices
    if (d.maxInputChannels <= 0) return;

    process.stdout.write(`[ID: ${d.id}] ${d.name.substring(0, 40)}... (${d.hostAPIName}) `);

    // Try 44100Hz
    let works44 = tryOpenStream(d, 44100);
    
    // Try 48000Hz
    let works48 = tryOpenStream(d, 48000);

    if (works44 || works48) {
        console.log("✅ OPEN SUCCESS");
        const rates = [];
        if (works44) rates.push("44100");
        if (works48) rates.push("48000");
        
        workingDevices.push({
            id: d.id,
            name: d.name,
            api: d.hostAPIName,
            rates: rates
        });
    } else {
        console.log("❌ FAILED (Invalid Device/Params)");
    }
});

console.log("\n--- 🏆 Working Candidates ---");
if (workingDevices.length === 0) {
    console.log("No working input devices found. This is rare. Check microphone permissions in Windows Privacy Settings.");
} else {
    workingDevices.forEach(d => {
        console.log(`ID: ${d.id} | API: ${d.api} | Rates: ${d.rates.join(', ')} | Name: ${d.name}`);
    });
}

console.log("\n-----------------------------");
console.log("Use one of the IDs above in your config.");