const { callWorker } = require("../helpers/workerCaller");
const { loadEffectFile } = require("../helpers/effects");

module.exports = {
  method: "post",
  route: "/apply-profile/file/:filename",
  handler: async (req, res) => {
    try {
      const payload = loadEffectFile(req.params.filename);
      await callWorker("SetProfileDetails", payload, 20000);
      res.json({ success: true, filename: req.params.filename });
    } catch (err) {
      console.error("POST /apply-profile/file failed", err);
      res.status(500).json({ error: err.message });
    }
  }
};
