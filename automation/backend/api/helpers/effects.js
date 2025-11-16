const fs = require("fs");
const path = require("path");

const effectsDir = path.join(__dirname, "..", "..", "json_effects");

function loadEffectFile(name) {
  const filename = name.endsWith(".json") ? name : `${name}.json`;
  const filePath = path.join(effectsDir, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Effect file missing: ${filename}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

module.exports = { loadEffectFile };
