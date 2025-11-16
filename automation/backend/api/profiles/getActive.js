const { callWorker } = require("../helpers/workerCaller");

module.exports = {
  method: "get",
  route: "/active-profile",
  handler: async (_req, res) => {
    try {
      const result = await callWorker("GetProfileJson", undefined, 20000);
      const data = typeof result === "string" ? JSON.parse(result) : result || {};
      res.json(data);
    } catch (err) {
      console.error("GET /active-profile failed", err);
      res.status(500).json({ error: "failed to read active profile" });
    }
  }
};
