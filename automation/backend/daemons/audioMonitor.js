const portAudio = require('naudiodon');
const fft = require('fft-js'); // npm install fft-js
const { sendCommand } = require('../frida/proxy');
const { getGodModeState } = require('../services/godmodeConfigStore');

// --- CONFIG ---
const SAMPLE_RATE = 44100; // Standardize on 44.1k
const FFT_SIZE = 1024;
const REFRESH_RATE = 30;   // ~30ms update rate

// FFT Scaling
const MIN_DB = -80;
const MAX_DB = -10;

// --- STATE ---
let ai = null;
let isActive = false;
let currentSourceType = null;
let currentMode = null; // 'Rows (Loudness)', 'Rows (EQ)', 'Rows (Hybrid)'
let processingInterval = null;

// Config
let currentSensitivity = 3.5;
let currentDecay = 0.15;

// Data Buffers
let rawBuffer = [];          // Circular buffer for FFT
let currentPeak = 0;         // For Loudness Mode
let currentBands = [0, 0, 0, 0, 0, 0]; // For EQ Mode

// --- HELPERS ---

// 1. Hanning Window (Prevents spectral leakage)
const windowTable = new Float32Array(FFT_SIZE);
for (let i = 0; i < FFT_SIZE; i++) {
    windowTable[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1)));
}

// 2. Decibel Conversion
function toDecibels(magnitude) {
    if (magnitude <= 0) return MIN_DB;
    return 20 * Math.log10(magnitude);
}

/**
 * Finds the correct audio device based on the target source type.
 */
function getAudioDevice(targetSource) {
    const devices = portAudio.getDevices();
    console.log(`[AudioDaemon] Searching for device for source: "${targetSource}"`);

    if (targetSource === 'Windows Audio') {
        const stereoMixDevice = devices.find(d =>
            d.name.includes('Stereo Mix') && d.maxInputChannels > 0
        );
        if (stereoMixDevice) return stereoMixDevice;
        return devices.find(d => d.id === 0);
    } else { 
        const microphoneDevice = devices.find(d =>
            d.hostAPIName === 'Windows WASAPI' &&
            d.maxInputChannels > 0 &&
            d.name.includes('Microphone')
        );
        if (microphoneDevice) return microphoneDevice;
        return devices.find(d => d.maxInputChannels > 0 && !d.name.includes('Stereo Mix'));
    }
}

function startAudio(sourceType) {
    if (ai) {
        ai.quit();
        ai = null;
    }
    if (processingInterval) {
        clearInterval(processingInterval);
        processingInterval = null;
    }

    const device = getAudioDevice(sourceType);
    if (!device) {
        console.error(`[AudioDaemon] Could not find device for: "${sourceType}"`);
        return;
    }

    // We prioritize 44100 to match FFT expectations, but fallback to device default
    const deviceRate = device.defaultSampleRate || SAMPLE_RATE;
    console.log(`[AudioDaemon] Starting Stream on [${device.name}] @ ${deviceRate}Hz`);
    
    currentSourceType = sourceType;
    rawBuffer = []; // Reset buffer

    try {
        ai = new portAudio.AudioIO({
            inOptions: {
                channelCount: 2,
                sampleFormat: portAudio.SampleFormat16Bit,
                sampleRate: deviceRate,
                deviceId: device.id,
                closeOnError: false
            }
        });

        // --- 1. FAST INPUT LOOP (Data Ingestion) ---
        ai.on('data', buffer => {
            if (!isActive) return;

            const numFrames = buffer.length / 4; // 2 channels * 2 bytes
            
            // We process audio into floats immediately to serve both RMS and FFT
            for (let i = 0; i < numFrames; i++) {
                // Read Stereo
                const left = buffer.readInt16LE(i * 4) / 32768.0;
                const right = buffer.readInt16LE(i * 4 + 2) / 32768.0;
                
                // Combine to Mono
                const mono = (left + right) / 2;
                
                // Push to circular buffer
                rawBuffer.push(mono);
            }

            // Cap buffer size to prevent memory leaks (keep enough for FFT)
            if (rawBuffer.length > 4096) {
                rawBuffer = rawBuffer.slice(rawBuffer.length - FFT_SIZE);
            }
        });

        ai.start();

        // --- 2. THROTTLED PROCESSING LOOP (Analysis) ---
        processingInterval = setInterval(() => {
            if (!isActive) return;

            // --- HYBRID MODE UPDATE ---
            if (currentMode === 'Rows (Hybrid)') {
                // Calculate BOTH:
                // 1. RMS for the F-Keys
                // 2. FFT for the rest
                processLoudness();
                processEQ();
            } 
            else if (currentMode === 'Rows (EQ)') {
                processEQ();
            } 
            else {
                // Default: Loudness
                processLoudness();
            }

        }, REFRESH_RATE);

    } catch (e) {
        console.error(`[AudioDaemon] Stream Error:`, e.message);
    }
}

