const { spawnWorker } = require("../../supervisor");

async function callWorker(method, payload, timeoutMs = 15000) {
  const action = { method };
  if (payload !== undefined) {
    action.payload = payload;
  }
  const { code, payload: result } = await spawnWorker(action, timeoutMs);
  if (code !== 0) {
    throw new Error(`Worker exited with code ${code}`);
  }
  return result;
}

module.exports = { callWorker };
