const portAudio = require('naudiodon');
const { sendCommand } = require('../frida/proxy');
const { getGodModeState } = require('../services/godmodeConfigStore');

let ai = null;
let isActive = false;
let currentSourceType = null; // Track what we are currently listening to

// Config
let currentSensitivity = 3.5;
let currentDecay = 0.15;

let currentPeak = 0;

function getAudioDevice(targetSource) {
    const devices = portAudio.getDevices();

    if (targetSource === 'Windows Audio') {
        // Try to find ANY 'Stereo Mix' that isn't WDM-KS
        const safeMix = devices.find(d =>
            d.name.includes('Stereo Mix') &&
            d.hostAPIName !== 'Windows WDM-KS'
        );
        if (safeMix) return safeMix;

        // If no safe Stereo Mix, logging for debugging
        // console.log("Stereo Mix candidates:", devices.filter(d => d.name.includes('Stereo Mix')));
    }

    // Fallback: Pick the Microphone (WASAPI)
    // This usually works reliably.
    return devices.find(d =>
        d.hostAPIName === 'Windows WASAPI' &&
        d.maxInputChannels > 0 &&
        d.name.includes('Microphone')
    );
}

async function startAudio(sourceType) {
    // Clean up old stream if switching sources
    if (ai) {
        ai.quit();
        ai = null;
    }

    const device = getAudioDevice(sourceType);
    if (!device) {
        console.error(`[AudioDaemon] No device found for source: ${sourceType}`);
        return;
    }

    console.log(`[AudioDaemon] Starting Stream. Source: ${sourceType} -> Device: ${device.name}`);
    currentSourceType = sourceType;

    try {
        ai = new portAudio.AudioIO({
            inOptions: {
                channelCount: 2,
                sampleFormat: portAudio.SampleFormat16Bit,
                sampleRate: 48000, // Safe standard
                deviceId: device.id,
                closeOnError: false
            }
        });

        ai.on('data', buffer => {
            if (!isActive) return;

            // RMS Calculation
            let sum = 0;
            const len = buffer.length / 2;
            for (let i = 0; i < len; i++) {
                const int16 = buffer.readInt16LE(i * 2);
                sum += int16 * int16;
            }
            const rms = Math.sqrt(sum / len);
            let val = (rms / 32768) * currentSensitivity;
            if (val > 1.0) val = 1.0;

            // Smoothing
            if (val > currentPeak) {
                currentPeak = val;
            } else {
                currentPeak -= currentDecay;
                if (currentPeak < 0) currentPeak = 0;
            }

            // Send to Frida
            if (currentPeak > 0.01) {
                sendCommand('updateState', { fx: { audioPeak: currentPeak } }).catch(() => { });
            }
        });

        ai.start();
    } catch (e) {
        console.error('[AudioDaemon] Failed to start stream:', e.message);
    }
}

// Watchdog Loop
setInterval(async () => {
    const state = await getGodModeState();
    const config = state.widgets?.audioFx || {};
    const enabled = state.active && config.enabled;
    const targetSource = config.source || 'Windows Audio';

    if (config.sensitivity) {
        currentSensitivity = config.sensitivity;
    }
    if (config.decay) {
        currentDecay = config.decay;
    }

    if (enabled) {
        if (!ai || currentSourceType !== targetSource) {
            // Start or Restart if source changed
            startAudio(targetSource);
            isActive = true;
        } else {
            isActive = true;
        }
    } else {
        isActive = false;
        if (ai) {
            ai.quit();
            ai = null;
            currentSourceType = null;
        }
    }
}, 2000);