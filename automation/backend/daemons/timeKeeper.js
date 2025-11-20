const { mergeGodModeState } = require('../services/godmodeConfigStore');
const { sendCommand } = require('../frida/proxy');
const knex = require('../db/knex'); // Need knex

const UPDATE_INTERVAL = 60 * 1000; // 1 Minute

async function updateTime() {
    // 1. Calculate time
    const now = new Date();
    const totalMinutes = (now.getHours() * 60) + now.getMinutes();
    const totalDayMinutes = 24 * 60;
    const timeOfDay = totalMinutes / totalDayMinutes;

    // 2. Fetch Gradient Schedule from DB
    const gradients = await knex('time_gradients').where('is_active', true).orderBy('start_time');
    
    // 3. Persist and Sync
    await mergeGodModeState({ timeOfDay });
    
    // Also send gradients to Frida for live interpolation
    await sendCommand('updateState', { 
        timeOfDay,
        timeGradients: gradients 
    });

    if (now.getMinutes() === 0) {
        console.log(`[TimeKeeper] Sync: ${now.getHours()}:00`);
    }
}

function start() {
    console.log('[TimeKeeper] Started.');
    // Delay initial sync to let Director finish
    setTimeout(updateTime, 10000); 
    setInterval(updateTime, UPDATE_INTERVAL);
}

start();