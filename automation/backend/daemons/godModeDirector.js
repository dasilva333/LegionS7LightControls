const { sendCommand } = require('../frida/proxy');
const { getGodModeState } = require('../services/godmodeConfigStore');

const BOOT_DELAY_MS = 5000;

async function restoreGodModeState() {
  try {
    const state = await getGodModeState();
    await sendCommand('enable');
    await sendCommand('updateState', state);
    console.log('[GodModeDirector] Restored state from database.');
  } catch (error) {
    console.error('[GodModeDirector] Failed to sync state:', error.message);
  }
}

setTimeout(() => {
  restoreGodModeState();
}, BOOT_DELAY_MS);
