const fs = require('fs');
const path = require('path');
const { sendCommand } = require('../../frida/proxy');
const { getGodModeState, mergeGodModeState } = require('../../services/godmodeConfigStore');

const SNAPSHOT_DIR = path.join(__dirname, '../../snapshots');

if (!fs.existsSync(SNAPSHOT_DIR)) {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
}

module.exports = {
    method: 'POST',
    route: '/api/godmode/snapshot',
    handler: async (req, res) => {
        try {
            console.log('[API] Snapshot request received.');

            // 1. Performance: Enable Capture Mode
            await sendCommand('setCaptureMode', true);

            // 2. Pass-through: Disable God Mode to let native colors show
            await sendCommand('disable');
            // Note: We don't need to save active:false to DB here, just temp disable in Frida
            console.log('[API] God Mode disabled. Waiting for native frame...');

            // 3. Wait for Native App frame (300ms)
            await new Promise(resolve => setTimeout(resolve, 300));

            // 4. Capture
            const snapshot = await sendCommand('getSnapshot');

            // 5. Stop Capture (Save CPU)
            await sendCommand('setCaptureMode', false);

            if (!snapshot || snapshot.length === 0) {
                console.warn('[API] No frame data captured.');
                await sendCommand('enable'); // Restore
                return res.status(500).json({ error: 'No frame data captured' });
            }

            console.log(`[API] Captured ${snapshot.length} keys.`);

            // 6. Backup to Disk
            const filename = `snapshot_${Date.now()}.json`;
            fs.writeFileSync(path.join(SNAPSHOT_DIR, filename), JSON.stringify(snapshot, null, 2));

            // 7. TRANSFORMATION: Array -> Object Map
            const optimizedMap = {};
            snapshot.forEach(k => {
                optimizedMap[k.keyId] = { r: k.r, g: k.g, b: k.b };
            });

            // 8. PREPARE STATE UPDATE (Deep Merge Fix)
            // Fetch current state to preserve existing speed/effectType
            const currentState = await getGodModeState();
            const currentEffects = currentState.effectSettings || {};

            const newState = {
                active: true, // Ensure we re-enable
                effectSettings: {
                    ...currentEffects, // <--- CRITICAL: Keep existing speed/type
                    colorSource: 'Custom',
                    customMap: optimizedMap
                }
            };

            // 9. Apply Update
            // Save to DB
            await mergeGodModeState(newState);
            
            // Sync Frida
            await sendCommand('updateState', newState);
            await sendCommand('enable');

            console.log('[API] Snapshot applied and God Mode re-enabled.');

            res.json({
                success: true,
                filename,
                keyCount: snapshot.length
            });

        } catch (error) {
            console.error('[API] Snapshot failed:', error);
            // Recovery attempt
            try {
                await sendCommand('setCaptureMode', false);
                await sendCommand('enable');
            } catch (e) { }

            res.status(500).json({ error: error.message });
        }
    }
};