const { getGodModeState } = require('../../services/godmodeConfigStore');

module.exports = {
  method: 'get',
  route: '/api/godmode/state',
  handler: async (_req, res) => {
    try {
      const state = await getGodModeState();
      return res.json(state);
    } catch (error) {
      console.error('[GodModeState] Failed to fetch state:', error);
      return res.status(500).json({ error: error.message });
    }
  }
};
