const { sendCommand } = require('../../frida/proxy');

module.exports = {
  method: "get",
  route: "/profiles/active",
  handler: async (req, res) => {
    try {
      // The command 'getProfileJson' matches the name in the new action file.
      const profileObject = await sendCommand("getProfileJson");
      
      // The agent already parsed the JSON, so we can send it directly.
      res.json({ success: true, profile: profileObject });
    } catch (err) {
      console.error(`[API /profiles/active] Error: ${err.message}`);
      res.status(500).json({ success: false, error: err.message });
    }
  }
};