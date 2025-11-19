const { sendCommand } = require('../../frida/proxy');
const { mergeGodModeState } = require('../../services/godmodeConfigStore');

module.exports = {
    method: 'POST',
    route: '/api/godmode',
    handler: async (req, res) => {
        // Body: { command: 'enable' | 'disable' | 'state', payload?: { ... } }
        const { command, payload } = req.body; 
        
        try {
            if (command === 'enable') {
                // 1. Persist active state
                await mergeGodModeState({ active: true });
                // 2. Tell Frida
                await sendCommand('enable'); 
                res.json({ status: 'God Mode Enabled' });
            } 
            else if (command === 'disable') {
                // 1. Persist inactive state
                await mergeGodModeState({ active: false });
                // 2. Tell Frida
                await sendCommand('disable');
                res.json({ status: 'God Mode Disabled' });
            } 
            else if (command === 'state') {
                if (!payload || typeof payload !== 'object') {
                    return res.status(400).json({ error: 'Payload required for state update' });
                }
                
                // 1. Persist the new partial state to SQLite
                // This returns the FULL merged state object
                const newState = await mergeGodModeState(payload);
                
                // 2. Send the UPDATE to Frida so it reflects immediately
                await sendCommand('updateState', payload);
                
                res.json({ status: 'State Updated', state: newState });
            } 
            else {
                res.status(400).json({ error: 'Unknown command' });
            }
        } catch (e) {
            console.error('[API Error] /api/godmode:', e);
            res.status(500).json({ error: e.message });
        }
    }
};