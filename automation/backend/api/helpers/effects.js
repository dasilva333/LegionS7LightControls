const fs = require("fs");
const path = require("path");

// Assume the json_effects directory is at the project root.
const effectsDir = path.resolve(__dirname, '..', '..', '..', '..', 'json_effects');

/**
 * Loads a JSON effect file from the json_effects directory.
 * @param {string} name - The name of the file, with or without the .json extension.
 * @returns {object} The parsed JavaScript object from the file.
 * @throws {Error} If the file is not found.
 */
function loadEffectFile(name) {
  // Ensure the filename is clean and has the .json extension
  const filename = name.endsWith(".json") ? path.basename(name) : `${path.basename(name)}.json`;
  const filePath = path.join(effectsDir, filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Effect file not found at: ${filePath}`);
  }

  try {
    const fileContent = fs.readFileSync(filePath, "utf8");
    return JSON.parse(fileContent);
  } catch (err) {
    throw new Error(`Failed to read or parse effect file '${filename}': ${err.message}`);
  }
}

module.exports = { loadEffectFile };