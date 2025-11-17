/**
 * Express route handler for applying a lighting profile from a saved JSON file.
 */

// We imagine a helper that knows how to read our effect files.
const { loadEffectFile } = require('../helpers/effects');

// We imagine a central builder that takes a FINALIZED payload object.
const { buildSetProfileDetailsCommand } = require('../../frida/payloadBuilder');

// We imagine our Frida proxy that can send any command.
const { sendCommand } = require('../../frida/proxy');

module.exports = {
  method: "post",
  route: "/profiles/apply-by-file",
  
  handler: async (req, res) => {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ success: false, error: "Request body must include a 'filename'." });
    }

    try {
      console.log(`\n--- [API /apply-by-file] Processing '${filename}' ---`);

      const layersObject = loadEffectFile(filename);
      const activeProfileId = await sendCommand('getActiveProfileId');
      console.log(`[API] Fetched active profile ID: ${activeProfileId}`);
      
      layersObject.profileId = activeProfileId;

      const { commandString, payloadString } = buildSetProfileDetailsCommand(layersObject);

      // THE FIX: Add detailed logging, as you requested.
      console.log(`[API] Built Native Command Envelope:`);
      try {
        // Pretty-print the JSON for readability
        console.log(JSON.stringify(JSON.parse(commandString), null, 2));
      } catch {
        console.log(commandString); // Fallback for non-JSON
      }
      console.log(`[API] Built Native Payload Tag: "${payloadString}"`);
      
      console.log(`[API] Dispatching to Frida worker...`);
      const result = await sendCommand('executeDispatcher', { commandString, payloadString });

      res.json({ success: true, filename, profileId: activeProfileId, result });

    } catch (err) {
      console.error(`[API /profiles/apply-by-file] FATAL ERROR: ${err.message}`);
      res.status(500).json({ success: false, error: err.message });
    }
  }
};