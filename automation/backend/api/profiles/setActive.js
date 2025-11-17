const { sendCommand } = require('../../frida/proxy');

module.exports = {
  method: "post",
  route: "/profiles/active/:id",
  handler: async (req, res) => {
    try {
      const profileId = parseInt(req.params.id, 10);
      if (isNaN(profileId)) {
        return res.status(400).json({ success: false, error: "Profile ID must be an integer." });
      }

      // The command 'setProfileIndex' matches the name in the new action file.
      // The payload is an object, as expected by the action.
      const result = await sendCommand("setProfileIndex", { profileId: profileId });
      
      res.json({ success: true, ...result });
    } catch (err) {
      console.error(`[API /profiles/active/:id] Error: ${err.message}`);
      res.status(500).json({ success: false, error: err.message });
    }
  }
};