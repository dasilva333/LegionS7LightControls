const express = require('express');
const { getWidgetConfig, upsertWidgetConfig } = require('../../services/widgetConfigStore');
const { getGodModeState } = require('../../services/godmodeConfigStore');
const { sendCommand } = require('../../frida/proxy');

const router = express.Router();

router.get('/api/widgets/:id', async (req, res) => {
  try {
    const config = await getWidgetConfig(req.params.id);
    res.json({ widgetId: req.params.id, config });
  } catch (error) {
    console.error('[Widgets] Failed to load config:', error);
    res.status(500).json({ error: 'Failed to load widget config' });
  }
});

router.post('/api/widgets/:id', async (req, res) => {
  try {
    const nextConfig = req.body?.config ?? {};
    const saved = await upsertWidgetConfig(req.params.id, nextConfig);

    // Sync with Frida immediately
    const hydratedState = await getGodModeState();
    await sendCommand('updateState', hydratedState);

    res.json({ widgetId: req.params.id, config: saved });
  } catch (error) {
    console.error('[Widgets] Failed to save config:', error);
    res.status(500).json({ error: 'Failed to save widget config' });
  }
});

module.exports = router;
