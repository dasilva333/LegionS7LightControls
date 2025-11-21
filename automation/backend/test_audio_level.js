const portAudio = require('naudiodon');

// --- CONFIGURATION ---
// We target ID 0, the "Microsoft Sound Mapper".
// This special device automatically uses whatever you set as the 
// "Default Recording Device" in Windows Sound settings.
const AUDIO_DEVICE_ID = 0; 

// Both 44.1kHz and 48kHz worked for ID 0 in your scan, 48k is generally better.
const SAMPLE_RATE = 48000;  

function main() {
    console.log(`\n--- 🎧 Audio Level Monitor (Targeting Default Device: ID ${AUDIO_DEVICE_ID}) ---`);
    console.log("--- Make sure 'Stereo Mix' is ENABLED and SET AS DEFAULT in Windows Sound -> Recording ---");

    const ai = new portAudio.AudioIO({
        inOptions: {
            channelCount: 2,
            sampleFormat: portAudio.SampleFormat16Bit,
            sampleRate: SAMPLE_RATE,
            deviceId: AUDIO_DEVICE_ID,
            closeOnError: false
        }
    });

    let currentPeak = 0;

    ai.on('data', buffer => {
        let sum = 0;
        const len = buffer.length / 2;
        for (let i = 0; i < len; i++) {
            const int16 = buffer.readInt16LE(i * 2);
            sum += int16 * int16;
        }
        const rms = Math.sqrt(sum / len);
        const val = rms / 32768;
        if (val > currentPeak) currentPeak = val;
    });

    ai.on('error', err => console.error("Audio Error:", err));

    try {
        ai.start();
        console.log(`\n✅ Stream connected to Default Device (ID ${AUDIO_DEVICE_ID}) @ ${SAMPLE_RATE}Hz`);
        console.log("Play some music. This should work now!\n");
    } catch (e) {
        console.error("❌ Failed to start stream:", e);
        return;
    }

    setInterval(() => {
        const barLen = 40;
        const filled = Math.round(currentPeak * barLen);
        const bar = '█'.repeat(filled) + '-'.repeat(barLen - filled);
        process.stdout.write(`\rVolume: [${bar}] ${(currentPeak * 100).toFixed(1)}% `);
        currentPeak *= 0.7; // Decay
        if (currentPeak < 0.001) currentPeak = 0;
    }, 100);

    process.on('SIGINT', () => {
        console.log("\nStopping...");
        ai.quit();
        process.exit();
    });
}

main();