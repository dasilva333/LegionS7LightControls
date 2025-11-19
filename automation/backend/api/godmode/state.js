const { sendCommand } = require('../../frida/proxy');

module.exports = {
    method: 'POST',
    route: '/api/godmode/state',
    handler: async (req, res) => {
        // Body example: { weather: 'RAIN', cpuTemp: 75 }
        const newState = req.body; 
        try {
            // We map this to the 'updateState' RPC function exposed in godMode.js
            // Note: You might need to tweak proxy/loader to handle method calling on the action object
            // Or just expose 'updateGodModeState' as a unique RPC export name.
            await sendCommand('godMode', 'updateState', newState);
            res.json({ status: 'updated', state: newState });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }
};