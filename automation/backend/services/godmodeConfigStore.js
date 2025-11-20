const knex = require('../db/knex');

const TABLE = 'godmode_config';
const WIDGETS_TABLE = 'widget_configs'; // New table reference
const STATE_KEY = 'state';

const DEFAULT_GODMODE_STATE = {
  active: false,
  mode: 'DEFAULT',
  weather: 'CLEAR',
  timeOfDay: 0.5,
  cpuTemp: 0,
  downloadProgress: -1,
  backgroundMode: 'none',
  timeUpdateRate: 1,
  effectSettings: {
    effectType: 'Ripple',
    baseColor: '#0070FF',
    speed: 3
  },
  stormOverride: false,
  weatherEnabled: true,
  weatherKeys: [],
  weatherSettings: {
    zipCode: ''
  },
  // Ensure basic structure exists to prevent access errors
  widgets: {
    dayBar: {},
    temperature: { value: 0 }
  },
  interrupts: {
    progress: {}
  }
};

async function readRow() {
  return knex(TABLE).where({ key: STATE_KEY }).first();
}

// Helper to read specific widget configs from their table
async function getWidgetConfigs() {
  try {
    const rows = await knex(WIDGETS_TABLE).select('*');
    const widgets = {};
    rows.forEach(row => {
      try {
        widgets[row.widget_id] = JSON.parse(row.config);
      } catch (e) {
        console.error(`[ConfigStore] Failed to parse widget ${row.widget_id}`);
      }
    });
    return widgets;
  } catch (e) {
    // Table might not exist yet if migration hasn't run
    console.warn("[ConfigStore] Could not read widget_configs table.");
    return {};
  }
}

async function persistState(state) {
  const payload = {
    key: STATE_KEY,
    value: JSON.stringify(state),
    updated_at: knex.fn.now()
  };

  await knex(TABLE)
    .insert(payload)
    .onConflict('key')
    .merge(payload);

  return state;
}

async function getGodModeState() {
  // 1. Load Base State from godmode_config
  let baseState = { ...DEFAULT_GODMODE_STATE };
  const existing = await readRow();

  if (existing) {
    try {
      const parsed = JSON.parse(existing.value);
      baseState = { ...baseState, ...parsed };
    } catch (e) {
      console.error("[ConfigStore] Error parsing base state", e);
    }
  }

  // 2. Hydrate/Merge Widgets from widget_configs table
  // This ensures frontend settings (keys, colors) override defaults
  const widgetConfigs = await getWidgetConfigs();

  // Merge Day Bar
  if (widgetConfigs.day_bar) {
    baseState.widgets.dayBar = {
      ...baseState.widgets.dayBar,
      ...widgetConfigs.day_bar
    };
  }

  // Merge Temperature
  if (widgetConfigs.temperature) {
    baseState.widgets.temperature = {
      ...baseState.widgets.temperature,
      ...widgetConfigs.temperature,
      // MAP FRONTEND KEYS TO BACKEND KEYS
      keys: widgetConfigs.temperature.targetKeys || widgetConfigs.temperature.keys || []
    };
  }

  // Merge Progress Bar (Interrupts)
  if (widgetConfigs.progress_bar) {
    baseState.interrupts = baseState.interrupts || {};
    baseState.interrupts.progress = {
      ...baseState.interrupts.progress,
      ...widgetConfigs.progress_bar
    };
  }

  // Merge Typing FX
  if (widgetConfigs.fx_typing) {
    baseState.widgets.typingFx = {
      ...baseState.widgets.typingFx,
      ...widgetConfigs.fx_typing
    };
  }

  if (widgetConfigs.fxAudio) { // Matches frontend ID
    baseState.widgets.audioFx = { // Standardize state key to 'audioFx'
      ...baseState.widgets.audioFx,
      ...widgetConfigs.fxAudio
    };
  }

  return baseState;
}

async function setGodModeState(state) {
  return persistState({ ...DEFAULT_GODMODE_STATE, ...state });
}

async function mergeGodModeState(partialState = {}) {
  // We get the FULL hydrated state first
  const current = await getGodModeState();

  // Merge the new partial state on top
  // Note: This logic is simple. Deep merging might be safer for nested objects,
  // but since we usually update specific keys, spreading works for top-level.
  // For nested updates (e.g. widgets.temperature.value), the caller usually sends the whole object.

  const next = { ...current, ...partialState };

  // We persist the result to godmode_config. 
  // Note: We are effectively snapshotting the widget_config data into godmode_config here too.
  // This is fine for redundancy and ensures Frida gets the full picture.
  await persistState(next);

  return next;
}

module.exports = {
  DEFAULT_GODMODE_STATE,
  getGodModeState,
  setGodModeState,
  mergeGodModeState
};