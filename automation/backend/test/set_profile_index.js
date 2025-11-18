const { sendCommand } = require('../frida/proxy');

(async () => {
    const profileId = Number(process.argv[2]);
    console.log(`[TEST] Attempting to set Active Profile to: ${profileId}`);
    const result = await sendCommand("setProfileIndex", { profileId: profileId });
})();