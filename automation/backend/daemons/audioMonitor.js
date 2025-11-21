const portAudio = require('naudiodon');
const { sendCommand } = require('../frida/proxy');
const { getGodModeState } = require('../services/godmodeConfigStore');

let ai = null;
let isActive = false;
let currentSourceType = null;

// Config
let currentSensitivity = 3.5;
let currentDecay = 0.15;

let currentPeak = 0;
let silenceTimeout = null;

/**
 * Finds the correct audio device based on the target source type.
 * This function has been updated based on our debugging.
 * @param {('Windows Audio' | 'Microphone')} targetSource 
 * @returns {portAudio.Device | undefined}
 */
function getAudioDevice(targetSource) {
    const devices = portAudio.getDevices();
    console.log(`[AudioDaemon] Searching for device for source: "${targetSource}"`);

    if (targetSource === 'Windows Audio') {
        // --- CORRECTED LOGIC FOR SYSTEM AUDIO ---
        // Find the "Stereo Mix" device, regardless of its API.
        // We no longer block 'Windows WDM-KS' as it's often the correct one.
        const stereoMixDevice = devices.find(d =>
            d.name.includes('Stereo Mix') &&
            d.maxInputChannels > 0
        );
        
        if (stereoMixDevice) {
            console.log(`[AudioDaemon] Found Stereo Mix: [ID ${stereoMixDevice.id}] ${stereoMixDevice.name}`);
            return stereoMixDevice;
        }
        
        // Fallback for Stereo Mix: Use the default input device (ID 0)
        // This works if the user has manually set Stereo Mix as default.
        console.log("[AudioDaemon] Stereo Mix not found by name. Falling back to default system input (ID 0).");
        return devices.find(d => d.id === 0);

    } else { // This handles 'Microphone' or any other value
        // --- CORRECTED LOGIC FOR MICROPHONE ---
        // The most reliable microphone is usually on the WASAPI host API.
        const microphoneDevice = devices.find(d =>
            d.hostAPIName === 'Windows WASAPI' &&
            d.maxInputChannels > 0 &&
            d.name.includes('Microphone')
        );

        if (microphoneDevice) {
            console.log(`[AudioDaemon] Found Microphone: [ID ${microphoneDevice.id}] ${microphoneDevice.name}`);
            return microphoneDevice;
        }
        
        // If no WASAPI mic is found, fall back to the first available input that isn't Stereo Mix
        return devices.find(d => d.maxInputChannels > 0 && !d.name.includes('Stereo Mix'));
    }
}


async function startAudio(sourceType) {
    if (ai) {
        ai.quit();
        ai = null;
    }

    const device = getAudioDevice(sourceType);
    if (!device) {
        // This error is now more meaningful.
        console.error(`[AudioDaemon] Could not find a suitable device for source: "${sourceType}".`);
        console.error(`[AudioDaemon] For 'Windows Audio', ensure 'Stereo Mix' is enabled in Sound Settings.`);
        return;
    }

    // Use the sample rate reported by the device itself for max compatibility, default to 48000
    const sampleRate = device.defaultSampleRate || 48000;
    console.log(`[AudioDaemon] Starting Stream. Device: [ID ${device.id}] ${device.name} @ ${sampleRate}Hz`);
    currentSourceType = sourceType;

    try {
        ai = new portAudio.AudioIO({
            inOptions: {
                channelCount: 2,
                sampleFormat: portAudio.SampleFormat16Bit,
                sampleRate: sampleRate,
                deviceId: device.id,
                closeOnError: false
            }
        });

        ai.on('data', buffer => {
            if (!isActive) return;

            let sum = 0;
            const len = buffer.length / 2;
            for (let i = 0; i < len; i++) {
                const int16 = buffer.readInt16LE(i * 2);
                sum += int16 * int16;
            }
            const rms = Math.sqrt(sum / len);
            let val = (rms / 32768) * currentSensitivity;
            if (val > 1.0) val = 1.0;

            if (val > currentPeak) {
                currentPeak = val;
            } else {
                currentPeak -= currentDecay;
                if (currentPeak < 0) currentPeak = 0;
            }

            if (currentPeak > 0.01) {
                sendCommand('updateState', { fx: { audioPeak: currentPeak } }).catch(() => {});

                if (silenceTimeout) clearTimeout(silenceTimeout);
                silenceTimeout = setTimeout(() => {
                    currentPeak = 0;
                    sendCommand('updateState', { fx: { audioPeak: 0 } }).catch(() => {});
                }, 2000);
            }
        });

        ai.start();
    } catch (e) {
        console.error(`[AudioDaemon] Failed to start stream for device ID ${device.id}:`, e.message);
    }
}

// Watchdog Loop
setInterval(async () => {
    const state = await getGodModeState();
    const config = state.widgets?.audioFx || {};
    const enabled = state.active && config.enabled;
    // Default to 'Windows Audio' if no source is specified.
    const targetSource = config.source || 'Windows Audio'; 

    if (config.sensitivity) {
        currentSensitivity = config.sensitivity;
    }
    if (config.decay) {
        currentDecay = config.decay;
    }

    if (enabled) {
        if (!ai || currentSourceType !== targetSource) {
            startAudio(targetSource);
        }
        isActive = true;
    } else {
        isActive = false;
        if (ai) {
            console.log('[AudioDaemon] Disabling audio stream.');
            ai.quit();
            ai = null;
            currentSourceType = null;
        }
    }
}, 2000);