const express = require('express');
const knex = require('../../db/knex');

const router = express.Router();

const parseKeys = (keysJson) => {
  if (!keysJson) return [];
  try {
    const parsed = JSON.parse(keysJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const serializeKeys = (keys) => JSON.stringify(keys || []);

router.get('/api/shortcuts', async (_req, res) => {
  try {
    const rows = await knex('shortcuts').select('*');
    const parsed = rows.map((row) => ({
      id: row.id,
      processName: row.process_name,
      isActive: row.is_active,
      keys: parseKeys(row.keys_json)
    }));
    res.json(parsed);
  } catch (error) {
    console.error('[Shortcuts] Failed to fetch shortcuts:', error);
    res.status(500).json({ error: 'Failed to fetch shortcuts' });
  }
});

router.post('/api/shortcuts', async (req, res) => {
  const { processName, keys = [], isActive = true } = req.body || {};
  if (!processName) {
    return res.status(400).json({ error: 'processName is required' });
  }
  try {
    const payload = {
      process_name: processName,
      is_active: Boolean(isActive),
      keys_json: serializeKeys(keys)
    };

    let row = await knex('shortcuts').where({ process_name: processName }).first();
    if (row) {
      await knex('shortcuts').where({ process_name: processName }).update({
        ...payload,
        updated_at: knex.fn.now()
      });
    } else {
      const [id] = await knex('shortcuts').insert(payload);
      payload.id = id;
    }
    row = await knex('shortcuts').where({ process_name: processName }).first();
    res.status(201).json({
      id: row.id,
      processName: row.process_name,
      isActive: row.is_active,
      keys: parseKeys(row.keys_json)
    });
  } catch (error) {
    console.error('[Shortcuts] Failed to create shortcut:', error);
    res.status(500).json({ error: 'Failed to create shortcut' });
  }
});

router.put('/api/shortcuts/:id', async (req, res) => {
  const { id } = req.params;
  const { processName, keys, isActive } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id is required' });

  const payload = {};
  if (processName !== undefined) payload.process_name = processName;
  if (isActive !== undefined) payload.is_active = Boolean(isActive);
  if (keys !== undefined) payload.keys_json = serializeKeys(keys);

  if (!Object.keys(payload).length) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  try {
    const updated = await knex('shortcuts').where({ id }).update({
      ...payload,
      updated_at: knex.fn.now()
    });
    if (!updated) {
      return res.status(404).json({ error: 'Shortcut not found' });
    }
    const row = await knex('shortcuts').where({ id }).first();
    res.json({
      id: row.id,
      processName: row.process_name,
      isActive: row.is_active,
      keys: parseKeys(row.keys_json)
    });
  } catch (error) {
    console.error('[Shortcuts] Failed to update shortcut:', error);
    res.status(500).json({ error: 'Failed to update shortcut' });
  }
});

router.delete('/api/shortcuts/:id', async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'id is required' });
  try {
    const deleted = await knex('shortcuts').where({ id }).del();
    if (!deleted) {
      return res.status(404).json({ error: 'Shortcut not found' });
    }
    res.status(204).end();
  } catch (error) {
    console.error('[Shortcuts] Failed to delete shortcut:', error);
    res.status(500).json({ error: 'Failed to delete shortcut' });
  }
});

module.exports = router;
