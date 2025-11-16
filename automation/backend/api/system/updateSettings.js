const knex = require("../../db/knex");

async function upsertSetting(key, value) {
  const exists = await knex("global_settings").where({ key }).first();
  if (exists) {
    await knex("global_settings").where({ key }).update({ value });
  } else {
    await knex("global_settings").insert({ key, value });
  }
}

module.exports = {
  method: "put",
  route: "/settings",
  handler: async (req, res) => {
    const payload = req.body;
    const updates = Array.isArray(payload) ? payload : [payload];
    try {
      for (const entry of updates) {
        if (!entry || typeof entry.key !== "string") continue;
        await upsertSetting(entry.key, String(entry.value));
      }
      const rows = await knex("global_settings").select("key", "value");
      res.json(rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {}));
    } catch (err) {
      console.error("PUT /settings failed", err);
      res.status(500).json({ error: "failed to update settings" });
    }
  }
};
