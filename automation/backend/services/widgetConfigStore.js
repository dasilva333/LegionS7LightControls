const knex = require('../db/knex');

const TABLE = 'widget_configs';

async function getWidgetConfig(widgetId) {
  const row = await knex(TABLE).where({ widget_id: widgetId }).first();
  if (!row) {
    await knex(TABLE).insert({
      widget_id: widgetId,
      config: '{}',
      updated_at: knex.fn.now()
    });
    return {};
  }
  try {
    return JSON.parse(row.config);
  } catch (error) {
    console.error(`[WidgetConfigStore] Failed to parse config for ${widgetId}:`, error.message);
    return {};
  }
}

async function upsertWidgetConfig(widgetId, config) {
  const payload = {
    widget_id: widgetId,
    config: JSON.stringify(config),
    updated_at: knex.fn.now()
  };
  await knex(TABLE)
    .insert(payload)
    .onConflict('widget_id')
    .merge(payload);
  return config;
}

module.exports = {
  getWidgetConfig,
  upsertWidgetConfig
};
