const portAudio = require('naudiodon');
const fft = require('fft-js');

// --- CONFIG ---
const AUDIO_DEVICE_ID = 0; // Ensure this is your Stereo Mix / Loopback
const SAMPLE_RATE = 44100; // 44.1k is standard for most windows audio
const FFT_SIZE = 1024;     // Power of 2
const REFRESH_RATE = 30;   // Milliseconds (approx 30-35 FPS)

// Adjust this to boost quiet signals (dB offset)
const GAIN_DB = 10; 
const MIN_DB = -80;        // The "floor" (0% on the bar)
const MAX_DB = -10;        // The "ceiling" (100% on the bar)
const DECAY = 0.15;        // How fast bars fall

// --- STATE ---
let ai = null;
let currentBands = [0, 0, 0, 0, 0, 0];
let rawBuffer = []; // Stores incoming raw samples

// --- HELPERS ---

// 1. Hanning Window Function (Reduces spectral leakage/noise)
const windowTable = new Float32Array(FFT_SIZE);
for (let i = 0; i < FFT_SIZE; i++) {
    windowTable[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1)));
}

// 2. Convert Linear Amplitude to Decibels
function toDecibels(magnitude) {
    // Protect against log(0)
    if (magnitude <= 0) return MIN_DB;
    // 20 * log10(mag) is standard voltage dB
    return 20 * Math.log10(magnitude);
}

// --- LOGIC ---
function main() {
    console.clear();
    console.log(`\n--- 🎵 FFT Spectrum Analyzer Fixed ---`);
    console.log(`--- Sample Rate: ${SAMPLE_RATE} | Device: ${AUDIO_DEVICE_ID} ---`);

    try {
        ai = new portAudio.AudioIO({
            inOptions: {
                channelCount: 2, // Stereo
                sampleFormat: portAudio.SampleFormat16Bit,
                sampleRate: SAMPLE_RATE,
                deviceId: AUDIO_DEVICE_ID,
                closeOnError: false
            }
        });
    } catch (e) {
        console.error("❌ Init Failed:", e);
        return;
    }

    ai.on('data', buffer => {
        // 16-bit samples are 2 bytes. 
        // Stereo = 4 bytes per frame (Left + Right).
        const numFrames = buffer.length / 4;

        for (let i = 0; i < numFrames; i++) {
            // Read Left (Offset 0) and Right (Offset 2)
            // Convert int16 (-32768 to 32767) to float (-1.0 to 1.0)
            const left = buffer.readInt16LE(i * 4) / 32768.0;
            const right = buffer.readInt16LE(i * 4 + 2) / 32768.0;
            
            // Combine Stereo to Mono
            const mono = (left + right) / 2;
            
            rawBuffer.push(mono);
        }

        // prevent memory leak: keep buffer barely larger than FFT size
        // We only care about the *latest* sound.
        if (rawBuffer.length > 4096) {
            rawBuffer = rawBuffer.slice(rawBuffer.length - FFT_SIZE);
        }
    });

    ai.start();
    console.log(`\n✅ Stream Connected. Listening...\n\n\n\n\n\n`); // Spacing for UI

    // --- Processing Loop ---
    setInterval(() => {
        processAudio();
        drawMeter();
    }, REFRESH_RATE);
}

function processAudio() {
    // Need exactly FFT_SIZE samples
    if (rawBuffer.length < FFT_SIZE) return;

    // 1. Get the VERY LAST FFT_SIZE samples (Current audio)
    // This fixes the "lag" issue. We ignore old buffered data.
    const slice = rawBuffer.slice(rawBuffer.length - FFT_SIZE, rawBuffer.length);

    // 2. Apply Window Function
    const windowed = slice.map((samp, i) => samp * windowTable[i]);

    // 3. Perform FFT
    // fft-js returns complex phasors [real, imag]
    const phasors = fft.fft(windowed);
    
    // 4. Compute Magnitudes
    // fft.util.fftMag returns sqrt(r^2 + i^2)
    const magnitudes = fft.util.fftMag(phasors);

    // Define frequency bands (indexes based on FFT_SIZE=1024, SR=44100)
    // Bin width = 44100 / 1024 ≈ 43Hz
    const ranges = [ 
        [1, 3],     // Sub (43-129Hz)
        [4, 8],     // Bass (172-344Hz)
        [9, 20],    // Low Mid (387-860Hz)
        [21, 50],   // Mid (900-2150Hz)
        [51, 110],  // High Mid (2.2k-4.7k)
        [111, 255]  // Treble (4.8k-11k)
    ];

    ranges.forEach((range, i) => {
        let maxVal = 0;
        // Find peak in this frequency range
        for (let b = range[0]; b <= range[1] && b < magnitudes.length; b++) {
            // Normalize FFT output: Magnitude / (FFT_SIZE / 2)
            let normalized = magnitudes[b] / (FFT_SIZE / 2);
            if (normalized > maxVal) maxVal = normalized;
        }

        // Convert to Decibels
        let db = toDecibels(maxVal) + GAIN_DB;

        // Map dB to 0.0 - 1.0 range
        // If db is -80, percent is 0. If db is -10, percent is 1.
        let percent = (db - MIN_DB) / (MAX_DB - MIN_DB);
        
        // Clamp
        if (percent < 0) percent = 0;
        if (percent > 1) percent = 1;

        // Smooth decay (Visuals drop slowly, jump instantly)
        if (percent >= currentBands[i]) {
            currentBands[i] = percent; // Attack
        } else {
            currentBands[i] -= DECAY; // Decay
            if (currentBands[i] < 0) currentBands[i] = 0;
        }
    });
}

function drawMeter() {
    const barWidth = 30;
    const labels = ["Sub ", "Bass", "LowM", "Mid ", "High", "Treb"];
    
    let output = "";
    for (let i = 0; i < 6; i++) {
        const filled = Math.round(currentBands[i] * barWidth);
        const empty = barWidth - filled;
        
        // Safety check for negative repeat count
        const bar = '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, empty));
        
        output += `${labels[i]} [${bar}] ${(currentBands[i] * 100).toFixed(0).padStart(3, ' ')}%\n`;
    }
    
    // Move cursor up 6 lines and overwrite
    process.stdout.write('\u001b[6A' + output);
}

process.on('SIGINT', () => {
    console.log("\n\nStopping...");
    if(ai) ai.quit();
    process.exit();
});

main();