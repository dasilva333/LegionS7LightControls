const path = require("path");
const fs = require("fs");
const { spawnWorker } = require("../supervisor");

const logDir = path.join(process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || ".", "AppData", "Local"), "ProfileBridge");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
const logPath = path.join(logDir, "test.log");

function log(message) {
  const line = `${new Date().toISOString()} ${message}\n`;
  fs.appendFileSync(logPath, line);
  console.log(line.trim());
}

function loadPayloadFixture() {
  const fixturePath = path.join(__dirname, "..", "edge_bridge", "test_files", "set_profile_details", "inbound_payload_1763172178585.json");
  if (!fs.existsSync(fixturePath)) return "";
  const envelope = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  return envelope.string_content || "";
}

function loadCommandFixture() {
  const fixturePath = path.join(__dirname, "..", "edge_bridge", "test_files", "set_profile_details", "inbound_command_1763172178585.json");
  if (!fs.existsSync(fixturePath)) return "";
  const envelope = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  return envelope.string_content || "";
}

function effectFiles() {
  const dir = path.join(__dirname, "..", "json_effects");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => path.join(dir, name));
}

function validateEffects() {
  const files = effectFiles();
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      const ok = Array.isArray(data.layers) && typeof data.profileId === "number";
      log(`Effect ${path.basename(file)} validation: ${ok ? "OK" : "missing layers/profileId"}`);
    } catch (err) {
      log(`Effect ${path.basename(file)} parse failed: ${err.message}`);
    }
  }
}

const actions = [
  { method: "GetActiveProfileId" },
  { method: "GetBrightness" },
  { method: "GetProfileJson" },
  { method: "SetProfileIndex", profileId: 1 },
  { method: "SetProfileDetails", payload: loadPayloadFixture() },
  (() => {
    const command = loadCommandFixture();
    const payload = loadPayloadFixture();
    if (!command || !payload) {
      return null;
    }
    return { method: "SendRawTraffic", payload: { command, payload } };
  })()
].filter(Boolean);

async function run() {
  log("Starting backend native helper tests");
  validateEffects();
  for (const action of actions) {
    const label = action.method;
    log(`Invoking ${label}`);
    try {
      const result = await spawnWorker(action);
      if (result && result.code === 0) {
        log(`${label} succeeded (code=${result.code})`);
        if (typeof result.payload === "string") {
          log(`${label} payload: ${result.payload}`);
        }
      } else {
        log(`${label} returned non-zero code ${result.code}`);
      }
    } catch (err) {
      log(`${label} failed: ${err.message}`);
    }
  }
  log("Native helper tests completed");
}

run().catch((err) => {
  log(`Test runner fatal error: ${err.message}`);
  process.exit(1);
});
