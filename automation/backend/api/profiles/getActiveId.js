// This handler requires the sendCommand function from our central proxy.
const { sendCommand } = require('../../frida/proxy');

module.exports = {
  method: "get",
  route: "/profiles/active-id",
  handler: async (req, res) => {
    try {
      // The command name 'getActiveProfileId' must match the 'name' property
      // in the corresponding action file.
      const profileId = await sendCommand("getActiveProfileId");
      res.json({ success: true, profileId });
    } catch (err) {
      console.error(`[API /profiles/active-id] Error: ${err.message}`);
      res.status(500).json({ success: false, error: err.message });
    }
  }
};