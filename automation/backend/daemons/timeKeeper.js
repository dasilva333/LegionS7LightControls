const { mergeGodModeState } = require('../services/godmodeConfigStore');
const { sendCommand } = require('../frida/proxy');

const UPDATE_INTERVAL = 60 * 1000; // 1 Minute

async function updateTime() {
    const now = new Date();
    const totalMinutes = (now.getHours() * 60) + now.getMinutes();
    const totalDayMinutes = 24 * 60;
    const timeOfDay = totalMinutes / totalDayMinutes;

    // 1. Update DB (So Director loads correct time on restart)
    // We don't need to await this if we don't want to block
    mergeGodModeState({ timeOfDay }).catch(console.error);

    // 2. Update Frida
    sendCommand('updateState', { timeOfDay }).catch(() => {});

    if (now.getMinutes() === 0) {
        console.log(`[TimeKeeper] Sync: ${now.getHours()}:00 (${timeOfDay.toFixed(2)})`);
    }
}

function start() {
    console.log('[TimeKeeper] Started.');
    // Delay initial sync to let Director finish
    setTimeout(updateTime, 10000); 
    setInterval(updateTime, UPDATE_INTERVAL);
}

start();