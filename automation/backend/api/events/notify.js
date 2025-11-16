const knex = require("../../db/knex");
const { callWorker } = require("../helpers/workerCaller");
const { loadEffectFile } = require("../helpers/effects");

module.exports = {
  method: "post",
  route: "/notify",
  handler: async (req, res) => {
    const type = req.body?.type;
    if (!type) {
      return res.status(400).json({ error: "notification type required" });
    }
    try {
      const notification = await knex("notifications")
        .where({ notification_type: type, is_active: true })
        .first();
      if (!notification) {
        return res.status(404).json({ error: "unknown notification type" });
      }
      const payload = loadEffectFile(notification.profile_filename);
      await callWorker("SetProfileDetails", payload, 20000);
      res.json({ success: true, duration_ms: notification.duration_ms });
    } catch (err) {
      console.error("POST /notify failed", err);
      res.status(500).json({ error: "failed to execute notification" });
    }
  }
};
