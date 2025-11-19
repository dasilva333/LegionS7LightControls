const { sendCommand } = require('../../frida/proxy');
const { mergeGodModeState } = require('../../services/godmodeConfigStore');

module.exports = {
  method: 'post',
  route: '/api/godmode/state',
  handler: async (req, res) => {
    try {
      const payload = req.body || {};
      const updatedState = await mergeGodModeState(payload);
      await sendCommand('updateState', updatedState);
      return res.json({ status: 'updated', state: updatedState });
    } catch (error) {
      console.error('[GodModeState] Failed to update state:', error);
      return res.status(500).json({ error: error.message });
    }
  }
};
