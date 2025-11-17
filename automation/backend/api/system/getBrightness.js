// This handler requires the sendCommand function from our central proxy.
const { sendCommand } = require('../../frida/proxy');

module.exports = {
  method: "get",
  route: "/system/brightness",
  handler: async (req, res) => {
    try {
      // The command name 'getBrightness' must match the action filename.
      const brightness = await sendCommand("getBrightness");
      res.json({ success: true, brightness });
    } catch (err) {
      console.error(`[API /system/brightness] Error: ${err.message}`);
      res.status(500).json({ success: false, error: err.message });
    }
  }
};