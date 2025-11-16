const { callWorker } = require("../helpers/workerCaller");

module.exports = {
  method: "get",
  route: "/active-profile/id",
  handler: async (_req, res) => {
    try {
      const profileId = await callWorker("GetActiveProfileId");
      res.json({ profileId });
    } catch (err) {
      console.error("GET /active-profile/id failed", err);
      res.status(500).json({ error: "failed to read active profile id" });
    }
  }
};
