const knex = require("../../db/knex");

function coerceValue(field, value) {
  if (field.type === "boolean") {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.toLowerCase() === "true";
    if (typeof value === "number") return Boolean(value);
  }
  return value;
}

function buildCrudHandlers(table, schema) {
  const getAll = async (_req, res) => {
    const rows = await knex(table).select("*");
    res.json(rows);
  };

  const create = async (req, res) => {
    try {
      const payload = {};
      for (const field of schema) {
        if (req.body[field.name] !== undefined) {
          payload[field.name] = coerceValue(field, req.body[field.name]);
        } else if (field.default !== undefined) {
          payload[field.name] = field.default;
        } else if (field.required) {
          return res.status(400).json({ error: `Missing ${field.name}` });
        }
      }
      const [id] = await knex(table).insert(payload);
      const row = await knex(table).where({ id }).first();
      res.status(201).json(row || { id });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "failed to create record" });
    }
  };

  const update = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: "invalid id" });
    const updatePayload = {};
    for (const field of schema) {
      if (req.body[field.name] !== undefined) {
        updatePayload[field.name] = coerceValue(field, req.body[field.name]);
      }
    }
    if (!Object.keys(updatePayload).length) {
      return res.status(400).json({ error: "nothing to update" });
    }
    try {
      const updated = await knex(table).where({ id }).update(updatePayload);
      if (!updated) return res.status(404).json({ error: "not found" });
      const row = await knex(table).where({ id }).first();
      res.json(row);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "failed to update record" });
    }
  };

  const remove = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: "invalid id" });
    try {
      const deleted = await knex(table).where({ id }).del();
      if (!deleted) return res.status(404).json({ error: "not found" });
      res.status(204).end();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "failed to delete record" });
    }
  };

  return { getAll, create, update, remove };
}

module.exports = { buildCrudHandlers };
