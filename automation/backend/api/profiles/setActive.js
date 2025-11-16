const { callWorker } = require("../helpers/workerCaller");

module.exports = {
  method: "post",
  route: "/set-active-profile/:id",
  handler: async (req, res) => {
    const param = req.params.id;
    const id = parseInt(param, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "invalid profile id" });
    }
    try {
      await callWorker("SetProfileIndex", id, 10000);
      res.json({ success: true, profileId: id });
    } catch (err) {
      console.error("POST /set-active-profile failed", err);
      res.status(500).json({ error: "failed to set active profile" });
    }
  }
};