// --- LOGIC: RMS LOUDNESS ---
function processLoudness() {
    const sampleCount = 512;
    if (rawBuffer.length < sampleCount) return;

    const slice = rawBuffer.slice(rawBuffer.length - sampleCount);
    
    let sum = 0;
    for (let i = 0; i < slice.length; i++) {
        sum += slice[i] * slice[i];
    }
    const rms = Math.sqrt(sum / slice.length);

    // --- FIX: Use Logarithmic (dB) Scaling ---
    // Previously: Linear (rms * sensitivity). This was too quiet compared to EQ.
    // Now: We match the EQ's math exactly.
    
    const gainDB = currentSensitivity * 4; 
    const db = toDecibels(rms) + gainDB;
    
    // Normalize -80dB to -10dB range -> 0.0 to 1.0
    let val = (db - MIN_DB) / (MAX_DB - MIN_DB);

    // Clamp
    if (val < 0) val = 0;
    if (val > 1.0) val = 1.0;

    // Smooth Peak (Attack/Decay)
    if (val > currentPeak) {
        currentPeak = val;
    } else {
        currentPeak -= currentDecay;
        if (currentPeak < 0) currentPeak = 0;
    }

    // Send to Renderer
    if (currentPeak > 0.001 || currentPeak === 0) {
         sendCommand('updateState', { fx: { audioPeak: currentPeak } }).catch(() => {});
    }
}

// --- LOGIC: FFT EQ ---
function processEQ() {
    if (rawBuffer.length < FFT_SIZE) return;

    // 1. Get latest chunk
    const slice = rawBuffer.slice(rawBuffer.length - FFT_SIZE);

    // 2. Window Function
    const windowed = slice.map((samp, i) => samp * windowTable[i]);

    // 3. FFT
    const phasors = fft.fft(windowed);
    const magnitudes = fft.util.fftMag(phasors);

    // 4. Map to Bands
    // Freq ranges (approx for 44.1k/1024)
    const ranges = [ 
        [1, 3],     // Sub
        [4, 8],     // Bass
        [9, 20],    // Low Mid
        [21, 50],   // Mid
        [51, 110],  // High Mid
        [111, 255]  // Treble
    ];

    // Map Sensitivity to dB Gain (e.g., slider 3.5 -> ~15dB boost)
    const gainDB = currentSensitivity * 4; 

    let hasData = false;

    ranges.forEach((range, i) => {
        let maxVal = 0;
        for (let b = range[0]; b <= range[1] && b < magnitudes.length; b++) {
            let normalized = magnitudes[b] / (FFT_SIZE / 2);
            if (normalized > maxVal) maxVal = normalized;
        }

        let db = toDecibels(maxVal) + gainDB;
        let percent = (db - MIN_DB) / (MAX_DB - MIN_DB);

        if (percent < 0) percent = 0;
        if (percent > 1) percent = 1;

        // Attack / Decay
        if (percent >= currentBands[i]) {
            currentBands[i] = percent;
        } else {
            currentBands[i] -= currentDecay;
            if (currentBands[i] < 0) currentBands[i] = 0;
        }
        
        if(currentBands[i] > 0.01) hasData = true;
    });

    // Send to Renderer
    // We always send if there is data, or occasionally to clear to 0
    sendCommand('updateState', { fx: { audioBands: currentBands } }).catch(() => {});
}


// --- WATCHDOG ---
setInterval(async () => {
    const state = await getGodModeState();
    const config = state.widgets?.audioFx || {};
    const enabled = state.active && config.enabled;
    
    const targetSource = config.source || 'Windows Audio'; 
    const targetMode = config.mode || 'Rows (Loudness)';

    // Update Configs
    if (config.sensitivity) currentSensitivity = config.sensitivity;
    if (config.decay) currentDecay = config.decay;

    if (enabled) {
        isActive = true;
        currentMode = targetMode;

        // Restart stream if source changed OR device was lost
        if (!ai || currentSourceType !== targetSource) {
            startAudio(targetSource);
        }
    } else {
        isActive = false;
        // Clean up if we just turned it off
        if (ai) {
            console.log('[AudioDaemon] Disabling audio stream.');
            ai.quit();
            ai = null;
            currentSourceType = null;
            if(processingInterval) clearInterval(processingInterval);
        }
    }
}, 2000);