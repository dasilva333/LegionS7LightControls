const fs = require('fs');
const path = require('path');
const tinygradient = require('tinygradient');

// --- Database Setup ---
// Assumes knexfile.js is in the backend root
const knex = require('knex')(require('../knexfile').development);

// --- File Path Configuration ---
const effectsDir = path.resolve(__dirname, '..', '..', '..', 'json_effects');
const outputFilePath = path.join(effectsDir, 'active.json');
const { profileExecutor } = require('../api/helpers/profileExecutor');

/**
 * Converts "HH:MM" time string to total minutes from midnight.
 * e.g., "07:30" -> 450
 */
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

async function runTimeOfDayTest() {
    console.log('--- Time-of-Day Daemon Test ---');

    try {
        // --- Step 1: Query the database for the current gradient ---
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        console.log(`[1/4] Current system time: ${currentTime}`);

        const activeGradient = await knex('time_gradients')
            .where('start_time', '<=', currentTime)
            .andWhere('end_time', '>=', currentTime)
            .andWhere('is_active', true)
            .first();

        if (!activeGradient) {
            console.error('No active time gradient found for the current time. Exiting.');
            return;
        }

        // --- Step 2: Log the queried gradient details ---
        console.log('[2/4] Found active gradient period:');
        console.log(`  -> Start: ${activeGradient.start_time} (${activeGradient.start_rgb})`);
        console.log(`  -> End:   ${activeGradient.end_time} (${activeGradient.end_rgb})`);

        // --- Step 3: Calculate the interpolated color ---
        const startTimeMins = timeToMinutes(activeGradient.start_time);
        const endTimeMins = timeToMinutes(activeGradient.end_time);
        const currentTimeMins = timeToMinutes(currentTime);

        const totalDuration = endTimeMins - startTimeMins;
        const currentProgress = currentTimeMins - startTimeMins;
        
        // Handle division by zero for instant gradients
        const progressPercentage = (totalDuration > 0) ? (currentProgress / totalDuration) : 1;

        console.log(`[3/4] Calculating color at ${Math.round(progressPercentage * 100)}% progress...`);

        const gradient = tinygradient(activeGradient.start_rgb, activeGradient.end_rgb);
        const interpolatedColor = gradient.rgbAt(progressPercentage);
        
        console.log('interpolatedColor:', interpolatedColor);
        // The library returns an object with r, g, b values from 0-255
 const finalColor = {
            r: Math.round(interpolatedColor._r),
            g: Math.round(interpolatedColor._g),
            b: Math.round(interpolatedColor._b)
        };
        console.log(`  -> Interpolated Color: rgb(${finalColor.r}, ${finalColor.g}, ${finalColor.b})`);

        // --- Step 4: Write the new effect file ---
        // Construct the JSON payload for a simple static color effect
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
            profileId: 1
        };

        fs.writeFileSync(outputFilePath, JSON.stringify(effectPayload, null, 4));
        console.log(`[4/4] Successfully wrote new effect to: ${outputFilePath}`);
        console.log('--- Test Complete ---');

         // --- START: New block to add ---
        console.log('[5/5] Dispatching the new profile to the hardware...');
        await profileExecutor('active');
        console.log('  -> Hardware update command sent successfully.');
        // --- END: New block to add ---

    } catch (error) {
        console.error('An error occurred during the test:', error);
    } finally {
        // Important: Close the database connection
        await knex.destroy();
    }
}

// Run the test
runTimeOfDayTest();