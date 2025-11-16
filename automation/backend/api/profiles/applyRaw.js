const { callWorker } = require("../helpers/workerCaller");

module.exports = {
  method: "post",
  route: "/apply-profile/raw",
  handler: async (req, res) => {
    const payload = req.body;
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ error: "payload required" });
    }
    try {
      await callWorker("SetProfileDetails", JSON.stringify(payload), 20000);
      res.json({ success: true });
    } catch (err) {
      console.error("POST /apply-profile/raw failed", err);
      res.status(500).json({ error: "failed to apply raw profile" });
    }
  }
};
