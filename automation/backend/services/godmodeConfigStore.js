const knex = require('../db/knex');

const TABLE = 'godmode_config';
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
  }
};

async function readRow() {
  return knex(TABLE).where({ key: STATE_KEY }).first();
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
  const existing = await readRow();
  if (!existing) {
    return persistState(DEFAULT_GODMODE_STATE);
  }

  try {
    const parsed = JSON.parse(existing.value);
    return { ...DEFAULT_GODMODE_STATE, ...parsed };
  } catch {
    return persistState(DEFAULT_GODMODE_STATE);
  }
}

async function setGodModeState(state) {
  return persistState({ ...DEFAULT_GODMODE_STATE, ...state });
}

async function mergeGodModeState(partialState = {}) {
  const current = await getGodModeState();
  const next = { ...current, ...partialState };
  await persistState(next);
  return next;
}

module.exports = {
  DEFAULT_GODMODE_STATE,
  getGodModeState,
  setGodModeState,
  mergeGodModeState
};
