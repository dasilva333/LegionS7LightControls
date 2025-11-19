const { sendCommand } = require('../../frida/proxy');

module.exports = {
    method: 'POST',
    route: '/api/godmode',
    handler: async (req, res) => {
        // Body: { command: 'enable' } or { command: 'state', payload: { ... } }
        const { command, payload } = req.body; 
        
        try {
            if (command === 'enable') {
                // Calls the 'enable' function exported by godMode.js
                await sendCommand('enable'); 
                res.json({ status: 'God Mode Enabled' });
            } 
            else if (command === 'disable') {
                await sendCommand('disable');
                res.json({ status: 'God Mode Disabled' });
            } 
            else if (command === 'state') {
                // Calls 'updateState' with your JSON payload (weather, time, etc)
                await sendCommand('updateState', payload);
                res.json({ status: 'State Updated' });
            } 
            else {
                res.status(400).json({ error: 'Unknown command' });
            }
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: e.message });
        }
    }
};