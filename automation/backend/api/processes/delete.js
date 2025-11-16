const { buildCrudHandlers } = require("../helpers/crud");

const handlers = buildCrudHandlers("processes", []);

module.exports = {
  method: "delete",
  route: "/processes/:id",
  handler: handlers.remove
};
