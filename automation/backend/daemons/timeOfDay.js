const fs = require('fs');
const path = require('path');
const tinygradient = require('tinygradient');
const { profileExecutor } = require('../api/helpers/profileExecutor');
const stateManager = require('../services/stateManager');

// --- Configuration ---
const TICK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const AMBIENT_PROFILE_FILENAME = 'ambient_tod'; // Use a dedicated filename
const AMBIENT_PROFILE_ID = 1; // Use a dedicated hardware profile slot

// --- Database Connection ---
const knex = require('knex')(require('../knexfile').development);

// --- Helper Functions (copied from our test script) ---
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

/**
 * The core logic for a single tick of the scheduler.
 */
async function tick() {
       // 1. ASK PERMISSION FIRST
    if (!stateManager.canAmbientUpdate()) {
        console.log('[ToD] Blocked by higher priority override. Skipping.');
        return;
    }
    console.log('[TimeOfDayDaemon] Tick...');

    try {
        // In a real implementation, you would add a check here for global overrides
        // (e.g., from the process monitor) before proceeding.

        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        const activeGradient = await knex('time_gradients')
            .where('start_time', '<=', currentTime)
            .andWhere('end_time', '>=', currentTime)
            .andWhere('is_active', true)
            .first();

        if (!activeGradient) {
            console.log('[TimeOfDayDaemon] No active gradient period found for the current time.');
            return;
        }

        const startTimeMins = timeToMinutes(activeGradient.start_time);
        const endTimeMins = timeToMinutes(activeGradient.end_time);
        const currentTimeMins = timeToMinutes(currentTime);

        const totalDuration = endTimeMins - startTimeMins;
        const currentProgress = currentTimeMins - startTimeMins;
        const progressPercentage = (totalDuration > 0) ? (currentProgress / totalDuration) : 1;

        const gradient = tinygradient(activeGradient.start_rgb, activeGradient.end_rgb);
        const interpolatedColor = gradient.rgbAt(progressPercentage);

        const finalColor = {
            r: Math.round(interpolatedColor._r),
            g: Math.round(interpolatedColor._g),
            b: Math.round(interpolatedColor._b)
        };
        console.log(`[TimeOfDayDaemon] Calculated ambient color: rgb(${finalColor.r}, ${finalColor.g}, ${finalColor.b})`);

        // Construct the payload and write to a dedicated file
        const effectPayload = {
            layers: [{
                animationConfig: {
                    animationId: 11, // Static color
                    clockwise: 0,
                    colorList: [finalColor],
                    colorSize: 1,
                    colorType: 2,
                    direction: 0,
                    speed: 0,
                    transition: 0
                },
                "keys": [
                    1,
                    2,
                    3,
                    4,
                    5,
                    6,
                    7,
                    8,
                    9,
                    10,
                    11,
                    12,
                    13,
                    14,
                    15,
                    16,
                    17,
                    18,
                    19,
                    20,
                    22,
                    23,
                    24,
                    25,
                    26,
                    27,
                    28,
                    29,
                    30,
                    31,
                    32,
                    33,
                    34,
                    38,
                    39,
                    40,
                    41,
                    56,
                    64,
                    66,
                    67,
                    68,
                    69,
                    70,
                    71,
                    72,
                    73,
                    74,
                    75,
                    76,
                    77,
                    78,
                    79,
                    80,
                    81,
                    85,
                    88,
                    89,
                    90,
                    91,
                    92,
                    93,
                    95,
                    104,
                    106,
                    109,
                    110,
                    111,
                    112,
                    113,
                    114,
                    115,
                    116,
                    117,
                    118,
                    119,
                    121,
                    123,
                    124,
                    127,
                    128,
                    130,
                    131,
                    135,
                    136,
                    141,
                    142,
                    144,
                    146,
                    150,
                    151,
                    152,
                    154,
                    155,
                    156,
                    157,
                    159,
                    161,
                    163,
                    165,
                    167
                ],
                layerId: 1
            }],
            profileId: AMBIENT_PROFILE_ID
        };

        const effectsDir = path.resolve(__dirname, '..', '..', '..', 'json_effects');
        const outputFilePath = path.join(effectsDir, `${AMBIENT_PROFILE_FILENAME}.json`);
        fs.writeFileSync(outputFilePath, JSON.stringify(effectPayload, null, 4));

        // Dispatch the command to the hardware
        console.log(`[TimeOfDayDaemon] Applying '${AMBIENT_PROFILE_FILENAME}' profile to hardware...`);
        await profileExecutor(AMBIENT_PROFILE_FILENAME);
        console.log('[TimeOfDayDaemon] Ambient profile updated successfully.');

    } catch (error) {
        console.error('[TimeOfDayDaemon] An error occurred during tick:', error);
    }
}

/**
 * Starts the time-of-day scheduler daemon.
 */
function start() {
    console.log(`[TimeOfDayDaemon] Starting daemon. Tick interval: ${TICK_INTERVAL_MS / 1000} seconds.`);
    // Run the first tick immediately on startup, then start the interval.
    tick();
    setInterval(tick, TICK_INTERVAL_MS);
    // 2. LISTEN FOR RESTORE EVENTS
    // When a game closes, run immediately. Don't wait 5 minutes.
    stateManager.events.on('state-restored', () => {
        console.log('[ToD] State restored. Forcing update.');
        tick();
    });
}

// --- Start the daemon ---
start();