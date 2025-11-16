const { buildCrudHandlers } = require("../helpers/crud");

const handlers = buildCrudHandlers("processes", [
  { name: "process_name" },
  { name: "profile_filename" },
  { name: "is_active", type: "boolean" },
  { name: "priority" }
]);

module.exports = {
  method: "put",
  route: "/processes/:id",
  handler: handlers.update
};
