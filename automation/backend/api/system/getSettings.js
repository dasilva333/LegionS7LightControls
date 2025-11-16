const knex = require("../../db/knex");

module.exports = {
  method: "get",
  route: "/settings",
  handler: async (_req, res) => {
    try {
      const rows = await knex("global_settings").select("key", "value");
      res.json(rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {}));
    } catch (err) {
      console.error("GET /settings failed", err);
      res.status(500).json({ error: "failed to load settings" });
    }
  }
};
