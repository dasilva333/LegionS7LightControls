const { buildCrudHandlers } = require("../helpers/crud");

const handlers = buildCrudHandlers("processes", [
  { name: "process_name", required: true },
  { name: "profile_filename", required: true },
  { name: "is_active", type: "boolean", default: true },
  { name: "priority", default: 0 }
]);

module.exports = {
  method: "get",
  route: "/processes",
  handler: handlers.getAll
};
